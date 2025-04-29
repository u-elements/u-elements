export type { UHTMLOptionElement } from "./u-option";
import "./u-option"; // Import to register u-option
import {
	DISPLAY_BLOCK,
	FOCUS_OUTLINE,
	IS_ANDROID,
	IS_BROWSER,
	IS_IOS,
	SAFE_LABELLEDBY,
	UHTMLElement,
	attachStyle,
	attr,
	customElements,
	getRoot,
	isVisible,
	mutationObserver,
	off,
	on,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-datalist": HTMLDataListElement;
	}
}

let DEBOUNCE: ReturnType<typeof setTimeout> | number = 0;
let IS_PRESS = false; // Prevent loosing focus on mousedown on <u-option> despite tabIndex -1
const IS_MOBILE = IS_IOS || IS_ANDROID;
const EVENTS = "click,focusout,input,keydown,mousedown,mouseup";

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_blurTimer: ReturnType<typeof setTimeout> | number = 0;
	_onInput: (() => void) | null = null;
	_input: HTMLInputElement | null = null;
	_root: null | Document | ShadowRoot = null;

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["id"];
	}

	constructor() {
		super();
		attachStyle(
			this,
			`${DISPLAY_BLOCK}
			::slotted(u-option) { display: block; cursor: pointer }
			::slotted(u-option:focus) { ${FOCUS_OUTLINE} }
			::slotted(u-option[aria-hidden="true"]),
			::slotted(u-option[disabled]),
			::slotted(u-option[hidden]) { display: none !important }`,
		);
	}
	connectedCallback() {
		this.hidden = true;
		this._root = getRoot(this);
		this._onInput = onInput.bind(this);

		attr(this, "role", "listbox");
		attr(this, "tabindex", "-1"); // Prevent tabstop even if consumer sets overflow: auto (see https://issues.chromium.org/issues/40456188)
		on(this._root, "focusin", this); // Only bind focus globally as this is needed to activate
		on(this._root, "focus", this, true); // Need to also listen on focus with capturing to render before Firefox NVDA reads state
		mutationObserver(this, {
			attributeFilter: ["disabled", "label", "value"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		setTimeout(() => this.attributeChangedCallback()); // Allow rendering full DOM tree before setting up inputs
	}
	disconnectedCallback() {
		off(this._root || this, "focus", this, true);
		off(this._root || this, "focusin", this);
		mutationObserver(this, false);
		disconnectInput(this);
		this._onInput = null;
		this._root = null;
	}
	attributeChangedCallback() {
		for (const input of this._root?.querySelectorAll<HTMLInputElement>(
			`input[list="${this.id}"]`,
		) || [])
			setupInput(this, input); // Setup inputs for correct announcment when moving screen reader focus on mobile
	}
	handleEvent(event: Event) {
		const { type } = event;
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (type === "click") onClick(this, event);
		if (type === "focus" || type === "focusin") onFocusIn(this, event);
		if (type === "focusout") onFocusOut(this);
		if (type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (type === "mousedown") IS_PRESS = this.contains(event.target as Node);
		if (type === "mouseup") IS_PRESS = false;
		if (type === "mutation" || type === "input") {
			clearTimeout(DEBOUNCE);
			DEBOUNCE = setTimeout(onInput, 0, this, event); // Squash mutations and input events, and wait more than 0ms to allow u-combobox to update
		}
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		return this.getElementsByTagName("u-option");
	}
}

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
	if (self.hidden !== open) return; // Prevent unnecessary updates
	self.hidden = !open;

	if (self.popover) self.togglePopover(open); // Popover API is not supported by all browsers
	if (self._input) setupInput(self, self._input, open);
	if (open) onInput(self); // Ensure correct state when opening if input.value has changed
};

const disconnectInput = (self: UHTMLDataListElement) => {
	off(self._root || self, EVENTS, self);
	setExpanded(self, false);
	self._input = null;
};

const setupInput = (
	self: UHTMLDataListElement,
	input: HTMLInputElement,
	open = false,
) => {
	attr(input, "aria-autocomplete", "list");
	attr(input, "aria-controls", useId(self));
	attr(input, "aria-expanded", `${IS_MOBILE ? open : "true"}`); // Used to prevent "expanded" announcement interrupting label
	attr(input, "autocomplete", "off");
	attr(input, "popovertarget", useId(self)); // Prepare for popover API
	attr(input, "role", "combobox");
};

const onFocusIn = (self: UHTMLDataListElement, { target }: Event) => {
	const isInput = self._input === target;
	const isInside = isInput || self.contains(target as Node); // Prevent blur if receiving new focus

	if (isInside) return clearTimeout(self._blurTimer);
	if (
		!isInput &&
		target instanceof HTMLInputElement &&
		attr(target, "list") === self.id
	) {
		if (self._input) disconnectInput(self); // If previously used by other input
		self._input = target;

		attr(self, SAFE_LABELLEDBY, useId(self._input.labels?.[0]));
		on(self._root || self, EVENTS, self);
		setExpanded(self, true);
	}
};

// Only disconnect after event loop has run so we can cancel if receiving new focus
const onFocusOut = (self: UHTMLDataListElement) => {
	if (!IS_PRESS) self._blurTimer = setTimeout(() => disconnectInput(self));
};

const onClick = (self: UHTMLDataListElement, { target }: Event) => {
	const option = [...self.options].find((opt) => opt.contains(target as Node));

	if (self._input === target)
		setExpanded(self, true); // Click on input should always open datalist
	else if (option) {
		// Trigger value change in React compatible manor https://stackoverflow.com/a/46012210
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set?.call(self._input, option.value);

		if (attr(self, "aria-multiselectable") !== "true") {
			self._input?.focus(); // Change input.value before focus move to make screen reader read the correct value
			setExpanded(self, false); // Click on single select option should always close datalist
		}

		// Trigger input.value change events
		self._input?.dispatchEvent(
			new Event("input", { bubbles: true, composed: true }),
		);
		self._input?.dispatchEvent(new Event("change", { bubbles: true }));
	}
};

const onKeyDown = (self: UHTMLDataListElement, event: KeyboardEvent) => {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	setExpanded(self, event.key !== "Escape"); // Close on ESC but show on other keys

	const { key } = event;
	const options = [...self.options].filter(isVisible);
	const index = options.indexOf(self._root?.activeElement as HTMLOptionElement);
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

	if (options[next]) for (const option of options) option.tabIndex = -1; // Ensure u-options can have focus if iOS has a attached external keyboard
	if (options[next]) event.preventDefault(); // Prevent scroll when on option
	(options[next] || self._input)?.focus(); // Move focus to next option or input
};

const onInput = (self: UHTMLDataListElement, event?: Event) => {
	const value = self._input?.value.toLowerCase().trim() || "";
	const filter = (str: string) => str.toLowerCase().includes(value);

	// The spec for <datalist> does not specify how to filter the options, so we choose to
	// search "label" as this represents text content, and "value" as this will fill the input
	for (const opt of self.options) {
		const hidden = opt.disabled || ![opt.label, opt.value].some(filter);
		attr(opt, "aria-hidden", hidden ? "true" : null); // aria-hidden needed for correct counting in VoiceOver + Safari
	}

	// Needed to announce count in iOS
	if (IS_IOS)
		[...self.options]
			.filter(isVisible) // Visible options
			.forEach((opt, index, { length }) => {
				opt.title = `${index + 1}/${length}`;
			});
};

// Polyfill input.list so it also receives u-datalist
if (IS_BROWSER)
	Object.defineProperty(HTMLInputElement.prototype, "list", {
		configurable: true,
		enumerable: true,
		get() {
			return getRoot(this).getElementById(attr(this, "list") || "");
		},
	});

customElements.define("u-datalist", UHTMLDataListElement);
