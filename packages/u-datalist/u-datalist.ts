export type { UHTMLOptionElement } from "./u-option";
import { UHTMLOptionElement } from "./u-option";
import {
	DISPLAY_BLOCK,
	IS_BROWSER,
	IS_FIREFOX,
	IS_IOS,
	IS_SAFARI,
	SAFE_LABELLEDBY,
	SAFE_MULTISELECTABLE,
	UHTMLElement,
	attachStyle,
	attr,
	attributeTexts,
	createAriaLive,
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
let LIVE_TIMER: ReturnType<typeof setTimeout>;
let LIVE_SR_FIX = 0; // Ensure screen reader announcing by alternating non-breaking-space suffix
const LIVE = createAriaLive("assertive");
const IS_SAFARI_MAC = IS_SAFARI && !IS_IOS; // Used to prevent "expanded" announcement interrupting label in Safari Mac
const EVENTS = "click,focusout,input,keydown,mousedown,mouseup";
const TEXTS = {
	singular: "% hit",
	plural: "% hits",
};

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	// _announceCount = 0;
	// _announceTimer: ReturnType<typeof setTimeout> | number = 0;
	_blurTimer: ReturnType<typeof setTimeout> | number = 0;
	_input: HTMLInputElement | null = null;
	_root: null | Document | ShadowRoot = null;
	_value = ""; // Store sanitized value to speed up option filtering
	_texts = { ...TEXTS }; // Speed up translated texts

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["id", ...attributeTexts(TEXTS)];
	}

	constructor() {
		super();
		attachStyle(
			this,
			`${DISPLAY_BLOCK}::slotted(u-option[disabled]) { display: none !important }`, // Hide disabled options
		);
	}
	connectedCallback() {
		this.hidden = true;
		this._root = getRoot(this);

		if (LIVE && !LIVE.isConnected) document.body.append(LIVE);
		attr(this, "role", "listbox");
		on(this._root, "focusin", this); // Only bind focus globally as this is needed to activate
		on(this._root, "focus", this, true); // Need to also listen on focus with capturing to render before Firefox NVDA reads state
		setTimeout(() => this.attributeChangedCallback()); // Allow rendering full DOM tree before setting up inputs
	}
	disconnectedCallback() {
		off(this._root || this, "focus", this, true);
		off(this._root || this, "focusin", this);
		disconnectInput(this);
		this._root = null;
	}
	attributeChangedCallback(prop?: string) {
		attributeTexts(this._texts, prop);
		const inputs = this._root?.querySelectorAll(`input[list="${this.id}"]`);
		for (const input of inputs || []) setupInput(this, input); // Setup aria-expanded, role etc
	}
	handleEvent(event: Event) {
		const { type } = event;
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (type === "click") onClick(this, event);
		if (type === "focus" || type === "focusin") onFocusIn(this, event);
		if (type === "focusout") onFocusOut(this);
		if (type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (type === "mutation" || type === "input") setupOptions(this, event);
		if (type === "mouseup") IS_PRESS = false;
		if (type === "mousedown") IS_PRESS = this.contains(event.target as Node);
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		return this.getElementsByTagName("u-option");
	}
}

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
		mutationObserver(self, {
			attributeFilter: ["value"], // Listen for value changes to show u-options
			attributes: true,
			childList: true,
			subtree: true,
		});

		setExpanded(self, true);
	}
};

// Only disconnect after event loop has run so we can cancel if receiving new focus
const onFocusOut = (self: UHTMLDataListElement) => {
	if (!IS_PRESS) self._blurTimer = setTimeout(() => disconnectInput(self));
};

const onClick = (self: UHTMLDataListElement, { target }: Event) => {
	const isSingle = attr(self, SAFE_MULTISELECTABLE) !== "true";
	const option = [...self.options].find((opt) => opt.contains(target as Node));

	if (self._input === target) {
		setExpanded(self, true); // Click on input should always open datalist
	} else if (option && isInteractiveOption(option)) {
		for (const opt of self.options) {
			if (opt === option) opt.selected = true;
			else if (isSingle) opt.selected = false; // Ensure single selected
		}

		// Trigger value change in React compatible manor https://stackoverflow.com/a/46012210
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			"value",
		)?.set?.call(self._input, option.value);

		if (isSingle) {
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
	if (event.key !== "Escape") setExpanded(self, true); // Open if not ESC, open before checking visible options

	const { key } = event;
	const active = self._root?.activeElement;
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

	if (options[next]) for (const option of options) option.tabIndex = -1; // Ensure u-options can have focus if iOS has a keyboard
	if (options[next]) event.preventDefault(); // Prevent scroll when on option
	(options[next] || self._input)?.focus(); // Move focus to next option or input

	// Close on ESC, after moving focus
	if (key === "Escape") setExpanded(self, false);
};

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
	self.hidden = !open;

	if (self.popover) self.togglePopover(open); // Popover API is not supported by all browsers
	if (self._input) setupInput(self, self._input, open);
	if (open) setupOptions(self); // Ensure correct state when opening if input.value has changed
};

const disconnectInput = (self: UHTMLDataListElement) => {
	off(self._root || self, EVENTS, self);
	mutationObserver(self, false);
	setExpanded(self, false);
	self._input = null;
};

const getVisibleOptions = (self: UHTMLDataListElement) =>
	[...self.options].filter(
		(opt) => !opt.disabled && opt.offsetWidth && opt.offsetHeight, // Checks disabled or visibility (since hidden attribute can be overwritten by display: block)
	);

// Skip role="none" and role="presentation"
const isInteractiveOption = (
	option: HTMLOptionElement | UHTMLOptionElement,
) => {
	const role = option.getAttribute("role");
	return role !== "none" && role !== "presentation";
};

const setupInput = (
	self: UHTMLDataListElement,
	input: Element,
	open = false,
) => {
	attr(input, "popovertarget", useId(self));
	attr(input, "aria-autocomplete", "list");
	attr(input, "aria-controls", useId(self));
	attr(input, "aria-expanded", `${IS_SAFARI_MAC || open}`); // Used to prevent "expanded" announcement interrupting label in Safari Mac
	attr(input, "autocomplete", "off");
	attr(input, "role", "combobox");
};

const setupOptions = (self: UHTMLDataListElement, event?: Event) => {
	const value = self._input?.value.toLowerCase().trim() || "";
	const hasChange = event?.type === "mutation" || self._value !== value;
	if (!hasChange) return; // Skip if identical value or options

	const hidden = self.hidden;
	const isSingle = attr(self, SAFE_MULTISELECTABLE) !== "true";
	const isTyping = event instanceof InputEvent && !isDatalistClick(event);

	self.hidden = true; // Speed up large lists by hiding during filtering
	self._value = value; // Cache value from self filtering

	for (const opt of self.options) {
		const content = `${opt.value}${opt.label}${opt.text}`.toLowerCase();
		opt.hidden = !content.includes(value);
		if (isSingle && isTyping) opt.selected = false; // Turn off selected when typing in single select
	}
	self.hidden = hidden; // Restore original hidden state

	// Announce amount of visible hits
	const visible = getVisibleOptions(self);
	clearTimeout(LIVE_TIMER);
	LIVE_TIMER = setTimeout(() => {
		const { length } = visible.filter(isInteractiveOption);
		const liveSrFix = ++LIVE_SR_FIX % 2 ? "\u{A0}" : ""; // Force screen reader anouncement
		const countText = `${`${self._texts[length === 1 ? "singular" : "plural"]}`.replace("%d", `${length}`)}`;

		if (LIVE)
			LIVE.textContent = `${(!length && self.innerText.trim()) || countText}${liveSrFix}`;
	}, 1000); // 1 second makes room for screen reader to announce the typed character, before announcing the hits count

	// Needed to announce count in iOS
	/* c8 ignore next 4 */ // Because @web/test-runner code coverage iOS emulator only runs in Chromium
	if (IS_IOS)
		visible.map((opt, index, length) => {
			opt.title = `${index + 1}/${length}`;
		});
};

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

const SPLIT_CHAR = "\u{2001}".repeat(100); // Unicode U+001E record separator
const SPLIT_ATTR = IS_FIREFOX ? "label" : "value"; // Firefox looks at label+text, the rest looks at value+text
const FIREFOX_OPTION_CLICK = "insertReplacementText"; // Support both Firefox (insertReplacementText) and others (undefined)

export const getDatalistValue = ({
	value,
}: HTMLInputElement | HTMLOptionElement | UHTMLOptionElement) =>
	value.split(SPLIT_CHAR)[0];

export function isDatalistClick(event: unknown) {
	const isClick =
		event instanceof Event &&
		event.type === "input" &&
		event.target instanceof HTMLInputElement &&
		(!(event as InputEvent).inputType ||
			(event as InputEvent).inputType === FIREFOX_OPTION_CLICK);

	if (isClick) {
		let ignored = false;
		for (const option of event.target.list?.options || []) {
			if (option.value === event.target.value)
				ignored = !isInteractiveOption(option);
		}
		event.target.value = event.target.value.split(SPLIT_CHAR)[ignored ? 1 : 0]; // Keep input text if ignored option
	}
	return isClick;
}

export function syncDatalistState(input: HTMLInputElement) {
	for (const option of input.list?.children || [])
		if (
			option instanceof HTMLOptionElement ||
			option instanceof UHTMLOptionElement
		) {
			option[SPLIT_ATTR] =
				`${getDatalistValue(option)}${SPLIT_CHAR}${input.value}`; // Force show items by adding needle after a record separator
		}
}
