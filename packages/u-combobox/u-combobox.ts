import {
	asButton,
	attr,
	createElement,
	customElements,
	declarativeShadowRoot,
	FOCUS_OUTLINE,
	getLabel,
	getRoot,
	IS_ANDROID,
	IS_FIREFOX,
	IS_IOS,
	isMouseDown,
	mutationObserver,
	off,
	on,
	setValue,
	speak,
	UHTMLElement,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-combobox": UHTMLComboboxElement;
	}
	interface GlobalEventHandlersEventMap {
		comboboxafterselect: CustomEvent<HTMLDataElement>;
		comboboxbeforeselect: CustomEvent<HTMLDataElement>;
		comboboxbeforematch: CustomEvent<HTMLOptionElement | undefined>;
	}
}

export const UHTMLComboboxStyle = `:host(:not([hidden])) { display: block; -webkit-tap-highlight-color: rgba(0, 0, 0, 0) } /* Must be display block in Safari to allow focus inside */
:host(:not([data-multiple])) ::slotted(data),
:host([data-multiple="false"]) ::slotted(data) { display: none } /* Hide data if not multiple */
::slotted(input[inputmode="none"]) { outline: none } /* Hide temporary foucs outline flash */
::slotted(del) { text-decoration: none }
::slotted(data:not([hidden])) { display: inline-block; pointer-events: none }
::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto; cursor: pointer }
::slotted(data:focus) { ${FOCUS_OUTLINE} }`;

export const UHTMLComboboxShadowRoot =
	declarativeShadowRoot(UHTMLComboboxStyle);

const EVENTS = "beforeinput,blur,focus,click,input,keydown,mousedown";
const EVENT_ONCE = { once: true, passive: true };
const FALSE = "false";
const IS_FIREFOX_DESKTOP = IS_FIREFOX && !IS_ANDROID;
const IS_MOBILE = IS_ANDROID || IS_IOS;
const MODIFIED = "\u{200B}".repeat(5); // Use unicode U+200B zero width white-space to detect modified aria-label
const VALUE_DELETE = "deleteContentBackward";
const VALUE_INSERT = "insertText";
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
	_clear?: HTMLElement | null; // Speed up by caching
	_control?: HTMLInputElement | null;
	_focus?: HTMLElement;
	_item = ""; // Locally store item text to compare change in single mode
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
		if (!this.shadowRoot)
			this.attachShadow({ mode: "open" }).append(
				createElement("slot"), // Content slot
				createElement("style", UHTMLComboboxStyle),
			);
	}
	connectedCallback() {
		this._root = getRoot(this);

		on(this, EVENTS, this, true); // Bind events using capture phase to run before framworks
		mutationObserver(this, {
			attributeFilter: ["value", "id"], // Respond to changes in <data> value or change of id for <datalist> to reconnect with input
			attributes: true,
			characterData: true, // Respond to changes in <data> textContent
			childList: true,
			subtree: true,
		});
		setTimeout(render, 0, this); // Delay to allow DOM to be ready
		setTimeout(syncInputValue, 0, this);
	}
	attributeChangedCallback(prop: string, _: string, val: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = val || TEXTS[text];
	}
	disconnectedCallback() {
		mutationObserver(this, false);
		off(this, EVENTS, this, true);
		this._items = this._clear = this._focus = this._control = undefined;
		this._list = this._options = this._root = undefined;
	}
	handleEvent(event: Event) {
		const target = event.target as HTMLInputElement | null;
		if (isDisabled(this)) return; // Skip if control is disabled or readOnly
		if (event.type === "beforeinput") this._value = target?.value || ""; // Store value before input to restore
		if (event.type === "blur") onBlur(this);
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "focus") onFocus(this, event);
		if (event.type === "input") onInput(this, event);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "mousedown") isMouseDown(event);
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
		return this._clear;
	}
	get items(): HTMLCollectionOf<HTMLDataElement> {
		if (!this._items) this._items = this.getElementsByTagName("data");
		return this._items;
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> | undefined {
		if (!this._options) {
			const tag = this.list?.nodeName === "U-DATALIST" ? "u-option" : "option";
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
const isDisabled = ({ control }: UHTMLComboboxElement) =>
	control?.disabled || control?.readOnly || false;

const render = (
	self: UHTMLComboboxElement,
	event?: CustomEvent<MutationRecord[]>,
) => {
	const { _focus, _texts, items, control, list, multiple } = self;
	if (!control || !list) return;

	// Support both labeling with <label> and aria-label
	// Since we need to modify aria-label, we need to identify if it has been modified
	const prev = getLabel(control);
	const next = prev.endsWith(MODIFIED) ? attr(control, "data-label") : prev;
	attr(control, "data-label", next);

	let label = `${next}${multiple ? `, ${items.length ? _texts.found.replace("%d", `${items.length}`) : _texts.empty}` : ""}`;
	const edits: HTMLDataElement[] = [];
	for (const { addedNodes, removedNodes } of event?.detail || []) {
		for (const el of addedNodes) if (isData(el)) edits.unshift(el); // Add added nodes to the front
		for (const el of removedNodes) if (isData(el)) edits.push(el); // Add removed nodes to the front
	}

	const shouldAnnounce = multiple ? edits.length === 1 : edits[0] === _focus; // Only announce in single mode if item is visible and focused
	if (_focus && shouldAnnounce) {
		const ariaExpanded = attr(control, "aria-expanded"); // Store previous aria-expanded state to prevent VoiceOver announcing it
		const inputMode = attr(control, "inputmode"); // Store previous inputmode to prevent virtual keyboard on iOS and Android
		const nextFocus = isData(_focus) ? control : _focus;
		const isRemove = !edits[0].isConnected;
		self._speak = `${_texts[isRemove ? "removed" : "added"]} ${text(edits[0])}, `; // Update aria-labels

		if (IS_MOBILE || _focus === control) speak(self._speak); // Live announce when focus can not be moved

		// Temporarily move focus the control to force reading new aria-label
		if (control !== nextFocus) {
			attr(control, "aria-expanded", null); // Prevent announce state when temporarily focused
			attr(control, "inputmode", "none"); // Prevent virtual keyboard on iOS and Android
			label = "\u{A0}"; // Prevent VoiceOver announcing aria-label change
			control.focus();
		}

		setTimeout(() => {
			attr(control, "aria-expanded", ariaExpanded); // Revert aria-expanded
			attr(control, "inputmode", isRemove ? "none" : inputMode); // Revert inputMode before focus, but keep keyboard closed if item remove

			nextFocus?.focus?.();
			attr(control, "inputmode", inputMode); // Revert inputMode after focus if removing
			self._speak = ""; // Prevent Firefox announcing aria-label change, but also support non-focus environments such as JAWS forms mode
			if (IS_FIREFOX_DESKTOP) on(self, "blur", () => render(self), EVENT_ONCE);
			else setTimeout(render, 100, self);
		}, 100); // 100ms delay so VoiceOver + Chrome announces new ariaLabel
	}

	// Setup items and optional select
	let idx = 0;
	const select = self.querySelector("select");
	const remove = isDisabled(self) ? "" : `${_texts.remove}, `;
	for (const item of items) {
		const option = select?.options[idx]; // Use existing option if available
		const label = text(item);
		const value = item.value || label;
		const aria = `${self._speak}${label}, ${remove}${++idx} ${_texts.of} ${items.length}`;
		attr(item, "role", "button");
		attr(item, "value", value);
		attr(item, "tabindex", "-1");
		attr(item, "aria-label", aria);
		if (option) Object.assign(option, { textContent: label, value });
		else select?.appendChild(new Option(label, value, true, true));
	}
	if (select) attr(select, "multiple", multiple ? "" : null);
	for (const opt of [...(select?.options || [])].slice(idx)) opt.remove();
	if (!multiple && idx > 1)
		console.warn("u-combobox: Multiple <data> found in single mode.");

	// Setup input and list (Note: Label pointing to the input overwrites input's aria-label in Firefox)
	attr(list, "aria-multiselectable", `${multiple}`); // Sync datalist multiselect
	attr(control, "list", useId(list)); // Connect datalist and input
	attr(control, "aria-label", `${self._speak}${label}${MODIFIED}`);
	if (list.hasAttribute("popover")) {
		attr(control, "popovertarget", useId(list)); // Connect popover target to datalist
		attr(list, "popover", "manual"); // Ensure correct popover behavior
	}

	const item = text(items[0]);
	if (item !== self._item) syncInputValue(self); // Only syncInputValue if item text has changed
	self._item = item;

	syncClearWithInput(self);
	syncOptionsWithItems(self);
	mutationObserver(self)?.takeRecords(); // Clear mutation records to prevent infinite loop
};

const syncClearWithInput = (self: UHTMLComboboxElement) => {
	if (self.clear) attr(self.clear, "role", "button");
	if (self.clear) self.clear.hidden = !self.control?.value || isDisabled(self);
};

const syncOptionsWithItems = (self: UHTMLComboboxElement) => {
	const { _speak, options = [], values } = self;
	for (const opt of options) {
		const value = attr(opt, "value") ?? text(opt); // u-option might not be initialized yet
		attr(opt, "aria-label", _speak ? `${_speak}${text(opt)}` : null);
		attr(opt, "selected", values.includes(value) ? "" : null); // u-option might not be initialized yet
	}
};

const syncInputValue = (self: UHTMLComboboxElement) => {
	const { multiple, control, items } = self;
	const value = text(items[0]);
	if (!multiple && control && value !== control.value)
		setValue(control, value, value ? VALUE_INSERT : VALUE_DELETE); // Prevent input event being handled as "click" on option
};

const dispatchMatch = (self: UHTMLComboboxElement, change = true) => {
	const { _texts, options = [], creatable, control, items, multiple } = self;
	const value = control?.value?.trim() || "";
	const query = value.toLowerCase() || null; // Fallback to null to prevent matching empty strings
	let match = [...options].find(
		(opt) => (attr(opt, "label") || text(opt)).trim().toLowerCase() === query,
	);
	const event = { bubbles: true, cancelable: true, detail: match };

	if (!self.dispatchEvent(new CustomEvent("comboboxbeforematch", event)))
		match = [...options].find((o) => o.selected); // Only match first selected option if custom matching

	if (change) {
		syncOptionsWithItems(self); // Re-sync options with items as consumer can change opt.selected in comboboxbeforematch event
		if (match) return dispatchChange(self, match, false);
		if (creatable && value) return dispatchChange(self, { value }, false);
		if (!multiple && !value && items[0]) dispatchChange(self, items[0]);
		else syncInputValue(self); // If no match is found, but no item is removed, ensure input value is in sync
		return speak(_texts.invalid); // Announce invalid value if no match
	}
	for (const opt of options) opt.selected = opt === match; // dispatchMatch is only used to viusalize the match while typing in single mode
};

const dispatchChange = (
	self: UHTMLComboboxElement,
	item: { value: string; label?: string },
	removable = true,
) => {
	const { control, items, multiple } = self;
	const add = createElement("data", item.label || item.value, {
		value: item.value,
	});
	const remove = [...items].find((i) => i.value === item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };
	const skip = remove && !removable;

	if (skip) return syncInputValue(self); // If item is already present and not removeable, skip change but ensure input value is in sync
	if (self.dispatchEvent(new CustomEvent("comboboxbeforeselect", event))) {
		if (!multiple) for (const item of [...items]) item.remove(); // Clear if single (loop as static array to prevent live HTMLCollection)
		if (remove) remove.remove();
		else control?.insertAdjacentElement("beforebegin", add); // Add new item
		self.dispatchEvent(new CustomEvent("comboboxafterselect", event));
	}
};

const onFocus = (self: UHTMLComboboxElement, { target }: Event) => {
	if (target instanceof HTMLElement) self._focus = target;
	speak(); // Prepare for screen reader announcements
};

const onBlur = (self: UHTMLComboboxElement) =>
	isMouseDown() || setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element

const onBlurred = (self: UHTMLComboboxElement) => {
	if (!self._focus || self.contains(self._root?.activeElement as Node)) return; // Blur is allready done or focus is still in combobox
	if (!self.multiple) dispatchMatch(self); // Try to match if single
	self._focus = undefined; // Reset focus
};

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	const { clear, control, items } = self;

	if (clear?.contains(target as Node)) {
		if (control) setValue(control, "", VALUE_DELETE); // Support clear button
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
			? !event.inputType || event.inputType === "insertReplacementText" // Firefox when clicking on <datalist>
			: !!value; // WebKit uses Event (not InputEvent) both on <datalist> click and clear when type="search" so we need to check value

	if (isClick) {
		event.stopImmediatePropagation(); // Prevent input event when reverting value anyway
		if (control) control.value = self._value; // Revert value as it will be changed by dispatchChange if needed
		for (const opt of options)
			if (opt.value && opt.value === value)
				return dispatchChange(self, opt, multiple);
	} else if (!multiple) dispatchMatch(self, false); // Match while typing if single
	syncClearWithInput(self);
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
		clear.tabIndex = 0;
		clear.focus(); // Focus del element
		on(clear, "blur", () => attr(clear, "tabindex", null), EVENT_ONCE); // Revert tabIndex
	}

	if ((!isControl && asButton(event)) || index === -1) return; // Skip if focus is neither on item or control or if item click
	if (key === "ArrowRight" && !isControl) index += 1;
	else if (key === "ArrowLeft" && !inText) index -= 1;
	else if (key === "Enter" && isControl) {
		const form = attr(control, "form");
		attr(control, "form", "#"); // Prevent submit without preventing native datalist
		requestAnimationFrame(() => attr(control, "form", form)); // Restore form attribute after event has bubbled
		return dispatchMatch(self);
	} else if (key === "Backspace" && !inText) {
		event.preventDefault(); // Prevent navigating away from page
		if (!repeat && items[index]) return dispatchChange(self, items[index]);
		if (isControl) index -= 1;
	} else return isControl || control?.focus(); // Skip other keys and move back to control

	event.preventDefault(); // Prevent datalist arrow events
	(items[Math.max(0, index)] || control)?.focus();
};

customElements.define("u-combobox", UHTMLComboboxElement);
