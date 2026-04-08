import {
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	declarativeShadowRoot,
	EVENT_ONCE,
	FOCUS_OUTLINE,
	getLabel,
	getText,
	IS_ANDROID,
	IS_IOS,
	isPointerDown,
	off,
	on,
	onMutation,
	preventSubmit,
	SAFE_MULTISELECTABLE,
	setValue,
	speak,
	tag,
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

export const UHTMLComboboxStyle = `${DISPLAY_BLOCK}
:is(:host(:not([data-multiple])), :host([data-multiple="false"])) [part="items"] { display: none }
::slotted(button[type="reset"]),::slotted(del) { font: inherit; border: 0; padding: 0; background: none; color: inherit; cursor: pointer; text-decoration: none }
[part="items"] { display: contents }
[role="option"] { display: inline }
[role="option"]:focus, ::slotted(del):focus { ${FOCUS_OUTLINE} }
::slotted(data) { cursor: pointer; pointer-events: none }
::slotted(data)::after { padding-inline: .5ch; pointer-events: auto }
::slotted(data)::after,::slotted(button[type="reset"]:empty)::before,::slotted(del:empty)::before { content: '\\00D7'; content: '\\00D7' / '' }`;

export const UHTMLComboboxShadowRoot =
	declarativeShadowRoot(UHTMLComboboxStyle);

const ARIA_LABEL = "aria-label";
const CSS_CLEAR = `button[type="reset"],del`;
const CSS_DATALIST = `datalist,[role="listbox"]`;
const CSS_OPTION = `option,[role="option"]`;
const EVENTS = "blur focus click input keydown pointerdown";
const FALSE = "false";
const TEXTS = {
	added: "Added",
	clear: "Clear input",
	empty: "No selected",
	found: "Navigate left to find %d selected",
	invalid: "Invalid value",
	items: "Selected", // Note: Not announced by NVDA
	of: "of",
	remove: "Press to remove",
	removed: "Removed",
};

/**
 * The `<u-combobox>` HTML element contain `<data>`, `<input>` and `<u-datalist>` elements.
 * No MDN reference available.
 */
export class UHTMLComboboxElement extends UHTMLElement {
	_unmutate?: ReturnType<typeof onMutation>; // Using underscore instead of private fields for backwards compatibility
	_itemsElement: HTMLElement;

	// Speed up by caching elements
	_clear?: HTMLElement | null;
	_control?: HTMLInputElement | null;
	_items?: HTMLCollectionOf<HTMLDataElement>;
	_list?: HTMLDataListElement | null;
	_options?: HTMLCollectionOf<HTMLOptionElement>;
	_select?: HTMLSelectElement | null;

	_focusMoved = false; // Used to determine if we announce through aria-live or aria-label when items are added or removed
	_match?: HTMLDataElement | { value: string }; // Used to store current match
	_texts = { ...TEXTS };
	_slots = 0; // Used to create unique slot names
	_speak = "";
	_value = ""; // Locally store value to store value before input-click

	static get observedAttributes() {
		return Object.keys(TEXTS).map((key) => `data-sr-${key}`); // Using ES2015 syntax for backwards compatibility
	}

	constructor() {
		super();
		// biome-ignore format:next-line
		this._itemsElement = tag("div", { part: "items", role: "listbox", tabIndex: "-1" });
		this.attachShadow({ mode: "open" }).append(this._itemsElement, tag("slot"));
		attachStyle(this, UHTMLComboboxStyle);
	}
	connectedCallback() {
		on(this, EVENTS, this, true); // Bind events using capture phase to run before frameworks
		this._unmutate = onMutation(this, onMutations, {
			attributeFilter: ["id", "value", "role"], // Respond to changes in <data> value or id or role of <datalist>
			attributes: true,
			characterData: true, // Respond to changes in <data> textContent
			childList: true,
			subtree: true,
		});
		syncInputWithItemSingleMode(this); // Initial render value of <input> in single mode
		syncClearWithInput(this); // Initial render of clear button state
	}
	attributeChangedCallback(prop: string, _: string, val: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = val || TEXTS[text]; // Cache text attributes for performance
	}
	disconnectedCallback() {
		off(this, EVENTS, this, true);
		this._unmutate?.();
		this._unmutate = this._list = this._options = this._match = undefined;
		this._items = this._clear = this._control = this._select = undefined;
	}
	handleEvent(event: Event) {
		if (this.control?.disabled || this.control?.readOnly) return;
		if (event.type === "blur") onBlur(this);
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "input") onInput(this, event);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "pointerdown") isPointerDown(event); // Prevent unwanted blur when pressing items with tabindex="-1"
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
		if (!this._list?.isConnected) this._list = this.querySelector(CSS_DATALIST); // Can not use this.control.list as it might not be connected yet
		return this._list; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
	}
	get clear(): HTMLElement | null {
		if (!this._clear?.isConnected) this._clear = this.querySelector(CSS_CLEAR);
		return this._clear;
	}
	get items(): HTMLCollectionOf<HTMLDataElement> {
		if (!this._items) this._items = this.getElementsByTagName("data");
		return this._items;
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		const el = !this._options && this.list?.querySelector(CSS_OPTION)?.nodeName; // Support renaming u-option element
		if (el) this._options = this.list?.getElementsByTagName(el as "option");
		return this._options || this.getElementsByTagName("-" as "option"); // Fallback when u-option is not initialized yet
	}
	get values(): string[] {
		return Array.from(this.items, ({ value }) => value);
	}
}

const dispatchMatch = (self: UHTMLComboboxElement) => {
	const { creatable, control, options, multiple } = self;
	const value = control?.value?.trim() || "";
	const query = value.toLowerCase() || null; // Fallback to null to prevent matching empty values
	let match = [...options].find((o) => o.label.trim().toLowerCase() === query);
	const event = { bubbles: true, cancelable: true, detail: match };

	if (!self.dispatchEvent(new CustomEvent("comboboxbeforematch", event)))
		match = [...options].find((o) => o.selected); // Only match first selected option if custom matching

	if (!multiple) for (const o of options) o.selected = o === match;
	else syncOptionsWithItems(self); // Sync options with items in multiple mode as consumer can change option.selected in comboboxbeforematch

	if (!match && creatable && value) return { value }; // Return creatable value as match if no match and creatable
	return match;
};

const dispatchSelect = (
	self: UHTMLComboboxElement,
	item?: { value: string; label?: string },
	canRemove = true,
) => {
	const { _itemsElement, _texts, control, items, multiple } = self;
	if (!item) {
		if (multiple) return speak(_texts.invalid); // Warn about trying to select a invalid value in multiple mode
		if (!control?.value && items[0]) return dispatchSelect(self, items[0]); // Clear if empty input and single mode
		return syncInputWithItemSingleMode(self); // Restore previous item if non-empty input and single mode
	}

	const slots = _itemsElement.children as HTMLCollectionOf<HTMLSlotElement>;
	const index = [...items].findIndex((i) => i.value === item.value);
	const remove = multiple || !index ? items[index] : null; // In single mode, only accept index 0 as it is the only visible item
	const focus =
		remove &&
		slots[index]?.matches(":focus") &&
		(slots[index - 1] || slots[index + 1] || control);

	if (remove && !canRemove) return syncInputWithItemSingleMode(self); // If item is already present and not removeable
	if (focus) focus.focus(); // Move focus if item might be removed (can be prevented by comboboxbeforeselect)
	self._focusMoved = !!focus; // Cache if focus was moved to determine if we should use aria-live or aria-label for announcements in onMutations

	const add = tag("data", { value: item.value }, item.label || item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };
	if (self.dispatchEvent(new CustomEvent("comboboxbeforeselect", event))) {
		if (!multiple) for (const item of [...items]) item.remove(); // Use spread to create static array when removing
		if (remove) remove.remove();
		else control?.insertAdjacentElement("beforebegin", add);
		self.dispatchEvent(new CustomEvent("comboboxafterselect", event));
	}
	syncInputWithItemSingleMode(self); // Make sure input value is in sync after change
};

const onBlur = (self: UHTMLComboboxElement) =>
	isPointerDown() || setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element

const onBlurred = (self: UHTMLComboboxElement) =>
	self.multiple ||
	self.matches(":focus-within") ||
	dispatchSelect(self, self._match, false); // Use cached match from typing

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	const { clear, control, items } = self;
	const path = event.composedPath();

	if (control && clear?.contains(target as Node)) {
		event.preventDefault(); // Prevent button[type="reset"]
		setValue(control, "", "deleteContentBackward"); // Support clear button
		return control.focus();
	}
	for (const item of items) {
		const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (item.hasAttribute("slot") && path.includes(item.assignedSlot as Node))
			return dispatchSelect(self, item); // Keyboard and screen reader can set target to element with pointer-events: none
		if (y >= top && y <= bottom && x >= left && x <= right) return item.focus(); // If clicking inside item, focus it
	}
	if (target === self) control?.focus(); // Focus input if clicking <u-combobox>
};

const onInput = (self: UHTMLComboboxElement, event: Partial<InputEvent>) => {
	const { control, options, multiple } = self;
	const value = control?.value || null; // Fallback to null to prevent matching empty values
	const isDatalistClick =
		event instanceof InputEvent
			? !event.inputType || event.inputType === "insertReplacementText" // Firefox when clicking on <datalist>
			: !!control?.value; // WebKit uses Event (not InputEvent) both on <datalist> click and clear when type="search" so we need to check value

	if (!isDatalistClick) self._value = control?.value || ""; // Store value so we can revert if clicking in <datalist>
	if (isDatalistClick) {
		event.stopImmediatePropagation?.(); // Prevent input event when reverting value anyway
		const clicked = [...options].find((o) => o.value === value);
		if (control) control.value = self._value; // Revert value as it will be changed by dispatchChange if needed
		if (clicked) return dispatchSelect(self, clicked, multiple);
	} else if (!multiple) self._match = dispatchMatch(self); // Match while typing in single mode
	syncClearWithInput(self);
};

const onKeyDown = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	if (e.ctrlKey || e.metaKey || e.shiftKey || e.key === "Alt") return; // Firefox sets altKey: false when VO key
	if (self.control === e.target) onKeyDownControl(self, e);
	else onKeyDownItems(self, e);
};

const onKeyDownControl = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	const { _itemsElement, _match, clear, control: input, multiple } = self;

	if ((e.key === "ArrowLeft" || e.key === "Backspace") && !input?.selectionEnd)
		(_itemsElement.lastElementChild as HTMLElement)?.focus(); // Focus last item if pressing left or backspace at start of input
	if (e.key === "Enter" && input) {
		preventSubmit(input); // Prevent submitting form as we want to preform a match instead
		dispatchSelect(self, multiple ? dispatchMatch(self) : _match, multiple);
	}
	if (e.key === "Tab" && !e.shiftKey && clear && !clear.hidden) {
		e.preventDefault(); // Prevent default tab as we are moving into clear
		attr(clear, "aria-hidden", "false"); // Allow screen readers to announce clear button as we are focusing it
		attr(clear, "tabindex", "0"); // Needed to prevent Safari from looping focus back to input on text Tab-press
		clear.focus(); // Focus element
		on(clear, "blur", () => syncClearWithInput(self), EVENT_ONCE); // Revert on next blur
	}
};

const onKeyDownItems = (self: UHTMLComboboxElement, event: KeyboardEvent) => {
	const { _itemsElement, clear, control, items } = self;
	const { key, repeat, target } = event;
	const slots = _itemsElement.children as HTMLCollectionOf<HTMLSlotElement>;
	const index = [...slots].indexOf(event.composedPath()[0] as HTMLSlotElement);

	if ((key === "Enter" || key === " ") && (slots[index] || target === clear)) {
		(slots[index] || clear)?.click(); // Trigger click to ensure consistent behavior with mouse and screen readers
		return event.preventDefault(); // Prevent scrolling or submitting
	}
	if (!slots[index]) return;
	if (key === "ArrowLeft") return slots[index - 1]?.focus();
	if (key === "ArrowRight") return (slots[index + 1] || control)?.focus();
	if (key === "Backspace") {
		event.preventDefault(); // Prevent navigating away from page
		return repeat || dispatchSelect(self, items[index]);
	}
	control?.focus(); // Move focus when typing any character
};

const onMutations = (self: UHTMLComboboxElement, edit?: MutationRecord[]) => {
	if (!self.control) return;
	const { _itemsElement, _texts, control, items, list, multiple } = self;
	const edits: HTMLDataElement[] = [];
	for (const { addedNodes: add, removedNodes: del } of edit || []) {
		for (const el of add) if (el instanceof HTMLDataElement) edits.unshift(el); // Added nodes to the front
		for (const el of del) if (el instanceof HTMLDataElement) edits.push(el); // Removed nodes to the back
	}

	const doSpeak = multiple ? edits.length === 1 : edits[0]?.matches(":focus"); // Only speak in single mode if item is visible and focused
	if (doSpeak && self.matches(":focus-within")) {
		const label = control ? attr(control, ARIA_LABEL) : null; // Store so we can revert after announcement
		self._speak = `${_texts[edits[0].isConnected ? "added" : "removed"]} ${getText(edits[0])}, `; // Updates aria-labels
		attr(control, ARIA_LABEL, `${self._speak}${getLabel(control)}`); // Make sure control also can aria-label-announce
		if (!self._focusMoved) setTimeout(() => speak(self._speak.slice(0, -2))); // Aria-live when no focus move, remove trailing command, setTimeout to take presence
		setTimeout(speakReset, 300, self, label); // 300ms delay so screen readers announces new aria-label. Note: Causes short double/hiccup announce in NVDA Firefox
	}

	syncItems(self);
	syncOptionsWithItems(self);
	syncSelectWithItems(self);

	const hint = `${items.length ? _texts.found.replace("%d", `${items.length}`) : _texts.empty}`;
	attr(control, "aria-description", multiple ? hint : null);
	attr(control, "list", useId(list)); // Connect datalist and input
	attr(_itemsElement, ARIA_LABEL, _texts.items);

	self._unmutate?.takeRecords(); // Clear mutation records caused by updating control "id"
};

const speakReset = (self: UHTMLComboboxElement, label: string | null) => {
	self._speak = "";
	if (self.control) attr(self.control, ARIA_LABEL, label); // Revert aria-label to original value after announcement
	syncItems(self);
};

const syncItems = (self: UHTMLComboboxElement) => {
	const { _itemsElement, _texts, _speak, items } = self;

	let idx = 0;
	const append: Element[] = [];
	for (const item of items) {
		// biome-ignore format:next-line
		const props = { "aria-selected": "true", name: item.getAttribute('slot') || `item-${self._slots++}`, part: "item", role: "option", tabindex: "-1" };
		const slot = item.hasAttribute("slot") && item.assignedSlot; // Use existing option if available
		const text = `${_speak}${getText(item)}, ${_texts.remove}${IS_IOS ? `, ${++idx} ${_texts.of} ${items.length}` : ""}`;

		attr(item, ARIA_LABEL, text);
		attr(item, "slot", props.name);
		attr(item, "value", item.value || getText(item));
		append.push(slot || tag("slot", props));
	}

	idx = 0;
	const slots = _itemsElement.children;
	for (const slot of slots) if (!append.includes(slot)) slot.remove(); // Remove unused slots
	for (const add of append) {
		const slot = slots[idx++];
		if (slot === add) continue; // No need to move, keep in place to prevent focus loss
		if (slot) slot.insertAdjacentElement("afterend", add);
		else _itemsElement.append(add); // Append only if not already in correct order
	}
};

const syncSelectWithItems = (self: UHTMLComboboxElement) => {
	if (!self._select?.isConnected) self._select = self.querySelector("select");
	if (!self._select) return;
	const { _select, items, multiple } = self;
	const append = [];
	let idx = 0;

	attr(_select, "multiple", multiple ? "" : null); // Forward multiselect
	for (const item of items) {
		const option = _select?.options[idx++]; // Use existing option if available
		const text = getText(item);
		const value = item?.value;

		if (option) Object.assign(option, { text, value });
		else append.push(new Option(text, value, true, true)); // Speed up by running all appends in one go after the loop
	}
	if (append.length) _select.append(...append);
	else for (const opt of [..._select.options].slice(idx)) opt.remove(); // Remove unused options
	self._unmutate?.takeRecords(); // Clear mutation records caused by adding/removing <option> elements
};

const syncClearWithInput = (self: UHTMLComboboxElement) => {
	if (!self.clear) return;
	const { clear, control } = self;
	const hidden = !control?.value || control?.disabled || control?.readOnly;
	attr(clear, "aria-hidden", `${IS_IOS || IS_ANDROID}`); // Hide from screen readers to keep datalist open on swipe right navigation
	attr(clear, "hidden", hidden ? "" : null);
	attr(clear, "tabindex", "-1");
	attr(clear, ARIA_LABEL, self._texts.clear);
};

const syncOptionsWithItems = (self: UHTMLComboboxElement) => {
	if (!self.list) return;
	const { _texts, list, multiple, options, values } = self;
	attr(list, "data-sr-of", _texts.of); // Forward of text
	attr(list, SAFE_MULTISELECTABLE, `${multiple}`); // Forward multiselect
	for (const opt of options) opt.selected = values.includes(opt.value);
};

// TODO: aria-required="true" => setCustomValidity
const syncInputWithItemSingleMode = (self: UHTMLComboboxElement) => {
	if (!self.control || self.multiple) return; // No need to sync input value if multiple
	const { control, items } = self;
	const value = getText(items[0]);
	const action = value ? "insertText" : "deleteContentBackward";
	if (value !== control.value) setValue(control, value, action); // Prevent input event being handled as "click" on option
};

customElements.define("u-combobox", UHTMLComboboxElement);
