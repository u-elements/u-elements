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
	createAriaLive,
	customElements,
	getRoot,
	mutationObserver,
	off,
	on,
	setValue,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-datalist": HTMLDataListElement;
	}
}

let LIVE_TIMER: ReturnType<typeof setTimeout>;
let LIVE_SR_FIX = 0; // Ensure screen reader announcing by alternating non-breaking-space suffix
let LIVE: Element;
let DEBOUNCE: ReturnType<typeof setTimeout> | number = 0;
let IS_PRESS = false; // Prevent loosing focus on mousedown on <u-option> despite tabIndex -1
const IS_MOBILE = IS_IOS || IS_ANDROID;
const EVENTS = "click,focusout,input,keydown,mousedown,mouseup";
const TEXTS = {
	singular: "%d hit",
	plural: "%d hits",
};

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_blurTimer: ReturnType<typeof setTimeout> | number = 0;
	_input: HTMLInputElement | null = null;
	_root: null | Document | ShadowRoot = null;
	_texts = { ...TEXTS };
	_value = "";

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["id", ...Object.keys(TEXTS).map((key) => `data-sr-${key}`)];
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

		if (!LIVE) LIVE = createAriaLive("assertive");
		if (!LIVE.isConnected) document.body.appendChild(LIVE);

		attr(this, "role", "listbox");
		attr(this, "tabindex", "-1"); // Prevent tabstop even if consumer sets overflow: auto (see https://issues.chromium.org/issues/40456188)
		on(this._root, "focusin", this); // Only bind focus globally as this is needed to activate
		on(this._root, "focus", this, true); // Need to also listen on focus with capturing to render before Firefox NVDA reads state
		mutationObserver(this, {
			attributeFilter: ["disabled", "hidden", "label", "value"],
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
		this._root = null;
	}

	attributeChangedCallback(prop?: string, _prev?: string, next?: string) {
		const text = prop?.split("data-sr-")[1] as keyof typeof TEXTS;
		const css = `input[list="${this.id}"]`; // Use attribute selector to avoid shadow DOM issues

		if (TEXTS[text]) this._texts[text] = next || TEXTS[text];
		else if (this._root)
			for (const input of this._root.querySelectorAll<HTMLInputElement>(css))
				setupInput(this, input); // Setup inputs for correct announcment when moving screen reader focus on mobile
	}
	handleEvent(event: Event) {
		const { type } = event;
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (type === "click") onClick(this, event);
		if (type === "focus" || type === "focusin") onFocus(this, event);
		if (type === "focusout") onBlur(this);
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

const onFocus = (self: UHTMLDataListElement, { target: el }: Event) => {
	const isInput = el instanceof HTMLInputElement;
	const isInside = self._input === el || self.contains(el as Node); // Prevent blur if receiving new focus

	if (isInside) return clearTimeout(self._blurTimer);
	if (self._input !== el && isInput && attr(el, "list") === self.id) {
		if (self._input) disconnectInput(self); // If previously used by other input
		self._input = el;

		attr(self, SAFE_LABELLEDBY, useId(self._input.labels?.[0]));
		on(self._root || self, EVENTS, self);
		setExpanded(self, true);
	}
};

// Only disconnect after event loop has run so we can cancel if receiving new focus
const onBlur = (self: UHTMLDataListElement) => {
	if (!IS_PRESS) self._blurTimer = setTimeout(disconnectInput, 0, self);
};

const onClick = (self: UHTMLDataListElement, { target: el }: Event) => {
	const option = [...self.options].find((opt) => opt.contains(el as Node));

	if (self._input === el) setExpanded(self, true);
	else if (option && self._input) {
		setValue(self._input, option.value); // Set input value to option value

		if (attr(self, "aria-multiselectable") !== "true") {
			self._input.focus(); // Change input.value before focus move to make screen reader read the correct value
			setExpanded(self, false); // Click on single select option should always close datalist
		}
	}
};

const isVisible = (el: Element) => attr(el, "aria-hidden") !== "true";
const onKeyDown = (self: UHTMLDataListElement, event: KeyboardEvent) => {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	setExpanded(self, event.key !== "Escape" && event.key !== "Tab"); // Close on ESC/Tab but show on other keys

	const { key } = event;
	const active = self._root?.activeElement as HTMLOptionElement;
	const options = [...self.options].filter(isVisible); // Filter out hidden options
	const prev = options.indexOf(active);
	let next = -1; // If hidden - first arrow down should exit input

	if (key === "ArrowDown") next = (prev + 1) % options.length;
	if (key === "ArrowUp") next = (~prev ? prev : options.length) - 1; // Allow focus in input on ArrowUp
	if (~prev) {
		if (key === "Home" || key === "PageUp") next = 0;
		if (key === "End" || key === "PageDown") next = options.length - 1;
		if (key === "Enter") {
			options[prev].click();
			return event.preventDefault(); // Prevent submit
		}
	}

	const toInput = !options[next] && options[prev] && key === "ArrowUp";
	if (options[next]) for (const option of options) option.tabIndex = -1; // Ensure u-options can have focus if iOS has a attached external keyboard
	if (options[next] || toInput) event.preventDefault(); // Prevent scroll when on option
	(options[next] || self._input)?.focus(); // Move focus to next option or input
	if (toInput) self._input?.setSelectionRange(-1, -1); // Move caret to end of input
};

const onInput = (self: UHTMLDataListElement) => {
	const value = self._input?.value.toLowerCase().trim() || "";
	const filter = !self.hasAttribute("data-nofilter"); // Support proposed nofilter attribute https://github.com/whatwg/html/issues/4882
	const visible: HTMLOptionElement[] = [];

	for (const opt of self.options) {
		const hidden = `${opt.disabled || opt.hidden || (filter && !opt.label.toLowerCase().includes(value))}`; // The spec does not specify how to filter, so we use "label" as it represents text content
		attr(opt, "aria-hidden", hidden); // aria-hidden needed for correct counting in VoiceOver + Safari
		if (hidden === "false" && attr(opt, "role") !== "none") visible.push(opt);
	}

	// Announce if content has changed
	clearTimeout(LIVE_TIMER);
	LIVE_TIMER = setTimeout(() => {
		const hitsText = `${`${self._texts[visible.length === 1 ? "singular" : "plural"]}`.replace("%d", `${visible.length}`)}`;
		const liveText = `${(!visible.length && self.innerText.trim()) || hitsText}${++LIVE_SR_FIX % 2 ? "\u{A0}" : ""}`; // Force screen reader anouncement

		if (value !== self._value) LIVE?.replaceChildren(liveText); // Only announce if value has changed
		self._value = value;
	}, 1000); // 1 second makes room for screen reader to announce the typed character, before announcing the hits count

	// Needed to announce count in iOS
	if (IS_IOS)
		visible.forEach((opt, index, { length }) => {
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
