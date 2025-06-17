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
	mutationObserver,
	off,
	on,
	setValue,
	speak,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-datalist": HTMLDataListElement;
	}
}

let LIVE_TIMER: ReturnType<typeof setTimeout>;
let INPUT_DEBOUNCE: ReturnType<typeof setTimeout> | number = 0;
let IS_PRESS = false; // Prevent loosing focus on mousedown on <u-option> despite tabIndex -1
const IS_MOBILE = IS_IOS || IS_ANDROID;
const EVENTS = "click,focusout,input,keydown,mousedown,mouseup";
const EVENTS_INPUT = "focus,focusin,blur,focusout";
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
	_input?: HTMLInputElement;
	_root?: Document | ShadowRoot;
	_texts = { ...TEXTS };
	_value = ""; // Used to prevent unnecessary announcements

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
		this._root = undefined;
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
		const { target, type } = event;
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (type === "click") onClick(this, event);
		if (type === "focus" || type === "focusin") onFocus(this, event);
		if (type === "blur" || type === "focusout") onBlur(this, event);
		if (type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (type === "mousedown") IS_PRESS = this.contains(target as Node);
		if (type === "mouseup") IS_PRESS = false;
		if (type === "mutation" || type === "input") {
			clearTimeout(INPUT_DEBOUNCE);
			INPUT_DEBOUNCE = setTimeout(onInput, 0, this, event); // Squash mutations and input events
		}
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		return this.getElementsByTagName("u-option");
	}
}

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
	if (self.hidden !== open) return; // Prevent unnecessary updates
	self.hidden = !open;
	if (self._input) setupInput(self, self._input, open);
	if (self.popover && self._input?.isConnected) {
		attr(self._input, "popovertarget", useId(self)); // Prepare for Popover API
		attr(self, "popover", "manual");
		self.togglePopover(open); // Make popover always match open state
	}
	if (open) onInput(self); // Ensure correct state when opening if input.value has changed
};

const disconnectInput = (self: UHTMLDataListElement) => {
	if (!self._input) return;
	off(self._input || self, EVENTS_INPUT, self);
	off(self._root || self, EVENTS, self);
	setExpanded(self, false);
	self._input = undefined;
};

const setupInput = (
	self: UHTMLDataListElement,
	input: HTMLInputElement,
	open = false,
) => {
	on(input, EVENTS_INPUT, self, true); // Need to capture blur/focus directly on input to prevent other consumers
	attr(input, "aria-autocomplete", "list");
	attr(input, "aria-controls", useId(self));
	attr(input, "aria-expanded", `${IS_MOBILE ? open : "true"}`); // Used to prevent "expanded" announcement interrupting label // TODO: Test this
	attr(input, "autocomplete", "off");
	attr(input, "role", "combobox");
};

const onFocus = (self: UHTMLDataListElement, event: Event) => {
	const isInput = event.target instanceof HTMLInputElement;

	if (isInput && event.isTrusted) event.stopImmediatePropagation(); // Native datalist does not move focus out when selecting, so prevent focus events when connected
	if (self._input !== event.target && isInput && event.target.list === self) {
		if (self._input) disconnectInput(self); // If previously used by other input

		self._input = event.target;
		self._input.dispatchEvent(new FocusEvent("focus"));
		self._input.dispatchEvent(new FocusEvent("focusin", { bubbles: true })); // Do not assign view: window to prevent JSDOM errorshttps://github.com/vitest-dev/vitest/issues/4685#issuecomment-1843178287
		attr(self, SAFE_LABELLEDBY, useId(self._input.labels?.[0]));
		on(self._root || self, EVENTS, self);
		setExpanded(self, true);
		speak(); // Prepare screen reader announcements
	}
};

const onBlur = (self: UHTMLDataListElement, event: Event) => {
	if (!IS_ANDROID && !IS_PRESS && self._input) setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element
	if (event.target === self._input && event.isTrusted)
		event.stopImmediatePropagation(); // Native datalist does not move focus out when selecting, so prevent blur events
};

const onBlurred = (self: UHTMLDataListElement) => {
	const relatedTarget = self._root?.activeElement || null;
	const input = self._input;

	if (input && input !== relatedTarget && !self.contains(relatedTarget)) {
		input.dispatchEvent(new FocusEvent("blur", { relatedTarget })); // Trigger blur event on input if leaving both input and datalist
		input.dispatchEvent(
			new FocusEvent("focusout", { bubbles: true, relatedTarget }),
		);
		disconnectInput(self);
	}
};

const onClick = (self: UHTMLDataListElement, { target }: Event) => {
	if (!self._input || self._input === target) return setExpanded(self, true);
	for (const opt of self.options)
		if (opt.contains(target as Node)) {
			if (attr(self, "aria-multiselectable") !== "true") {
				self._input?.focus(); // Change input.value before focus move to make screen reader read the correct value
				setExpanded(self, false); // Click on single select option should always close datalist
			}
			return setValue(self._input, opt.value); // Set value after closing so onInput event can change DOM
		}
	if (IS_ANDROID) onBlurred(self); // Android does not support actual focus moving, so we need to manually close the datalist when click outside
};

const onKeyDown = (self: UHTMLDataListElement, e: KeyboardEvent) => {
	if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.key === "Tab")
		return;
	setExpanded(self, e.key !== "Escape"); // Close on ESC but show on other keys

	const { key, target } = e;
	const options = [...self.options].filter(
		(el) => attr(el, "aria-hidden") !== "true" && el.offsetHeight,
	); // Filter out hidden options
	const prev = options.indexOf(target as HTMLOptionElement);
	let next = -1; // If hidden - first arrow down should exit input

	if (key === "ArrowDown") next = (prev + 1) % options.length;
	if (key === "ArrowUp") next = (~prev ? prev : options.length) - 1; // Allow focus in input on ArrowUp
	if (~prev) {
		if (key === "Home" || key === "PageUp") next = 0;
		if (key === "End" || key === "PageDown") next = options.length - 1;
		if (key === "Enter") {
			options[prev].click();
			return e.preventDefault(); // Prevent submit
		}
	}

	if (options[next]) for (const option of options) option.tabIndex = -1; // Ensure u-options can have focus if iOS has a attached external keyboard
	if (options[next]) e.preventDefault(); // Prevent scroll when on option
	(options[next] || self._input)?.focus(); // Move focus to next option or input
};

const onInput = (self: UHTMLDataListElement, e?: Event) => {
	const { _texts, _root, _input, options } = self;
	const value = _input?.value.toLowerCase().trim() || "";
	const filter = !self.hasAttribute("data-nofilter"); // Support proposed nofilter attribute https://github.com/whatwg/html/issues/4882
	const hidden: HTMLOptionElement[] = [];
	const visible: HTMLOptionElement[] = [];

	// Group all read operations for performance
	// The spec does not specify how to filter, so we use "label" as it represents text content
	for (const opt of options) {
		const hide =
			opt.disabled ||
			opt.hidden ||
			(filter && !opt.label.toLowerCase().includes(value));
		(hide ? hidden : visible).push(opt);
	}

	// Group all write operations for performance
	for (const opt of hidden) attr(opt, "aria-hidden", "true");
	for (const opt of visible) attr(opt, "aria-hidden", "false");

	// Announce if content has changed
	const total = visible.length;
	clearTimeout(LIVE_TIMER);
	if (e?.type === "input" && value !== self._value)
		LIVE_TIMER = setTimeout(() => {
			const text = `${(!total && self.innerText.trim()) || `${_texts[total === 1 ? "singular" : "plural"]}`.replace("%d", `${total}`)}`;
			if (!self.hidden && _root?.activeElement === _input) speak(text);
			self._value = value;
		}, 1000); // 1 second makes room for screen reader to announce the typed character, before announcing the hits count

	// Needed to announce count in iOS
	if (IS_IOS)
		visible.forEach((opt, idx) => attr(opt, "title", `${idx + 1}/${total}`));
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
