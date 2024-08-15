export type { UHTMLOptionElement } from "./u-option";
import {
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

let IS_PRESS = false;
const BLUR_TIMER = new WeakMap<
	UHTMLDataListElement,
	ReturnType<typeof setTimeout>
>();
const EVENTS = "click,focusout,input,keydown,pointerdown,pointerup";
const ARIA_LIVE =
	IS_BROWSER &&
	Object.assign(document.createElement("div"), {
		ariaLive: "polite",
		style: "position:fixed;overflow:hidden;width:1px;white-space:nowrap",
	});

const activeInput = new WeakMap<UHTMLDataListElement, HTMLInputElement>(); // Store map of [u-datalist] => [related input] to speed up and prevent double focus
const connectedRoot = new WeakMap<
	UHTMLDataListElement,
	Document | ShadowRoot
>(); // Store connectedRoot to unbind correct root, as root can change during lifespan
const filterValue = new WeakMap<UHTMLDataListElement, string>(); // Store sanitized value to speed up option filtering

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
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

		const root = getConnectedRoot(this);
		connectedRoot.set(this, root); // Cache to correctly unbind events on disconnectedCallback
		on(root, "focusin", this); // Only bind focus globally as this is needed to activate
		on(root, "focus", this, true); // Need to also listen on focus with capturing to render before Firefox NVDA reads state
	}
	disconnectedCallback() {
		const root = getConnectedRoot(this);
		off(root, "focusin", this);
		off(root, "focus", this, true);
		disconnectInput(this);
		connectedRoot.delete(this); // Must run after disconnectInput
	}
	handleEvent(event: Event) {
		const { type } = event;
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (type === "click") onClick(this, event);
		if (type === "focus" || type === "focusin") onFocusIn(this, event);
		if (type === "focusout") onFocusOut(this);
		if (type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (type === "mutation" || type === "input") setupOptions(this, event);
		if (type === "pointerup") IS_PRESS = false;
		if (type === "pointerdown") IS_PRESS = this.contains(event.target as Node); // Prevent loosing focus on mousedown on <u-option> despite tabIndex -1
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		return this.getElementsByTagName("u-option");
	}
}

const getConnectedRoot = (self: UHTMLDataListElement) =>
	connectedRoot.get(self) || getRoot(self);

const getInput = (self: UHTMLDataListElement) => activeInput.get(self);
const disconnectInput = (self: UHTMLDataListElement) => {
	if (ARIA_LIVE) ARIA_LIVE.remove();
	off(getConnectedRoot(self), EVENTS, self);
	mutationObserver(self, false);
	setExpanded(self, false);
	activeInput.delete(self);
	filterValue.delete(self);
};

const getVisibleOptions = (self: UHTMLDataListElement) =>
	[...self.options].filter(
		(opt) => !opt.disabled && opt.offsetWidth && opt.offsetHeight, // Checks disabled or visibility (since hidden attribute can be overwritten by display: block)
	);

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
	const input = getInput(self);
	self.hidden = !open;

	if (input) input.ariaExpanded = `${open}`;
	if (open) setupOptions(self); // Ensure correct state when opening if input.value has changed
};

const setupOptions = (self: UHTMLDataListElement, event?: Event) => {
	const value = getInput(self)?.value.toLowerCase().trim() || "";
	const changed = event?.type === "mutation" || filterValue.get(self) !== value;
	if (!changed) return; // Skip if identical value or options

	const hidden = self.hidden;
	const options = [...self.options];
	const isSingle = self.getAttribute(SAFE_MULTISELECTABLE) !== "true";
	const isTyping = event instanceof InputEvent && event.inputType;

	self.hidden = true; // Speed up large lists by hiding during filtering
	filterValue.set(self, value); // Cache value from this run

	for (const opt of options) {
		const text = `${opt.text}`.toLowerCase();
		const content = `${opt.value}${opt.label}${text}`.toLowerCase();
		opt.hidden = !content.includes(value);
		if (isSingle && isTyping) opt.selected = false; // Turn off selected when typing in single select
	}
	self.hidden = hidden; // Restore original hidden state

	const visible = getVisibleOptions(self);

	// Needed to announce count in iOS
	/* c8 ignore next 4 */ // Because @web/test-runner code coverage iOS emulator only runs in chromium
	if (IS_IOS)
		visible.map((opt, i, { length }) => {
			opt.title = `${i + 1}/${length}`;
		});
};

function onFocusIn(self: UHTMLDataListElement, event: Event) {
	const { target: input } = event;
	const isInput = getInput(self) === input;
	const isInside = isInput || self.contains(event.target as Node); // Prevent blur if receiving new focus

	if (isInside) return clearTimeout(BLUR_TIMER.get(self));
	if (!isInput && input instanceof HTMLInputElement && input.list === self) {
		if (activeInput.get(self)) disconnectInput(self); // If previously used by other input
		if (ARIA_LIVE) document.body.append(ARIA_LIVE);

		activeInput.set(self, input);
		self.setAttribute(SAFE_LABELLEDBY, useId(input.labels?.[0]));
		mutationObserver(self, {
			attributeFilter: ["value"], // Listen for value changes to show u-options
			attributes: true,
			childList: true,
			subtree: true,
		});
		on(getConnectedRoot(self), EVENTS, self);
		setExpanded(self, true);
		input.setAttribute("aria-controls", useId(self));
		input.ariaAutoComplete = "list";
		input.autocomplete = "off";
		input.role = "combobox";
	}
}

// Only disconnect after event loop has run so we can cancel if receiving new focus
function onFocusOut(self: UHTMLDataListElement) {
	if (!IS_PRESS)
		BLUR_TIMER.set(
			self,
			setTimeout(() => disconnectInput(self)),
		);
}

function onClick(self: UHTMLDataListElement, { target }: Event) {
	const input = getInput(self);
	const option = [...self.options].find((opt) => opt.contains(target as Node));

	if (input === target)
		setExpanded(self, true); // Click on input should always open datalist
	else if (input && option) {
		const isSingle = self.getAttribute(SAFE_MULTISELECTABLE) !== "true";
		Array.from(self.options, (opt) => {
			if (opt === option) opt.selected = true;
			else if (isSingle) opt.selected = false; // Ensure single selected
		});

		// Trigger value change in React compatible manor https://stackoverflow.com/a/46012210
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set?.call(input, option.value);

		if (isSingle) {
			input.focus(); // Change input.value before focus move to make screen reader read the correct value
			setExpanded(self, false); // Click on single select option should always close datalist
		}

		// Trigger input.value change events
		input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	}
}

function onKeyDown(self: UHTMLDataListElement, event: KeyboardEvent) {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	if (event.key !== "Escape") setExpanded(self, true); // Open if not ESC, open before checking visible options

	const { key } = event;
	const active = getConnectedRoot(self).activeElement;
	const options = getVisibleOptions(self);
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
	(options[next] || getInput(self))?.focus(); // Move focus to next option or input
	if (options[next]) event.preventDefault(); // Prevent scroll when on option

	// Close on ESC, after moving focus
	if (key === "Escape") setExpanded(self, false);
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
