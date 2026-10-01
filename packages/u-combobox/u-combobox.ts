import {
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	declarativeShadowRoot,
	EVENT_ONCE,
	FOCUS_OUTLINE,
	getFocusedElement,
	getInputLabel,
	getText,
	IS_ANDROID,
	IS_IOS,
	isBrowser,
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
		comboboxbeforematch: CustomEvent<HTMLOptionElement | undefined>;
		comboboxbeforeselect: CustomEvent<HTMLDataElement>;
		comboboxprogrammaticinput: CustomEvent<undefined>;
	}
}

export const UHTMLComboboxStyle = `${DISPLAY_BLOCK}
[part="items"]:not([hidden]) { display: inline-flex; flex-wrap: wrap } /* Can not be "contents" as this confuses VoiceOver */
:host(:not([data-multiple])) [part="items"],
:host([data-multiple="false"]) [part="items"] { display: none }
::slotted(button[type="reset"]),
::slotted(button[aria-expanded]),
::slotted(del) { font: inherit; border: 0; padding: 0; background: none; color: inherit; cursor: pointer; text-decoration: none }
::slotted(data) { cursor: pointer; pointer-events: none }
::slotted(data)::after { padding-inline: .5ch; pointer-events: auto }
::slotted(data)::after,
::slotted(del:empty)::before,
::slotted(button[type="reset"]:empty)::before { content: '\\00D7'; content: '\\00D7' / '' }
::slotted(button[aria-expanded="false"]:empty)::before { content: '\\25BC'; content: '\\25BC' / '' }
::slotted(button[aria-expanded="true"]:empty)::before { content: '\\25B2'; content: '\\25B2' / '' }
::slotted(data:focus),::slotted(del:focus),::slotted(button[type="reset"]:focus) { ${FOCUS_OUTLINE} }`;

export const UHTMLComboboxShadowRoot =
	declarativeShadowRoot(UHTMLComboboxStyle);

let IS_LIST_HIDDEN: boolean | undefined; // Used to keep track of list visibility before pointerdown
const ARIA_LABEL = "aria-label";
const CSS_CLEAR = `button[type="reset"],del`;
const CSS_TOGGLE = `button[aria-expanded]`;
const CSS_DATALIST = `datalist,u-datalist,[role="listbox"]`;
const CSS_OPTION = `option,u-option,[role="option"]`;
const FOCUS_VISIBLE = { focusVisible: true };
const EVENTS = "blur focus click beforeinput input keydown pointerdown";
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
	toggle: "Options",
};

/*
Specification:
| Action         | Single + Predefined       | Single + Creatable | Multiple + Predefined             | Multiple + Creatable        |
| :------------- | :------------------------ | :----------------- | :-------------------------------- | :-------------------------- |
| Datalist click | Item + Input value        | Item + Input value | Item + Revert input               | Item + Revert input         |
| Input type     | Filter + Match            | Filter + Match     | Filter                            | Filter                      |
| Enter          | Maybe match + Item/Revert | Maybe match + Item | Match + Item/Clear + Revert input | Match + Item + Revert input |
| Blur           | Maybe match + Item/Revert | Item/Revert        | Nothing                           | Nothing                     |

Revert input = restore the text that was typed before the action. Multiple mode never clears the input on its own.
Single mode without a datalist is free text: the input is never overwritten by the item.
*/

/**
 * The `<u-combobox>` HTML element contain `<data>`, `<input>` and `<u-datalist>` elements.
 * No MDN reference available.
 */
export class UHTMLComboboxElement extends UHTMLElement {
	_umutate?: ReturnType<typeof onMutation>; // Using underscore instead of private fields for backwards compatibility
	_listbox: HTMLElement;

	// Speed up by caching elements
	_clear?: HTMLElement | null;
	_control?: HTMLInputElement | null;
	_items?: HTMLCollectionOf<HTMLDataElement>;
	_list?: HTMLDataListElement | null;
	_options?: HTMLCollectionOf<HTMLOptionElement>;
	_select?: HTMLSelectElement | null;
	_toggle?: HTMLElement | null;
	_focusMoved = false; // Used to determine if we announce through aria-live or aria-label when items are added or removed
	_itemSingleValue?: string; // Locally store item text to compare change in single mode. Undefined until first sync, so the first run always syncs
	_singleTypingMatch?: { value: string; label: string; creatable?: boolean }; // Used to store current match in single mode
	_speak = "";
	_texts = { ...TEXTS };

	_restoreBeforeSelect?: ReturnType<typeof setTimeout>; // Pending input restore after a prevented comboboxbeforeselect
	_value = ""; // Cache value to be able to revert on datalist click in multiple mode
	_valueSkipProgrammatic = false; // If a programmatic input.value change happens directly after a "beforeinput" event, there is no need to cache as the value comes from a datalist
	_onComboboxProgrammaticInput(input: HTMLInputElement) {
		if (this.control === input) onProgrammaticInput(this);
	}

	static get observedAttributes() {
		return [
			"data-creatable",
			"data-multiple",
			...Object.keys(TEXTS).map((key) => `data-sr-${key}`),
		]; // Using ES2015 syntax for backwards compatibility
	}

	constructor() {
		super();
		const root = attachStyle(this, UHTMLComboboxStyle);
		this._listbox = root.querySelector('[role="listbox"]') || tag("div"); // Respect shadowDOM from template if existing
		this._listbox.querySelector("slot") ||
			this._listbox.append(tag("slot", { name: "items" })); // Avoid innerHTML to comply with Trusted Types CSP
		attr(this._listbox, "aria-orientation", "horizontal");
		attr(this._listbox, "role", "listbox");
		attr(this._listbox, "part", "items");
		attr(this._listbox, "tabindex", "-1"); // Prevent tabstop even if consumer sets overflow: auto (https://issues.chromium.org/issues/40456188)
		root.insertBefore(this._listbox, root.firstChild); // Make sure listbox is first
	}
	connectedCallback() {
		on(this, EVENTS, this, true); // Bind events using capture phase to run before frameworks
		this._umutate = onMutation(this, onMutations, {
			attributeFilter: [
				"aria-expanded",
				"id", // Respond to change or <datalist> id
				"role", // Respond to change or <u-datalist> role
				"value", // Respond to changes in <data> value
			],
			attributeOldValue: true, // Needed to ignore no-op attribute writes from frameworks
			attributes: true,
			characterData: true, // Respond to changes in <data> textContent
			childList: true,
			subtree: true,
		});
	}
	attributeChangedCallback(prop: string, prev?: string, next?: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = next || TEXTS[text]; // Cache text attributes for performance
		if (text === "clear" && this.clear)
			attr(this.clear, ARIA_LABEL, this._texts.clear); // Backwards compatbile only update clear aria-label if data-sr-clear is set
		if (!text && prev !== next && this._umutate) {
			onMutations(this); // Re-sync on data-multiple/data-creatable change, ignoring no-op writes from frameworks and changes before connect
			syncInputWithItemSingleMode(this); // Input may hold filter text from multiple mode while cached item text is unchanged, so onMutations skips the sync
		}
	}
	disconnectedCallback() {
		clearTimeout(this._restoreBeforeSelect);
		off(this, EVENTS, this, true);
		this._umutate?.();
		// biome-ignore format: next-line
		this._umutate = this._clear = this._toggle = this._control = this._singleTypingMatch = this._select = this._options = this._items = this._list = this._itemSingleValue = undefined;
		this._focusMoved = false;
		this._value = "";
	}
	handleEvent(event: Event) {
		if (this.control?.disabled || this.control?.readOnly) return;
		if (event.type === "blur") onBlur(this);
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "focus") speak(); // Prepare for aria-live announcements
		if (event.type === "beforeinput") onBeforeInput(this, event);
		if (event.type === "input") onInput(this, event);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "pointerdown") {
			IS_LIST_HIDDEN = !!this.list?.hidden;
			isPointerDown(this, event); // Prevent unwanted blur when pressing items with tabindex="-1"
		}
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
		if (!this._list?.isConnected) {
			this._list = this.querySelector<HTMLDataListElement>(CSS_DATALIST); // Can not use this.control.list as it might not be connected yet
			this._options = undefined; // Reset options cache as list might be changed
		}
		return this._list; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
	}
	get clear(): HTMLElement | null {
		if (!this._clear?.isConnected) this._clear = this.querySelector(CSS_CLEAR);
		return this._clear;
	}
	get toggle(): HTMLElement | null {
		if (!this._toggle?.isConnected)
			this._toggle = this.querySelector(CSS_TOGGLE);
		return this._toggle;
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

type Item = { value: string; label: string; creatable?: boolean };
const dispatchMatch = (self: UHTMLComboboxElement): Item | undefined => {
	const { creatable, control, options, multiple, list } = self;
	const label = control?.value?.trim() || "";
	const find = label.toLowerCase() || null; // Fallback to null to prevent matching empty values
	let match: HTMLOptionElement | undefined;

	if (list) {
		match = [...options].find((o) => getLabel(o).trim().toLowerCase() === find);
		const event = { bubbles: true, cancelable: true, detail: match };

		if (!self.dispatchEvent(new CustomEvent("comboboxbeforematch", event)))
			match = [...options].find(getSelected); // Only match first selected option if custom matching

		if (!multiple) for (const o of options) setSelected(o, o === match);
		else syncOptionsWithItems(self); // Sync options with items in multiple mode as consumer can change option.selected in comboboxbeforematch
	}

	if (!match && creatable && label) return { value: label, label, creatable }; // Return creatable value as match if no match and creatable
	return match && getItem(match);
};

const dispatchSelect = (
	self: UHTMLComboboxElement,
	item?: { value: string; label?: string },
	canRemove = true,
) => {
	const { _texts, control, items, multiple } = self;
	if (!item) {
		if (multiple) return speak(_texts.invalid); // Warn about trying to select a invalid value in multiple mode
		if (!control?.value && items[0]) return dispatchSelect(self, items[0]); // Clear if empty input and single mode
		return syncInputWithItemSingleMode(self); // Restore previous item if non-empty input and single mode
	}

	const index = [...items].findIndex((i) => i.value === item.value);
	const remove = items[index];
	const focus =
		remove === getFocusedElement(self) &&
		(multiple ? items[index - 1] || items[index + 1] || control : control);

	if (remove && !canRemove) return syncInputWithItemSingleMode(self); // If item is already present and not removeable
	if (focus) focus.focus(FOCUS_VISIBLE); // Move focus if item might be removed (can be prevented by comboboxbeforeselect)
	self._focusMoved = !!focus; // Cache if focus was moved to determine if we should use aria-live or aria-label for announcements in onMutations

	const add = tag("data", { value: item.value }, item.label || item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };
	if (self.dispatchEvent(new CustomEvent("comboboxbeforeselect", event))) {
		if (!multiple) for (const item of [...items]) item.remove(); // Use spread to create static array when removing
		if (remove) remove.remove();
		else control?.insertAdjacentElement("beforebegin", add);
		self.dispatchEvent(new CustomEvent("comboboxafterselect", event));
	} else {
		clearTimeout(self._restoreBeforeSelect);
		self._restoreBeforeSelect = setTimeout(onBeforeSelectRestore, 0, self); // Restore value if beforeselect was canceled. Deferred, as frameworks render the <data> they control asynchronously, and syncing right away would briefly restore the previous value
	}
};

const onBeforeSelectRestore = (self: UHTMLComboboxElement) => {
	clearTimeout(self._restoreBeforeSelect);
	self._restoreBeforeSelect = undefined;
	syncInputWithItemSingleMode(self);
};

const onBlur = (self: UHTMLComboboxElement) =>
	isPointerDown(self) || setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element

const onBlurred = (self: UHTMLComboboxElement) => {
	const { control, items, multiple, _singleTypingMatch: cached } = self;
	if (multiple || !control || !self.isConnected) return; // Nothing to do in multiple mode, or if unmounted before the blur timeout
	if (self.contains(getFocusedElement(self))) return; // Focus is still inside
	if (self._restoreBeforeSelect) onBeforeSelectRestore(self); // Finish pending restore first, so a prevented pick is not treated as typed text
	const changed = control.value !== getText(items[0]); // Only match if value differs from current item, to avoid re-matching after option click
	const match = cached || (changed ? dispatchMatch(self) : undefined); // Prefer match cached while typing, but fall back as options might have changed since
	dispatchSelect(self, match?.creatable ? undefined : match, false); // Prevent creating match automatically on blur
};

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	const { clear, control, items, toggle, multiple } = self;
	const isHidden = IS_LIST_HIDDEN ?? !!self.list?.hidden; // Fall back to live state for programmatic clicks
	const isSelf = target === self;
	IS_LIST_HIDDEN = undefined; // Reset so next click without pointerdown reads live state

	if (toggle?.contains(target as Node)) {
		control?.focus();
		if (isHidden) control?.click();
		else {
			const event = { key: "Escape", bubbles: true };
			control?.dispatchEvent(new KeyboardEvent("keydown", event)); // Close list, as <u-datalist> listens for Escape. Needed as blur does not close in Safari (button never gets focus) and Android reopens on input focus
		}
	}

	if (control && clear?.contains(target as Node)) {
		event.preventDefault(); // Prevent button[type="reset"]
		setValue(control, "", "deleteContentBackward"); // Support clear button
		if (!multiple) dispatchSelect(self); // Instantly trigger removal if single mode
		control.focus();
		return isHidden || control.click(); // Open list if it was open before clicking clear
	}

	for (const item of items) {
		if (item.contains(target as Node)) return dispatchSelect(self, item); // Keyboard and screen reader can set target to element with pointer-events: none
		if (!isSelf) continue; // Click must be on u-combobox if we should re-route it to a chip
		const rect = item.getBoundingClientRect();
		const { top: t, right: r, bottom: b, left: l, width: w, height: h } = rect; // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (w && h && y >= t && y <= b && x >= l && x <= r) return item.focus(); // If item is larger than 0x0 and click is inside inside, focus it
	}
	if (isSelf) control?.focus(); // Focus input if clicking <u-combobox>
};

// If clicking inside <u-datalist>, we need to set value programmatically,
// but we do not want to cache this in self._value, as we need self._value
// when reverting to value before datalist-click.
const onBeforeInput = (self: UHTMLComboboxElement, event: Event) => {
	if (!isDatalistClick(self, event) && !isLegacyDatalistClick(event)) return; // Legacy beforeinput must set the flag for the input event that follows
	self._valueSkipProgrammatic = true;
	setTimeout(() => (self._valueSkipProgrammatic = false));
};

const onProgrammaticInput = (self: UHTMLComboboxElement) => {
	self._singleTypingMatch = undefined; // Clear cache, so we can match on blur

	if (!self._valueSkipProgrammatic) {
		const event = { bubbles: true };
		self._value = self.control?.value || "";
		self.dispatchEvent(new CustomEvent("comboboxprogrammaticinput", event));
	}
	syncButtonsWithInput(self);
};

const onInput = (self: UHTMLComboboxElement, event: Partial<InputEvent>) => {
	const { control, multiple } = self;

	if (isDatalistClick(self, event)) {
		if (multiple) event.stopImmediatePropagation?.(); // Prevent input event when reverting value in multiple mode. Single mode keeps the value, so frameworks must receive the event
		const match = getOption(self, control?.value);

		self._singleTypingMatch = undefined; // Picked option replaces whatever was typed, so blur must not re-apply the typed match
		self._valueSkipProgrammatic = true; // Prevent programmatic event when reverting
		if (multiple && control) control.value = self._value; // Revert value as it will be changed by dispatchSelect if needed

		self._valueSkipProgrammatic = false; // Datalist writes are done, consumer writes from here on (i.e. in comboboxafterselect) must be cached
		if (match) dispatchSelect(self, getItem(match), multiple);
	} else {
		self._value = control?.value || "";
		if (!multiple && event.isTrusted)
			self._singleTypingMatch = dispatchMatch(self); // Match while typing in single mode
	}
	syncButtonsWithInput(self);
};

const onKeyDown = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	if (e.ctrlKey || e.metaKey || e.shiftKey || e.key === "Alt") return; // Firefox sets altKey: false when VO key
	if (self.control === e.target) onKeyDownControl(self, e);
	else onKeyDownItems(self, e);
};

const onKeyDownControl = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	const { clear, control, creatable, items, list, multiple } = self;
	const isBackwards = e.key === "ArrowLeft" || e.key === "Backspace";

	// selectionEnd is null for type="email" and type="number", so only act when caret is known to be at start
	if (isBackwards && control?.selectionEnd === 0) {
		items[items.length - 1]?.focus(FOCUS_VISIBLE); // Focus last item if pressing left or backspace at start of input
		e.preventDefault(); // Prevent sideways scroll
	}
	if (e.key === "Enter" && control && (list || creatable)) {
		if (self._restoreBeforeSelect) onBeforeSelectRestore(self); // Finish pending restore first, so a prevented pick is not treated as typed text
		const match = self._singleTypingMatch || dispatchMatch(self);
		preventSubmit(control); // Prevent submitting form as we want to preform a match instead
		dispatchSelect(self, match, multiple);
	}
	if (e.key === "Tab" && !e.shiftKey && clear && control?.value) {
		e.preventDefault(); // Prevent default tab as we are moving into clear
		attr(clear, "aria-hidden", "false"); // Allow screen readers to announce clear button as we are focusing it
		attr(clear, "tabindex", "0"); // Needed to prevent Safari from looping focus back to input on text Tab-press
		clear.focus(FOCUS_VISIBLE); // Focus element, and show focus ring
		on(clear, "blur", () => syncButtonsWithInput(self), EVENT_ONCE); // Revert on next blur
	}
};

const onKeyDownItems = (self: UHTMLComboboxElement, event: KeyboardEvent) => {
	const { clear, control, items } = self;
	const { key, repeat, target } = event;
	const index = [...items].indexOf(target as HTMLDataElement);
	const isKeyClick = key === " " || key === "Enter";

	if (isKeyClick && (items[index] || target === clear)) {
		(items[index] || clear)?.click(); // Trigger click to ensure consistent behavior with mouse and screen readers
		return event.preventDefault(); // Prevent scrolling or submitting
	}
	if (!items[index]) return;
	if (key.startsWith("Arrow")) event.preventDefault(); // Prevent sideways scroll
	if (key === "ArrowLeft") return items[index - 1]?.focus(FOCUS_VISIBLE);
	if (key === "ArrowRight")
		return (items[index + 1] || control)?.focus(FOCUS_VISIBLE);
	if (key === "Backspace") {
		event.preventDefault(); // Prevent navigating away from page
		return repeat || dispatchSelect(self, items[index]);
	}
	control?.focus(); // Move focus when typing any character
};

const onMutations = (self: UHTMLComboboxElement, edit?: MutationRecord[]) => {
	if (!self.control) return;
	const { _texts, control, items, list, multiple, toggle } = self;

	// Frameworks re-write attributes on render (i.e. Vue sets option value, React syncs input value), which is not a state change
	if (edit?.every((r) => isNoopAttribute(r, control))) return;

	const edits: Node[] = [];
	for (const { addedNodes: add, removedNodes: del } of edit || []) {
		for (const el of add) if (el.nodeName === "DATA") edits.unshift(el); // Added nodes to the front
		for (const el of del) if (el.nodeName === "DATA") edits.push(el); // Removed nodes to the back
	}

	const focus = getFocusedElement(self);
	const doSpeak = multiple ? edits.length === 1 : edits[0] === focus; // Only speak in single mode if item is visible and focused
	if (doSpeak && self.contains(focus)) {
		const label = control ? attr(control, ARIA_LABEL) : null; // Store so we can revert after announcement
		self._speak = `${_texts[edits[0].isConnected ? "added" : "removed"]} ${getText(edits[0])}, `; // Updates aria-labels
		attr(control, ARIA_LABEL, `${self._speak}${getInputLabel(control)}`); // Make sure control also can aria-label-announce
		if (!self._focusMoved) setTimeout(() => speak(self._speak.slice(0, -2))); // Aria-live when no focus move, remove trailing command, setTimeout to take presence
		setTimeout(speakReset, 300, self, label); // 300ms delay so screen readers announces new aria-label. Note: Causes short double/hiccup announce in NVDA Firefox
	}

	syncItems(self);
	syncButtonsWithInput(self);
	syncOptionsWithItems(self);
	syncSelectWithItems(self);

	// Forward aria-expanded to toggle button, and keep aria-expanded="false" if no list to make it CSS selectable
	if (toggle) {
		const expanded = !!list && list.nodeName !== "DATALIST" && !list.hidden;
		attr(toggle, "aria-expanded", `${expanded}`);
	}

	const hint = `${items.length ? _texts.found.replace("%d", `${items.length}`) : _texts.empty}`;
	attr(control, "aria-description", multiple ? hint : null);
	attr(control, "list", useId(list)); // Connect datalist and input
	attr(self._listbox, ARIA_LABEL, _texts.items);
	self._umutate?.takeRecords(); // Clear mutation records caused by our own attribute writes. Must run before dispatching events below, so consumer mutations made in event handlers are kept

	// Sync input with item in single mode with list, but only if item text has actually changed. Runs last as it dispatches events
	if (!multiple && list) {
		const prev = self._itemSingleValue;
		const next = getText(items[0]);
		self._itemSingleValue = next;

		if (next === prev) return;
		if (prev !== undefined) return syncInputWithItemSingleMode(self);

		// First sync is deferred, as frameworks write their bound input value after insertion (Vue v-model mounted, Angular ngModel) or ignore events during render (React commit)
		Promise.resolve().then(() => {
			if (self.isConnected) syncInputWithItemSingleMode(self);
		});
	}
};

const speakReset = (self: UHTMLComboboxElement, label: string | null) => {
	self._speak = "";
	if (self.control) attr(self.control, ARIA_LABEL, label); // Revert aria-label to original value after announcement
	syncItems(self);
};

const syncItems = (self: UHTMLComboboxElement) => {
	const { _listbox, _texts, _speak, items, multiple } = self;

	let idx = 0;
	for (const item of items) {
		const text = `${_speak}${getText(item)}, ${_texts.remove}${IS_IOS ? `, ${++idx} ${_texts.of} ${items.length}` : ""}`;
		attr(item, ARIA_LABEL, text);
		attr(item, "hidden", multiple ? null : ""); // Avoid ARC Toolkit warning in single mode
		attr(item, "role", "option");
		attr(item, "slot", "items");
		attr(item, "tabindex", "-1");
		attr(item, "value", getValue(item)); // u-option might not be initialized yet
	}
	attr(_listbox, "hidden", items.length ? null : ""); // Hide when empty to avoid Siteimprove warning about empty role="listbox"
};

const syncSelectWithItems = (self: UHTMLComboboxElement) => {
	if (!self._select?.isConnected) self._select = self.querySelector("select");
	if (!self._select) return;
	const { _select, items, multiple } = self;
	let append: DocumentFragment | undefined; // Speed up by running all appends in one go after the loop
	let idx = 0;

	attr(_select, "multiple", multiple ? "" : null); // Forward multiselect
	for (const item of items) {
		const option = _select?.options[idx++]; // Use existing option if available
		const text = getText(item);
		const value = getValue(item); // u-option might not be initialized yet

		if (!option) {
			if (!append) append = document.createDocumentFragment();
			append.appendChild(new Option(text, value, true, true));
		} else
			Object.assign(option, {
				defaultSelected: true,
				selected: true,
				text,
				value,
			});
	}
	if (append) _select.appendChild(append);
	else for (const opt of [..._select.options].slice(idx)) opt.remove(); // Remove unused options
	self._umutate?.takeRecords(); // Clear mutation records caused by adding/removing <option> elements
};

const syncButtonsWithInput = (self: UHTMLComboboxElement) => {
	const { clear, control, toggle, list } = self;
	const isIdle = !control?.value || control?.disabled || control?.readOnly;
	if (clear?.nodeName === "DEL") attr(clear, "role", "button"); // Backwards compatibility for older versions using <del> as clear button
	if (clear) {
		const focused = clear === getFocusedElement(self); // Keep focusable and visible to screen readers while focused after tabbing to clear, as closing the datalist triggers a sync
		attr(clear, ARIA_LABEL) || attr(clear, ARIA_LABEL, self._texts.clear); // Set default aria-label if not set by consumer
		attr(clear, "aria-hidden", focused ? FALSE : `${IS_IOS || IS_ANDROID}`); // Hide from screen readers to keep datalist open on swipe right navigation
		attr(clear, "hidden", isIdle ? "" : null);
		attr(clear, "tabindex", focused ? "0" : "-1");
	}
	if (toggle) {
		// Show toggle only if idle and <u-datalist> is present, as native <datalist> can not be opened programmatically
		const show = isIdle && list && list?.nodeName !== "DATALIST";
		attr(toggle, ARIA_LABEL) || attr(toggle, ARIA_LABEL, self._texts.toggle); // Set default aria-label if not set by consumer
		attr(toggle, "aria-hidden", `${IS_IOS || IS_ANDROID}`); // Hide from screen readers to keep datalist open on swipe right navigation
		attr(toggle, "hidden", show ? null : "");
		attr(toggle, "tabindex", "-1");
		attr(toggle, "type", "button"); // Prevent submit
	}
};

const syncOptionsWithItems = (self: UHTMLComboboxElement) => {
	if (!self.list) return;
	const { _texts, list, multiple, options, values } = self;
	attr(list, "data-sr-of", _texts.of); // Forward of text
	attr(list, SAFE_MULTISELECTABLE, `${multiple}`); // Forward multiselect
	for (const opt of options) setSelected(opt, values.includes(getValue(opt))); // u-option might not be initialized yet
};

// TODO: aria-required="true" => setCustomValidity
const syncInputWithItemSingleMode = (self: UHTMLComboboxElement) => {
	if (!self.control || !self.list || self.multiple) return; // No need to sync input value if multiple or no datalist (free text)
	const { control, items } = self;
	const value = getText(items[0]);
	const action = value ? "insertText" : "deleteContentBackward";
	if (value !== control.value) setValue(control, value, action); // Prevent input event being handled as "click" on option
};

const isNoopAttribute = (r: MutationRecord, control: Element) =>
	r.type === "attributes" &&
	((r.target === control && r.attributeName === "value") || // Controlled inputs sync the value attribute on every keystroke
		r.oldValue === (r.target as Element).getAttribute(r.attributeName || "")); // Same value written again

// Helpers (some since u-option might not be initialized yet)
const getLabel = (el: Element) => attr(el, "label") ?? getText(el);
const getValue = (el: Element) => attr(el, "value") ?? getText(el);
const getItem = (el: Element) => ({ label: getLabel(el), value: getValue(el) });
const getOption = ({ options }: UHTMLComboboxElement, value?: string) =>
	!!value && [...options].find((o) => getValue(o) === value);

const setSelected = (el: Element, selected: boolean) =>
	attr(el, "selected", selected ? "" : null);
const getSelected = (el: HTMLOptionElement) =>
	el.selected ?? el.hasAttribute("selected");

const isLegacyDatalistClick = (e: Partial<InputEvent>) =>
	!e.isTrusted && e instanceof InputEvent && e.inputType === ""; // <u-datalist> before 2.0.3 used setValue without inputType, for both beforeinput and input

const isDatalistClick = (self: UHTMLComboboxElement, e: Partial<InputEvent>) =>
	e.inputType === "insertReplacementText" || // Firefox native <datalist> and <u-datalist>
	(isLegacyDatalistClick(e) && self._valueSkipProgrammatic) || // Legacy click always dispatches beforeinput first, which sets the flag. Synthetic input events from tests and libraries do not
	(e.isTrusted && !e.inputType && !!getOption(self, self.control?.value)); // WebKit and Chrome native <datalist> use Event (not InputEvent), but so does type="search" clear and autofill, so require an option value

// Respond to programmatic input.value changes, but only register once
if (isBrowser() && !window.customElements.get("u-combobox")) {
	const proto = HTMLInputElement.prototype;
	const descriptor = Object.getOwnPropertyDescriptor(proto, "value");

	if (descriptor?.set)
		Object.defineProperty(proto, "value", {
			...descriptor,
			set(this: HTMLInputElement, next: string) {
				const parent = this.parentElement as UHTMLComboboxElement | null; // <input> must be a direct child of <u-combobox>
				const prev = this.value;
				descriptor.set?.call(this, next); // Call the original native setter to actually update the DOM

				if (prev !== this.value) parent?._onComboboxProgrammaticInput?.(this); // Compare actual values as next might be number or null
			},
		});
}

customElements.define("u-combobox", UHTMLComboboxElement);
