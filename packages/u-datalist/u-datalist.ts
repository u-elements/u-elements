export type { UHTMLOptionElement } from "./u-option";
import {
	// ariaLive,
	DISPLAY_BLOCK,
	IS_BROWSER,
	IS_IOS,
	IS_SAFARI,
	SAFE_LABELLEDBY,
	SAFE_MULTISELECTABLE,
	UHTMLElement,
	attachStyle,
	attr,
	customElements,
	getRoot,
	mutationObserver,
	off,
	on,
	useId,
} from "../utils";
import "./u-option";

declare global {
	interface HTMLElementTagNameMap {
		"u-datalist": HTMLDataListElement;
	}
}

let IS_PRESS = false; // Prevent loosing focus on mousedown on <u-option> despite tabIndex -1
const IS_SAFARI_MAC = IS_SAFARI && !IS_IOS; // Used to prevent "expanded" announcement interrupting label in Safari Mac
const EVENTS = "click,focusout,input,keydown,pointerdown,pointerup";
// const TEXTS = {
// 	hit: "hit",
// 	hits: "hits",
// };

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
	// #announceCount = 0;
	// #announceTimer: ReturnType<typeof setTimeout> | number = 0;
	#blurTimer: ReturnType<typeof setTimeout> | number = 0;
	#input: HTMLInputElement | null = null;
	#root: null | Document | ShadowRoot = null;
	#value = ""; // Store sanitized value to speed up option filtering

	constructor() {
		super();
		attachStyle(
			this,
			`${DISPLAY_BLOCK}::slotted(u-option[disabled]) { display: none !important }`, // Hide disabled options
		);
	}
	connectedCallback() {
		this.hidden = true;
		this.#root = getRoot(this);

		attr(this, "role", "listbox");
		on(this.#root, "focusin", this); // Only bind focus globally as this is needed to activate
		on(this.#root, "focus", this, true); // Need to also listen on focus with capturing to render before Firefox NVDA reads state
		setTimeout(() => {
			const inputs = this.#root?.querySelectorAll(`input[list="${this.id}"]`);
			if (!IS_SAFARI_MAC && inputs)
				for (const input of inputs) attr(input, "aria-expanded", "false");
		}); // Allow rendering full DOM tree before running querySelectorAll
	}
	disconnectedCallback() {
		off(this.#root || this, "focus", this, true);
		off(this.#root || this, "focusin", this);
		this.#disconnectInput();
		this.#root = null;
	}
	handleEvent(event: Event) {
		const { type } = event;
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (type === "click") this.#onClick(event);
		if (type === "focus" || type === "focusin") this.#onFocusIn(event);
		if (type === "focusout") this.#onFocusOut();
		if (type === "keydown") this.#onKeyDown(event as KeyboardEvent);
		if (type === "mutation" || type === "input") this.#setupOptions(event);
		if (type === "pointerup") IS_PRESS = false;
		if (type === "pointerdown") IS_PRESS = this.contains(event.target as Node);
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		return this.getElementsByTagName("u-option");
	}

	#onFocusIn({ target }: Event) {
		const isInput = this.#input === target;
		const isInside = isInput || this.contains(target as Node); // Prevent blur if receiving new focus

		if (isInside) return clearTimeout(this.#blurTimer);
		if (
			!isInput &&
			target instanceof HTMLInputElement &&
			attr(target, "list") === this.id
		) {
			if (this.#input) this.#disconnectInput(); // If previously used by other input
			this.#input = target;
			this.#input.autocomplete = "off";

			// ariaLive(true);
			attr(this, SAFE_LABELLEDBY, useId(this.#input.labels?.[0]));
			attr(this.#input, "aria-autocomplete", "list");
			attr(this.#input, "aria-controls", useId(this));
			attr(this.#input, "role", "combobox");
			on(this.#root || this, EVENTS, this);
			mutationObserver(this, {
				attributeFilter: ["value"], // Listen for value changes to show u-options
				attributes: true,
				childList: true,
				subtree: true,
			});

			this.#expanded = true;
		}
	}

	// Only disconnect after event loop has run so we can cancel if receiving new focus
	#onFocusOut() {
		if (!IS_PRESS) this.#blurTimer = setTimeout(() => this.#disconnectInput());
	}

	#onClick({ target }: Event) {
		const isSingle = attr(this, SAFE_MULTISELECTABLE) !== "true";
		const option = [...this.options].find((opt) =>
			opt.contains(target as Node),
		);

		if (this.#input === target) {
			this.#expanded = true; // Click on input should always open datalist
		} else if (option) {
			for (const opt of this.options) {
				if (opt === option) opt.selected = true;
				else if (isSingle) opt.selected = false; // Ensure single selected
			}

			// Trigger value change in React compatible manor https://stackoverflow.com/a/46012210
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set?.call(this.#input, option.value);

			if (isSingle) {
				this.#input?.focus(); // Change input.value before focus move to make screen reader read the correct value
				this.#expanded = false; // Click on single select option should always close datalist
			}

			// Trigger input.value change events
			this.#input?.dispatchEvent(
				new Event("input", { bubbles: true, composed: true }),
			);
			this.#input?.dispatchEvent(new Event("change", { bubbles: true }));
		}
	}

	#onKeyDown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
			return;
		if (event.key !== "Escape") this.#expanded = true; // Open if not ESC, open before checking visible options

		const { key } = event;
		const active = this.#root?.activeElement;
		const options = this.#getVisibleOptions();
		const index = options.indexOf(active as HTMLOptionElement);
		let next = -1; // If hidden - first arrow down should exit input

		if (key === "ArrowDown") next = (index + 1) % options.length;
		if (key === "ArrowUp") next = (~index ? index : options.length) - 1; // Allow focus in input on ArrowUp
		if (~index) {
			if (key === "Home" || key === "PageUp") next = 0;
			if (key === "End" || key === "PageDown") next = options.length - 1;
			if (key === "Enter") {
				options[index].click();
				return event.preventDefault(); // Prevent submit
			}
		}

		if (options[next]) for (const option of options) option.tabIndex = -1; // Ensure u-options can have focus if iOS has a keyboard
		if (options[next]) event.preventDefault(); // Prevent scroll when on option
		(options[next] || this.#input)?.focus(); // Move focus to next option or input

		// Close on ESC, after moving focus
		if (key === "Escape") this.#expanded = false;
	}

	set #expanded(open: boolean) {
		this.hidden = !open;

		if (!IS_SAFARI_MAC && this.#input)
			attr(this.#input, "aria-expanded", `${open}`);
		if (open) this.#setupOptions(); // Ensure correct state when opening if input.value has changed
	}

	#disconnectInput() {
		// ariaLive(false);
		off(this.#root || this, EVENTS, this);
		mutationObserver(this, false);
		this.#expanded = false;
		this.#input = null;
	}

	#getVisibleOptions() {
		return [...this.options].filter(
			(opt) => !opt.disabled && opt.offsetWidth && opt.offsetHeight, // Checks disabled or visibility (since hidden attribute can be overwritten by display: block)
		);
	}

	#setupOptions(event?: Event) {
		const value = this.#input?.value.toLowerCase().trim() || "";
		const hasChange = event?.type === "mutation" || this.#value !== value;
		if (!hasChange) return; // Skip if identical value or options

		const hidden = this.hidden;
		const isSingle = attr(this, SAFE_MULTISELECTABLE) !== "true";
		const isTyping = event instanceof InputEvent && event.inputType;

		this.hidden = true; // Speed up large lists by hiding during filtering
		this.#value = value; // Cache value from this filtering

		for (const opt of this.options) {
			const content = `${opt.value}${opt.label}${opt.text}`.toLowerCase();
			opt.hidden = !content.includes(value);
			if (isSingle && isTyping) opt.selected = false; // Turn off selected when typing in single select
		}
		this.hidden = hidden; // Restore original hidden state
		const visible = this.#getVisibleOptions();

		// ariaLive("");
		// clearTimeout(this.#announceTimer);

		// // Force screen reader to announce same text again by adding a non-breaking space on every even render
		// this.#announceTimer = setTimeout(() => {
		// 	const announceFix = ++this.#announceCount % 2 ? "\u{A0}" : "";
		// 	ariaLive(`${visible.length} hits${announceFix}`);
		// }, 1000);

		// Needed to announce count in iOS
		/* c8 ignore next 4 */ // Because @web/test-runner code coverage iOS emulator only runs in chromium
		if (IS_IOS)
			visible.map((opt, i, { length }) => {
				opt.title = `${i + 1}/${length}`;
			});
	}
}

// Polyfill input.list so it also receives u-datalist
type DataList = HTMLDataListElement | UHTMLDataListElement | null;
if (IS_BROWSER)
	Object.defineProperty(HTMLInputElement.prototype, "list", {
		configurable: true,
		enumerable: true,
		get(): DataList {
			return getRoot(this).getElementById(attr(this, "list") || "") as DataList;
		},
	});

customElements.define("u-datalist", UHTMLDataListElement);
