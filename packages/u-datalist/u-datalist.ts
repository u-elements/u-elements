export type { UHTMLOptionElement } from "./u-option";
import {
	// ARIA_LIVE,
	DISPLAY_BLOCK,
	IS_BROWSER,
	IS_IOS,
	SAFE_LABELLEDBY,
	SAFE_MULTISELECTABLE,
	UHTMLElement,
	attachStyle,
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
const EVENTS = "click,focusout,input,keydown,pointerdown,pointerup";

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
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
		this.role = "listbox";
		this.#root = getRoot(this);

		on(this.#root, "focusin", this); // Only bind focus globally as this is needed to activate
		on(this.#root, "focus", this, true); // Need to also listen on focus with capturing to render before Firefox NVDA reads state
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
			target.getAttribute("list") === this.id
		) {
			if (this.#input) this.#disconnectInput(); // If previously used by other input
			// if (ARIA_LIVE) document.body.append(ARIA_LIVE);

			this.#input = target;
			this.#input.ariaAutoComplete = "list";
			this.#input.autocomplete = "off";
			this.#input.role = "combobox";
			this.#input.setAttribute("aria-controls", useId(this));
			this.#expanded = true;
			this.setAttribute(SAFE_LABELLEDBY, useId(this.#input.labels?.[0]));

			mutationObserver(this, {
				attributeFilter: ["value"], // Listen for value changes to show u-options
				attributes: true,
				childList: true,
				subtree: true,
			});
			on(this.#root || this, EVENTS, this);
		}
	}

	// Only disconnect after event loop has run so we can cancel if receiving new focus
	#onFocusOut() {
		if (!IS_PRESS) this.#blurTimer = setTimeout(() => this.#disconnectInput());
	}

	#onClick({ target }: Event) {
		const isSingle = this.getAttribute(SAFE_MULTISELECTABLE) !== "true";
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
		(options[next] || this.#input)?.focus(); // Move focus to next option or input
		if (options[next]) event.preventDefault(); // Prevent scroll when on option

		// Close on ESC, after moving focus
		if (key === "Escape") this.#expanded = false;
	}

	#disconnectInput() {
		// ARIA_LIVE?.remove();
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
	set #expanded(open: boolean) {
		this.hidden = !open;

		if (this.#input) this.#input.ariaExpanded = `${open}`;
		if (open) this.#setupOptions(); // Ensure correct state when opening if input.value has changed
	}
	#setupOptions(event?: Event) {
		const value = this.#input?.value.toLowerCase().trim() || "";
		const hasChange = event?.type === "mutation" || this.#value !== value;
		if (!hasChange) return; // Skip if identical value or options

		const hidden = this.hidden;
		const isSingle = this.getAttribute(SAFE_MULTISELECTABLE) !== "true";
		const isTyping = event instanceof InputEvent && event.inputType;

		this.hidden = true; // Speed up large lists by hiding during filtering
		this.#value = value; // Cache value from this filtering

		for (const opt of this.options) {
			const content = `${opt.value}${opt.label}${opt.text}`.toLowerCase();
			opt.hidden = !content.includes(value);
			if (isSingle && isTyping) opt.selected = false; // Turn off selected when typing in single select
		}
		this.hidden = hidden; // Restore original hidden state

		// Needed to announce count in iOS
		/* c8 ignore next 4 */ // Because @web/test-runner code coverage iOS emulator only runs in chromium
		if (IS_IOS)
			this.#getVisibleOptions().map((opt, i, { length }) => {
				opt.title = `${i + 1}/${length}`;
			});
	}
}

// Polyfill input.list so it also receives u-datalist
if (IS_BROWSER)
	Object.defineProperty(HTMLInputElement.prototype, "list", {
		configurable: true,
		enumerable: true,
		get(): HTMLDataElement | UHTMLDataListElement | null {
			const root = getRoot(this);
			const list = this.getAttribute("list");
			return root.querySelector(`[id="${list}"]:is(datalist,u-datalist)`);
		},
	});

customElements.define("u-datalist", UHTMLDataListElement);
