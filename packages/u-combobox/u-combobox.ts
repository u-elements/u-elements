import {
	FOCUS_OUTLINE,
	IS_ANDROID,
	IS_FIREFOX,
	IS_IOS,
	UHTMLElement,
	asButton,
	attr,
	createElement,
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
		"u-combobox": UHTMLComboboxElement;
	}
	interface GlobalEventHandlersEventMap {
		afterchange: CustomEvent<HTMLDataElement>;
		beforechange: CustomEvent<HTMLDataElement>;
		beforematch: CustomEvent<HTMLOptionElement | undefined>;
	}
}

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
	_clear?: HTMLElement | null;
	_control?: HTMLInputElement | null; // Speed up by caching
	_focus?: HTMLElement;
	_items?: HTMLCollectionOf<HTMLDataElement>;
	_list?: HTMLDataListElement | null;
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
				`:host(:not([hidden])) { display: block; cursor: pointer; -webkit-tap-highlight-color: rgba(0, 0, 0, 0) } /* Must be display block in Safari to allow focus inside */
				:host(:not([data-multiple])) ::slotted(data),
				:host([data-multiple="false"]) ::slotted(data) { display: none } /* Hide data if not multiple */
				::slotted(input[inputmode="none"]) { outline: none } /* Hide temporary foucs outline flash */
				::slotted(del) { text-decoration: none }
				::slotted(data:not([hidden])) { display: inline-block; pointer-events: none }
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus) { ${FOCUS_OUTLINE} }`,
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
		if (event.type === "beforeinput") this._value = target?.value || ""; // Store value before input to restore
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
		if (!this._control?.isConnected)
			this._control = this.querySelector("input");
		return this._control; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control
	}
	get list(): HTMLDataListElement | null {
		if (!this._list?.isConnected)
			this._list = this.querySelector("u-datalist,datalist");
		return this._list; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
	}
	get clear(): HTMLElement | null {
		if (!this._clear?.isConnected) this._clear = this.querySelector("del");
		return this._clear; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
	}
	get items(): HTMLCollectionOf<HTMLDataElement> {
		if (!this._items) this._items = this.getElementsByTagName("data");
		return this._items;
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> | undefined {
		if (!this._options) {
			const tag = `${this.list?.nodeName === "U-DATALIST" ? "u-" : ""}option`;
			this._options = this.list?.getElementsByTagName(tag as "option"); // u-datalist might not be initialized yet
		}
		return this._options;
	}
	get values(): string[] {
		return [...this.items].map(({ value }) => value);
	}
}

const text = (el?: Node | null) => el?.textContent?.trim() || "";
const isData = (el: unknown) => el instanceof HTMLDataElement;
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
	const { _focus, _texts, items, control, list, multiple } = self;
	let label = `${text(control?.labels?.[0])}, ${multiple ? (items.length ? _texts.found.replace("%d", `${items.length}`) : _texts.empty) : ""}`;
	const edits: HTMLDataElement[] = [];
	const values: string[] = [];

	for (const { addedNodes, removedNodes } of e?.detail || []) {
		for (const el of addedNodes) if (isData(el)) edits.unshift(el); // Add added nodes to the front
		for (const el of removedNodes) if (isData(el)) edits.push(el); // Add removed nodes to the front
	}

	const shouldAnnounce = multiple ? edits.length === 1 : edits[0] === _focus;
	if (_focus && control && shouldAnnounce) {
		const inputMode = attr(control, "inputmode"); // Use inputMode to prevent virtual keyboard on iOS and Android
		const nextFocus = isData(_focus) ? control : _focus;
		self._speak = `${_texts[edits[0].isConnected ? "added" : "removed"]} ${text(edits[0])}, `; // Update aria-labels

		if (IS_MOBILE || _focus === control) speak(self._speak); // Live announce when focus can not be moved
		if (control !== nextFocus) {
			attr(control, "aria-expanded", null); // Prevent announce state when temporarily focused
			attr(control, "inputmode", "none"); // Prevent virtual keyboard on iOS and Android
			label = "\u{A0}"; // Prevent VoiceOver announcing aria-label change
			control.focus();
		}

		setTimeout(() => {
			attr(control, "aria-expanded", "true"); // Revert aria-expanded
			attr(control, "inputmode", inputMode); // Revert inputMode

			nextFocus?.focus?.();
			self._speak = ""; // Prevent Firefox announcing aria-label change, but also support non-focus environments such as JAWS forms mode
			if (IS_FIREFOX_MAC) on(self, "blur", () => render(self), EVENT_ONCE);
			else setTimeout(render, 100, self);
		}, 100); // 100ms delay so VoiceOver + Chrome announces new ariaLabel
	}

	// Setup items (loop as static array to prevent live HTMLCollection)
	Array.from(items, (item) => {
		const label = text(item);
		const value = item.value || label;
		const aria = `${self._speak}${label}, ${_texts.remove}, ${values.push(value)} ${_texts.of} ${items.length}`;
		attr(item, "role", "button");
		attr(item, "value", value);
		attr(item, "tabindex", "-1");
		attr(item, "aria-label", aria);
	});
	if (!multiple && values.length > 1)
		console.warn("u-combobox: Multiple <data> found in single mode.");

	syncOptionsWithItems(self);
	syncClearWithInput(self);

	// Setup input and list (Note: Label pointing to the input overwrites input's aria-label in Firefox)
	if (list) attr(list, "aria-multiselectable", `${multiple}`); // Sync datalist multiselect
	if (control) attr(control, "list", useId(list)); // Connect datalist and input
	if (control) attr(control, "aria-label", `${self._speak}${label}`);
	self._value = control?.value || ""; // Store value so we can revert onInput if click

	// Setup optional select
	const select = self.querySelector("select");
	if (select) select.multiple = multiple;
	if (select) select.textContent = ""; // Remove all options
	select?.append(...values.map((value) => new Option("", value, true, true))); // Store programatic values

	// Clear mutation records to prevent double processing
	mutationObserver(self)?.takeRecords();
};

const syncClearWithInput = (self: UHTMLComboboxElement) => {
	if (!self.clear) return;
	attr(self.clear, "role", "button");
	self.clear.hidden = !self.control?.value;
};

const syncOptionsWithItems = (self: UHTMLComboboxElement) => {
	const { _speak, options = [], values } = self;
	for (const opt of options) {
		const value = attr(opt, "value") ?? text(opt); // u-option might not be initialized yet
		attr(opt, "aria-label", _speak ? `${_speak}${text(opt)}` : null);
		attr(opt, "selected", values.includes(value) ? "" : null); // u-option might not be initialized yet
	}
};

const syncInputValue = (self: UHTMLComboboxElement, event?: boolean) => {
	const { multiple, control, items } = self;
	const value = text(items[0]);
	if (multiple || !control || value === control.value) return;
	if (event) setValue(control, value, "insertText");
	else control.value = value;
	syncClearWithInput(self);
};

const dispatchMatch = (self: UHTMLComboboxElement, sync = true) => {
	const { _texts, options = [], creatable, control, items, multiple } = self;
	const value = control?.value?.trim() || "";
	const query = value.toLowerCase() || null; // Fallback to null to prevent matching empty strings
	let match = [...options].find((o) => o.label.trim().toLowerCase() === query); // Match label
	const event = { bubbles: true, cancelable: true, detail: match };

	if (self.dispatchEvent(new CustomEvent("beforematch", event)))
		for (const opt of options) opt.selected = opt === match; // u-option is initialized at this point, so we can use .selected
	match = [...options].find((o) => o.selected);
	syncOptionsWithItems(self); // Re-sync options with items

	if (match) return dispatchChange(self, match, false, !!sync);
	if (creatable && value) return dispatchChange(self, createItem(value), false);
	if (!multiple && items[0]) dispatchChange(self, items[0], true, false); // Remove items if no match
	if (sync) speak(_texts.invalid);
};

const dispatchChange = (
	self: UHTMLComboboxElement,
	item: { value: string; label?: string },
	removable = true,
	sync = true,
) => {
	const { control, items, multiple } = self;
	const add = createItem(item);
	const remove = [...items].find((i) => i.value === item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };
	const skip = remove && !removable;

	if (!skip && self.dispatchEvent(new CustomEvent("beforechange", event))) {
		if (!multiple) for (const item of [...items]) item.remove(); // Clear if multiple
		if (remove) remove.remove();
		else control?.insertAdjacentElement("beforebegin", add);
		self.dispatchEvent(new CustomEvent("afterchange", event));
	}
	if (sync) setTimeout(syncInputValue, 100, self, true); // 100ms so frameworks can update DOM first
};

const onFocus = (self: UHTMLComboboxElement, { target }: Event) => {
	if (target instanceof HTMLElement) self._focus = target;
	speak(); // Prepare for screen reader announcements
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
	const { clear, control, items } = self;

	// Support clear button
	if (clear?.contains(target as Node)) {
		if (control) setValue(control, "", "deleteContentBackward");
		return control?.focus();
	}

	for (const item of items) {
		const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (item.contains(target as Node)) return dispatchChange(self, item); // Keyboard and screen reader can set target to element with pointer-events: none
		if (y >= top && y <= bottom && x >= left && x <= right) return item.focus(); // If clicking inside item, focus it
	}
	if (target === self) control?.focus(); // Focus input if clicking <u-combobox>
};

const onInput = (
	self: UHTMLComboboxElement,
	event: Event & Partial<InputEvent>,
) => {
	const { options = [], control, multiple } = self;
	const value = control?.value?.trim() || "";
	const isClick =
		event instanceof InputEvent
			? !event.inputType || event.inputType === CLICK // Firefox uses inputType "insertReplacementText" when clicking on <datalist>
			: !!value; // WebKit uses Event (not InputEvent) both on <datalist> click and clear when type="search" so we need to check value

	syncClearWithInput(self);
	if (isClick) {
		event.stopImmediatePropagation(); // Prevent input event when reverting value anyway
		if (control) control.value = self._value; // Revert value as it will be changed by dispatchChange if needed
		for (const opt of options)
			if (opt.value && opt.value === value)
				return dispatchChange(self, opt, multiple);
	} else if (!multiple) dispatchMatch(self, false); // Match while typing if single
};

const onKeyDown = (self: UHTMLComboboxElement, event: KeyboardEvent) => {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	const { clear, control, items } = self;
	const { key, repeat, target } = event;
	const isControl = control && control === target;
	const inText = isControl && control?.selectionEnd;
	let index = isControl
		? items.length
		: [...items].indexOf(target as HTMLDataElement);

	if (isControl && key === "Tab" && clear && !clear.hidden) {
		event.preventDefault(); // Prevent tabbing away from combobox
		clear.tabIndex = -1; // Allow programatic focus
		clear.focus(); // Focus first item on tab
		on(clear, "blur", () => attr(clear, "tabindex", null), EVENT_ONCE); // Revert tabIndex
	}

	if ((!isControl && asButton(event)) || index === -1) return; // Skip if focus is neither on item or control or if item click
	if (key === "ArrowRight" && !isControl) index += 1;
	else if (key === "ArrowLeft" && !inText) index -= 1;
	else if (key === "Enter" && isControl) {
		const form = attr(control, "form");
		attr(control, "form", "#"); // Prevent submit without preventing native datalist
		requestAnimationFrame(() => attr(control, "form", form)); // Restore form attribute after event has bubbled;
		return dispatchMatch(self);
	} else if ((key === "Backspace" || key === "Delete") && !inText) {
		event.preventDefault(); // Prevent navigating away from page
		if (!repeat && items[index]) return dispatchChange(self, items[index]);
		if (isControl) index -= 1;
	} else return isControl || control?.focus(); // Skip other keys and move back to control

	event.preventDefault(); // Prevent datalist arrow events
	(items[Math.max(0, index)] || control)?.focus();
};

customElements.define("u-combobox", UHTMLComboboxElement);
