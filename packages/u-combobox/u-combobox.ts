import {
	FOCUS_OUTLINE,
	IS_ANDROID,
	IS_FIREFOX,
	IS_IOS,
	UHTMLElement,
	asButton,
	attr,
	createAriaLive,
	createElement,
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
		"u-combobox": UHTMLComboboxElement;
	}
	interface GlobalEventHandlersEventMap {
		afterchange: CustomEvent<HTMLDataElement>;
		beforechange: CustomEvent<HTMLDataElement>;
		beforematch: CustomEvent<HTMLOptionElement | undefined>;
	}
}

let LIVE: Element;
let LIVE_SR_FIX = 0; // Ensure screen reader announcing by alternating non-breaking-space suffix
let IS_PRESS = false; // Prevent loosing focus on mousedown on <data> despite tabIndex -1
const EVENTS = "beforeinput,blur,focus,click,input,keydown,mousedown,mouseup";
const EVENT_ONCE = { once: true, passive: true };
const IS_FIREFOX_MAC = IS_FIREFOX && !IS_ANDROID;
const IS_MOBILE = IS_ANDROID || IS_IOS;
const FALSE = "false";
const CLICK = "insertReplacementText"; // Firefox uses this for inputType
const TEXTS = {
	added: "Added",
	empty: "No selected",
	found: "Navigate left to find %d selected",
	invalid: "Invalid value",
	of: "of",
	remove: "Press to remove",
	removed: "Removed",
};

/**
 * The `<u-combobox>` HTML element contains a set of `<data>` elements.
 * No MDN reference available.
 */
export class UHTMLComboboxElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_control?: HTMLInputElement; // Speed up by caching
	_focus?: HTMLElement;
	_items?: HTMLCollectionOf<HTMLDataElement>;
	_list?: HTMLDataListElement;
	_options?: HTMLCollectionOf<HTMLOptionElement>;
	_root?: Document | ShadowRoot;
	_speak = "";
	_texts = { ...TEXTS };
	_value = ""; // Locally store value to store value before input-click

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return Object.keys(TEXTS).map((key) => `data-sr-${key}`);
	}

	constructor() {
		super();
		this.attachShadow({ mode: "open" }).append(
			createElement("slot"), // Content slot
			createElement(
				"style",
				`:host(:not([hidden])) { display: block; cursor: pointer }  /* Must be display block in Safari to allow focus inside */
				:host(:not([data-multiple])) ::slotted(data),
				:host([data-multiple="false"]) ::slotted(data) { display: none } /* Hide data if not multiple */
				::slotted(data) { display: inline-block; pointer-events: none }
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus) { ${FOCUS_OUTLINE} }`, // Show focus outline around ::after only
			),
		);
	}
	connectedCallback() {
		this._root = getRoot(this);

		on(this, EVENTS, this, true); // Bind events using capture phase to run before framworks
		mutationObserver(this, { childList: true });
		setTimeout(render, 0, this); // Delay to allow DOM to be ready
		setTimeout(syncInputValue, 0, this); // Sync input value without triggering event
	}
	attributeChangedCallback(prop: string, _: string, val: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = val || TEXTS[text];
	}
	disconnectedCallback() {
		disconnectCache(this);
		mutationObserver(this, false);
		off(this, EVENTS, this, true);
		this._root = undefined;
	}
	handleEvent(event: Event) {
		const target = event.target as HTMLInputElement | null;
		if (event.type === "beforeinput") this._value = target?.value || ""; // Store value before input to restore if mulitple click
		if (event.type === "blur") onBlur(this);
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "focus") onFocus(this, event);
		if (event.type === "input") onInput(this, event);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "mousedown") IS_PRESS = this.contains(target);
		if (event.type === "mouseup") IS_PRESS = false;
		if (event.type === "mutation") render(this, event as CustomEvent);
	}
	get multiple() {
		return (attr(this, "data-multiple") ?? FALSE) !== FALSE; // Allow data-multiple="false" to be more React friendly
	}
	set multiple(value: boolean) {
		attr(this, "data-multiple", value ? "" : null);
	}
	get creatable() {
		return (attr(this, "data-creatable") ?? FALSE) !== FALSE; // Allow data-creatable="false" to be more React friendly
	}
	set creatable(value: boolean) {
		attr(this, "data-creatable", value ? "" : null);
	}
	get control(): HTMLInputElement | null {
		return this._control || this.querySelector("input"); // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control
	}
	get list(): HTMLDataListElement | null {
		return this._list || this.querySelector("u-datalist,datalist") || null; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
	}
	get items(): HTMLCollectionOf<HTMLDataElement> {
		return this._items || this.getElementsByTagName("data");
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> | undefined {
		const tag = `${this.list?.nodeName === "U-DATALIST" ? "u-" : ""}option`;
		return this._options || this.list?.getElementsByTagName(tag as "option"); // u-datalist might not be initialized yet
	}
	get values(): string[] {
		return [...this.items].map(({ value }) => value);
	}
	add(value: Parameters<typeof createItem>[0]) {
		const item = createItem(value);
		this.values.includes(item.value) || // Prevent duplicates
			this.control?.insertAdjacentElement("beforebegin", item);
	}
}

const text = (el?: Node | null) => el?.textContent?.trim() || "";
const createItem = (value: string | { label?: string; value?: string }) => {
	if (typeof value === "string") return createElement("data", value, { value });
	if (value instanceof HTMLDataElement) return value;
	return createElement("data", value.label || value.value, {
		value: value.value || value.label || "",
	});
};
const disconnectCache = (el: UHTMLComboboxElement) => {
	el._focus = el._control = el._items = el._list = el._options = undefined;
};

const render = (
	self: UHTMLComboboxElement,
	e?: CustomEvent<MutationRecord[]>,
) => {
	let { _focus, _speak, _texts, items, control, list, multiple } = self;
	const { addedNodes, removedNodes } = e?.detail[0] || {};
	const isMultiEdit = e?.detail[1] || addedNodes?.[1] || addedNodes?.[1];
	const edit = isMultiEdit ? null : addedNodes?.[0] || removedNodes?.[0];
	const total = multiple ? items.length : 1;
	const values: string[] = [];

	// Announce if only one item has changed and multiple with focus OR single with item in focus
	if (edit?.nodeName === "DATA" && (multiple ? _focus : edit === _focus)) {
		_speak = `${_texts[edit.isConnected ? "added" : "removed"]} ${text(edit)}, `; // Update aria-labels
		if (IS_MOBILE || _focus === control) LIVE.textContent = _speak; // Live announce when focus can not be moved

		control?.focus();
		setTimeout(() => {
			(_focus?.nodeName === "DATA" ? control : _focus)?.focus?.();
			self._speak = ""; // Prevent Firefox announcing aria-label change, but also support non-focus environments such as JAWS forms mode
			if (IS_FIREFOX_MAC) on(self, "blur", () => render(self), EVENT_ONCE);
			else setTimeout(render, 100, self);
		}, 100); // 100ms delay so VoiceOver + Chrome announces new ariaLabel
	}

	// Setup items
	const keep = edit?.isConnected ? edit : items[0]; // Keep added or first item when single
	for (const item of items) {
		if (!multiple && item !== keep) item.remove();
		else {
			const label = text(item);
			const value = item.value || label;
			const aria = `${_speak}${label}, ${_texts.remove}, ${values.push(value)} ${_texts.of} ${total}`;
			attr(item, "role", "button");
			attr(item, "value", value);
			attr(item, "tabindex", "-1");
			attr(item, "aria-label", aria);
		}
	}

	// Set selected datalist options
	for (const opt of self.options || []) {
		const value = attr(opt, "value") || text(opt); // u-option might not be initialized yet
		attr(opt, "aria-label", _speak ? `${_speak}${text(opt)}` : null);
		attr(opt, "selected", values.includes(value) ? "" : null); // u-option might not be initialized yet
	}

	// Setup input and list (Note: Label pointing to the input overwrites input's aria-label in Firefox)
	const label = `${_speak}${text(control?.labels?.[0])}, ${multiple ? (total ? _texts.found.replace("%d", `${total}`) : _texts.empty) : ""}`;
	if (list) attr(list, "aria-multiselectable", `${multiple}`); // Sync datalist multiselect
	if (control) attr(control, "list", useId(list)); // Connect datalist and input
	if (control) attr(control, "aria-label", label);

	// Setup select optionally
	const select = self.querySelector("select");
	if (select) select.multiple = multiple;
	for (const opt of select?.options || []) opt.remove(); // Remove all options
	select?.append(...values.map((value) => new Option("", value, true, true))); // Store programatic values

	// Clear mutation records to prevent double processing
	mutationObserver(self)?.takeRecords();
};

const syncInputValue = (self: UHTMLComboboxElement, withEvent?: boolean) => {
	const { multiple, control, items } = self;
	if (multiple || !control || !items[0]) return;
	if (withEvent) return setValue(control, text(self.items[0]));
	control.value = text(self.items[0]);
};

const dispatchMatch = (self: UHTMLComboboxElement) => {
	const { options = [], creatable, control, items, multiple } = self;
	const value = control?.value?.trim() || "";
	const query = value.toLowerCase() || null; // Fallback to null to prevent matching empty strings
	let match = [...options].find((o) => o.label.trim().toLowerCase() === query); // Match label
	const event = { bubbles: true, cancelable: true, detail: match };

	if (self.dispatchEvent(new CustomEvent("beforematch", event)))
		for (const opt of options) opt.selected = opt === match; // u-option is initialized at this point, so we can use .selected

	match = [...options].find((o) => o.selected);
	if (!match && creatable && value) return self.add(value);
	if (!match && !multiple && items[0]) return dispatchChange(self, items[0]);
	if (!match || self.values.includes(match.value)) return render(self); // Re-render to make select options match items
	dispatchChange(self, match, false); // Add match
};

const dispatchChange = (
	self: UHTMLComboboxElement,
	item: { value: string; label?: string },
	removeable = true,
) => {
	const add = createItem(item);
	const remove = [...self.items].find((i) => i.value === item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };

	if (remove && !removeable) return; // Skip if not removeable
	if (!self.dispatchEvent(new CustomEvent("beforechange", event))) return; // Skip if prevented
	remove ? remove.remove() : self.add(add);
	self.dispatchEvent(new CustomEvent("afterchange", event));
};

const onFocus = (self: UHTMLComboboxElement, { target }: Event) => {
	if (!LIVE) LIVE = createAriaLive("assertive");
	if (!LIVE.isConnected) document.body.appendChild(LIVE);
	if (target instanceof HTMLElement) self._focus = target;
	if (!self._items) {
		self._control = self.control || undefined; // Speed up by caching
		self._items = self.items;
		self._list = self.list || undefined;
		self._options = self.options || undefined;
	}
};

const onBlur = (self: UHTMLComboboxElement) =>
	IS_PRESS || setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element

const onBlurred = (self: UHTMLComboboxElement) => {
	if (!self._focus || self.contains(self._root?.activeElement as Node)) return; // Blur is allready done or focus is still in combobox
	syncInputValue(self, true);
	disconnectCache(self);
};

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	for (const item of self.items) {
		const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (item.contains(target as Node)) return dispatchChange(self, item); // Keyboard and screen reader can set target to element with pointer-events: none
		if (y >= top && y <= bottom && x >= left && x <= right) return item.focus(); // If clicking inside item, focus it
	}
	if (target === self) self.control?.focus(); // Focus input if clicking <u-combobox>
};

const onInput = (self: UHTMLComboboxElement, event: Event) => {
	const { options = [], control, multiple } = self;
	const isClick =
		event instanceof InputEvent
			? !event.inputType || event.inputType === CLICK // Firefox uses inputType "insertReplacementText" when clicking on <datalist>
			: control?.value; // WebKit uses Event (not InputEvent) both on <datalist> click and clear when type="search" so we need to check value

	if (!isClick) return multiple || dispatchMatch(self);
	for (const opt of options)
		if (opt.value === control?.value) {
			console.log(self._value);
			control.value = multiple ? self._value : opt.label; // Revert if multiple, use label if single
			if (multiple) event.stopImmediatePropagation(); // Prevent input event when reverting value anyway
			return dispatchChange(self, opt, multiple);
		}
};

const onKeyDown = (self: UHTMLComboboxElement, event: KeyboardEvent) => {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	const { _texts, control, items, multiple } = self;
	const { key, repeat, target } = event;
	const isControl = control && control === target;
	const inText = isControl && control?.selectionEnd;
	let index = isControl
		? items.length
		: [...items].indexOf(target as HTMLDataElement);

	if (index === -1 || (!isControl && asButton(event))) return; // Skip if focus is neither on item or control or if item click
	if (key === "ArrowRight" && !isControl) index += 1;
	else if (key === "ArrowLeft" && !inText) index -= 1;
	else if (key === "Enter" && isControl) {
		const form = attr(control, "form");
		attr(control, "form", "#"); // Prevent submit without preventing native datalist
		requestAnimationFrame(() => attr(control, "form", form)); // Restore form attribute after event has bubbled

		if (multiple) dispatchMatch(self);
		else if (!self.items[0] && LIVE)
			LIVE.textContent = `${_texts.invalid}${++LIVE_SR_FIX % 2 ? "\u{A0}" : ""}`; // Force screen reader anouncement

		return syncInputValue(self, true);
	} else if ((key === "Backspace" || key === "Delete") && !inText) {
		event.preventDefault(); // Prevent navigating away from page
		if (!repeat && items[index]) return dispatchChange(self, items[index]);
		if (isControl) index -= 1;
	} else return isControl || control?.focus(); // Skip other keys and move back to control

	event.preventDefault(); // Prevent datalist arrow events
	(items[Math.max(0, index)] || control)?.focus();
};

customElements.define("u-combobox", UHTMLComboboxElement);
