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
	getRoot,
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

/**
 * SPECIFICATION
 *
 * Vocabulary
 * - item:         a <data> inside <u-combobox>. Single mode has at most one item, multiple mode has any number
 * - option:       an <option> inside the <datalist> / <u-datalist>
 * - text:         the current input value
 * - cached text:  the text last seen from typing, the value attribute or the value property (_value).
 *                 Not updated by the clear button in single mode, so a prevented remove can revert input to the text before the clear
 * - same text:    text equals an item's text, trimmed and case-insensitive. Compared against items, never against options
 * - match:        dispatch comboboxbeforematch with the first option whose label equals the trimmed text case-insensitive.
 *                 The consumer can prevent and set option.selected to pick another option. The result is the matched option,
 *                 or a new item made from the text when creatable and no option matched, or nothing.
 *                 Match is never dispatched for empty text, and never without a datalist (creatable still creates from the text)
 * - select:       dispatch comboboxbeforeselect with the item to add or remove.
 *                 Accepted: the DOM is changed and comboboxafterselect is dispatched. Prevented: the DOM is unchanged
 * - toggle:       multiple mode select: removes the item if its value is already an item, otherwise adds it
 * - replace:      single mode select: removes the current item (if any) and adds the new one
 * - sync input:   set text to the item's text, or empty when there is no item. Only in single mode with a datalist,
 *                 and only when the text differs. Never dispatches match or select
 * - revert input: set text back to the cached text
 *
 * Mount and item mutations (connectedCallback, <data> added/removed/changed, <input> replaced, data-multiple changed)
 * - Single:   sync input. The first sync after mount is deferred one microtask so frameworks can write their bound value first.
 *             A prefilled text without an item is therefore cleared on mount
 * - Multiple: text is kept as filter text
 * - Both:     option.selected mirrors the items, <select> (if present) mirrors the items, added/removed items are announced
 *
 * Typing and programmatic text (input event, value attribute, value property)
 * - Both:     cache text, sync clear and toggle buttons. Never match, never select
 * - Except:   in single mode, the input event dispatched by the clear button does not cache text (see Clear button)
 *
 * Datalist pick (option click, or Enter on an option in <u-datalist>)
 * - Both:     revert input, then select the option. Never match. Picking <option value=""> only reverts input
 * - Single:   replace. Accepted: sync input. Prevented: the reverted text stays until blur. Picking the current item only syncs input
 * - Multiple: toggle. Text is not changed
 *
 * Enter in input (form submit is prevented when a datalist is present or creatable)
 * - Empty text
 *   - Single:   select to remove the item, if any. Accepted: remove and sync input. Prevented: revert input
 *   - Multiple: announce invalid value
 * - Same text as an item
 *   - Single:   sync input
 *   - Multiple: select to remove that item. Accepted: remove. Prevented: nothing
 * - Other text
 *   - Both:     match
 *   - Single:   no result: announce invalid value, typed text stays until blur. Result equal to the current item: sync input.
 *               Otherwise replace. Accepted: sync input. Prevented: nothing, typed text stays until blur
 *   - Multiple: no result: announce invalid value. Otherwise toggle. Text is not changed
 *
 * Blur (focus leaves <u-combobox>; pointer down inside does not count as blur)
 * - Multiple: nothing
 * - Single + empty text:  select to remove the item, if any. Accepted: remove. Prevented: sync input
 * - Single + same text:   sync input
 * - Single + other text:  match. No result: sync input. Result equal to the current item: sync input.
 *                         Otherwise replace. Accepted: sync input. Prevented: sync input
 *
 * Clear button (button[type="reset"])
 * - Both:     empty the text (dispatches input), focus input, re-open the list if it was open
 * - Single:   the cached text is not updated, then behave as Enter with empty text, so a prevented remove reverts input to the text before the clear
 * - Multiple: the emptied text is cached like typing, and stays as nothing is selected or removed
 *
 * Toggle button (button[aria-expanded])
 * - Both:     focus input and open the list if it was closed
 *
 * Items (chips)
 * - ArrowLeft or Backspace at caret start in input: focus the last item
 * - ArrowLeft / ArrowRight on an item: focus previous / next item. ArrowRight on the last item focuses input
 * - Click, Enter, Space or Backspace on an item: focus moves to the previous item, else next item, else input,
 *   then select to remove. Accepted: remove (single: sync input). Prevented: item stays, focus stays moved
 * - Any other key on an item: focus input
 * - Tab from input with non-empty text: focus the clear button, if present
 *
 * Form reset
 * - Both:     the browser restores the input, cached text is updated. Items are not form controls and are not reset
 * - Single:   sync input
 *
 * Runtime mode change
 * - data-multiple removed: the first item is the item, extra <data> are kept in DOM but not mirrored. Sync input
 * - data-multiple added:   all <data> are items. Text is kept
 * - data-creatable:        only affects the next match
 *
 * Always
 * - Disabled or readonly input: every action above is ignored
 * - No datalist: free text. Input is never synced, match is never dispatched
 *
 * | Action       | Single                                                    | Multiple                              |
 * | :----------- | :-------------------------------------------------------- | :------------------------------------ |
 * | Pick         | Revert input -> replace -> sync input                     | Revert input -> toggle                |
 * | Type         | Cache text                                                | Cache text                            |
 * | Enter empty  | Remove item                                               | Announce invalid                      |
 * | Enter same   | Sync input                                                | Remove item                           |
 * | Enter other  | Match -> replace/create -> sync, else announce, keep text | Match -> toggle/create, else announce |
 * | Blur empty   | Remove item                                               | Nothing                               |
 * | Blur same    | Sync input                                                | Nothing                               |
 * | Blur other   | Match -> replace/create -> sync, else sync input          | Nothing                               |
 */

declare global {
	interface Window {
		uComboboxes?: WeakSet<typeof UHTMLComboboxElement>;
	}
	interface HTMLElementTagNameMap {
		"u-combobox": UHTMLComboboxElement;
	}
	interface GlobalEventHandlersEventMap {
		comboboxafterselect: CustomEvent<HTMLDataElement>;
		comboboxbeforematch: CustomEvent<HTMLOptionElement | undefined>;
		comboboxbeforeselect: CustomEvent<HTMLDataElement>;
	}
}

export const UHTMLComboboxStyle = `${DISPLAY_BLOCK}
[part="items"]:not([hidden]) { display: inline-flex; flex-wrap: wrap } /* Can not be "contents" as this confuses VoiceOver */
:host(:not([data-multiple])) [part="items"],
:host([data-multiple="false"]) [part="items"] { display: none }
::slotted(button[type="reset"]),
::slotted(button[aria-expanded]) { font: inherit; border: 0; padding: 0; background: none; color: inherit; cursor: pointer; text-decoration: none }
::slotted(data) { cursor: pointer; pointer-events: none }
::slotted(data)::after { padding-inline: .5ch; pointer-events: auto }
::slotted(data)::after,
::slotted(button[type="reset"]:empty)::before { content: '\\00D7'; content: '\\00D7' / '' }
::slotted(button[aria-expanded="false"]:empty)::before { content: '\\25BC'; content: '\\25BC' / '' }
::slotted(button[aria-expanded="true"]:empty)::before { content: '\\25B2'; content: '\\25B2' / '' }
::slotted(data:focus),::slotted(button[type="reset"]:focus) { ${FOCUS_OUTLINE} }`;

export const UHTMLComboboxShadowRoot =
	declarativeShadowRoot(UHTMLComboboxStyle);

const COMBOBOXES = new WeakSet<UHTMLComboboxElement>(); // Respond to programmatic input.value changes
const ATTR_MULTI = "data-multiple";
const ARIA_LABEL = "aria-label";
const CSS_CLEAR = `button[type="reset"]`;
const CSS_TOGGLE = `button[aria-expanded]`;
const CSS_DATALIST = `datalist,u-datalist,[role="listbox"]`;
const CSS_OPTION = `option,u-option,[role="option"]`;
const FOCUS_VISIBLE = { focusVisible: true };
const EVENTS = "blur change focus click input keydown pointerdown";
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
	_root?: Document | ShadowRoot; // Root at connect, to listen for form reset events
	_select?: HTMLSelectElement | null;
	_toggle?: HTMLElement | null;
	_focusMoved?: boolean; // Used to determine if we announce through aria-live or aria-label when items are added or removed
	_speak = "";
	_texts = { ...TEXTS };

	_listHidden?: boolean;
	_skipChange?: boolean; // Set when a datalist click was reverted, to stop the change event the datalist dispatches right after
	_singleItem?: string | null; // Item value and text to detect item change in single mode. Null when no item, undefined until first sync so the first run always syncs
	_value?: string; // Cache value to be able to revert on datalist click

	static get observedAttributes() {
		return [ATTR_MULTI, ...Object.keys(TEXTS).map((key) => `data-sr-${key}`)]; // Using ES2015 syntax for backwards compatibility
	}

	constructor() {
		super();
		const root = attachStyle(this, UHTMLComboboxStyle);
		this._listbox = root.querySelector('[role="listbox"]') || tag("div"); // Respect shadowDOM from template if existing
		this._listbox.querySelector('slot[name="items"]') ||
			this._listbox.append(tag("slot", { name: "items" })); // Avoid innerHTML to comply with Trusted Types CSP
		attr(this._listbox, "aria-orientation", "horizontal");
		attr(this._listbox, "role", "listbox");
		attr(this._listbox, "part", "items");
		attr(this._listbox, "tabindex", "-1"); // Prevent tabstop even if consumer sets overflow: auto (https://issues.chromium.org/issues/40456188)
		root.insertBefore(this._listbox, root.firstChild); // Make sure listbox is first
	}
	connectedCallback() {
		COMBOBOXES.add(this);
		this._root = getRoot(this);
		this._umutate = onMutation(this, onMutations, {
			attributeFilter: ["aria-expanded", "id", "role", "value"],
			attributeOldValue: true, // Needed to ignore no-op attribute writes from frameworks
			attributes: true,
			characterData: true, // Respond to changes in <data> textContent
			childList: true,
			subtree: true,
		});
		on(this, EVENTS, this, true); // Bind events using capture phase to run before frameworks
		on(this._root, "reset", this, true); // Form reset does not dispatch input or call the value setter, so listen on the root as reset targets the form
	}
	attributeChangedCallback(prop: string, prev?: string, next?: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = next || TEXTS[text]; // Cache text attributes for performance
		if (text === "clear" && this.clear)
			attr(this.clear, ARIA_LABEL, this._texts.clear); // Backwards compatbile only update clear aria-label if data-sr-clear is set
		if (prop === ATTR_MULTI && this._umutate) {
			const wasMultiple = (prev ?? FALSE) !== FALSE;
			if (wasMultiple === this.multiple) return; // Ignore writes that do not change mode (i.e. null to "false" from frameworks) and changes before connect
			onMutations(this); // Re-sync on mode change
			if (!this.multiple) syncInputWithItemSingleMode(this); // Input may hold filter text from multiple mode while cached item text is unchanged, so onMutations skips the sync
		}
	}
	disconnectedCallback() {
		off(this, EVENTS, this, true);
		if (this._root) off(this._root, "reset", this, true);
		COMBOBOXES.delete(this);
		this._umutate?.();
		// biome-ignore format: next-line
		this._listHidden = this._focusMoved = this._skipChange = this._root = this._umutate = this._clear = this._toggle = this._control = this._select = this._options = this._items = this._list = this._singleItem = this._value = undefined;
	}
	handleEvent(event: Event) {
		if (this.control?.disabled || this.control?.readOnly) return;
		if (event.type === "blur") onBlur(this);
		if (event.type === "change") onChange(this, event);
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "focus") speak(); // Prepare for aria-live announcements
		if (event.type === "input") onInput(this, event);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "pointerdown") {
			this._listHidden = !!this.list?.hidden;
			isPointerDown(this, event); // Prevent unwanted blur when pressing items with tabindex="-1"
		}
		if (event.type === "reset" && event.target === this.control?.form)
			setTimeout(onReset, 0, this); // Controls are reset after the reset event has dispatched, so defer
	}
	get multiple() {
		return (attr(this, ATTR_MULTI) ?? FALSE) !== FALSE; // Allow data-multiple="false" to be more React friendly
	}
	set multiple(value: boolean) {
		attr(this, ATTR_MULTI, value ? "" : null);
	}
	get creatable() {
		return (attr(this, "data-creatable") ?? FALSE) !== FALSE; // Allow data-creatable="false" to be more React friendly
	}
	set creatable(value: boolean) {
		attr(this, "data-creatable", value ? "" : null);
	}
	get control(): HTMLInputElement | null {
		if (!this._control?.isConnected) {
			this._control = this.querySelector("input");
			this._value = this._control?.value; // Cache initial value
			this._singleItem = undefined; // Treat as first sync, so a replaced input receives the item text in single mode
		}
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
		const values = Array.from(this.items, ({ value }) => value);
		return this.multiple ? values : values.slice(0, 1); // Never return more than 1 in single mode
	}
}

const dispatchMatch = (self: UHTMLComboboxElement) => {
	const { creatable, control, options, list } = self;
	const label = control?.value?.trim() || "";
	const find = label.toLowerCase() || null; // Fallback to null to prevent matching empty values
	let match: HTMLOptionElement | undefined;

	if (list) {
		match = [...options].find((o) => getLabel(o).trim().toLowerCase() === find);
		const event = { bubbles: true, cancelable: true, detail: match };

		if (!self.dispatchEvent(new CustomEvent("comboboxbeforematch", event)))
			match = [...options].find(getSelected); // Only match first selected option if custom matching

		syncOptionsWithItems(self); // Keep option selection on the current items, as consumer can change option.selected in comboboxbeforematch. The matched option is selected by onMutations once its <data> is added, so a prevented or restored select never leaves a stale selection
	}

	if (!match && creatable && label) return { value: label, label, creatable }; // Return creatable value as match if no match and creatable
	return match && { ...getItem(match), creatable: false };
};

const dispatchSelect = (
	self: UHTMLComboboxElement,
	item?: { value: string; label?: string },
	canRemove = true,
	canRevert = true, // Datalist pick keeps the typed text when prevented, as blur reverts to the item text
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
	} else if (!multiple && canRevert) revertSingleSelect(self);
};

// Restore input to the item text after a prevented select in single mode. Needed by Enter, blur and clear,
// as all of them leave typed or emptied text in the input
const revertSingleSelect = (self: UHTMLComboboxElement) => {
	const prev = self._singleItem; // Restore only if the consumer did not change the item, as a changed item is already synced by onMutations and a restore would overwrite later programmatic input
	const { port1, port2 } = new MessageChannel();
	// Deferred, as frameworks render the <data> they control asynchronously, and restoring first would flash the previous value.
	// Vue, Svelte and Angular commit in a microtask. React schedules updates made outside its own event system in a microtask
	// that posts a MessageChannel task, so posting our message from a later microtask runs after that render, as the posted
	// message task source is FIFO. setTimeout and requestAnimationFrame give no such guarantee, as the browser may run a frame before pending tasks
	port1.onmessage = () => {
		port1.close();
		if (self.isConnected && self._singleItem === prev)
			syncInputWithItemSingleMode(self);
	};
	Promise.resolve().then(() => port2.postMessage(0));
};

const onBlur = (self: UHTMLComboboxElement) =>
	isPointerDown(self) || setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element

const onBlurred = (self: UHTMLComboboxElement) => {
	const { control, multiple, options } = self;
	if (multiple || !control || !self.isConnected) return; // Nothing to do in multiple mode, or if unmounted before the blur timeout
	if (self.contains(getFocusedElement(self))) return; // Focus is still inside
	if (hasItemText(self)) return; // Input already reflects the item, so nothing to match
	const exactMatch = [...options].find((o) => getLabel(o) === control?.value);
	dispatchSelect(self, exactMatch && getItem(exactMatch), false);
};

const onReset = (self: UHTMLComboboxElement) => {
	if (!self.isConnected) return;
	onProgrammatic(self); // Cache the restored value and sync buttons
	syncInputWithItemSingleMode(self); // Items are not form controls, so they are not reset, and single mode keeps mirroring the item
};

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	const { clear, control, items, toggle, multiple } = self;
	const hasHiddenDatalist = self._listHidden ?? !!self.list?.hidden; // Fall back to live state for programmatic clicks
	const isSelf = target === self;
	self._listHidden = undefined; // Reset so next click without pointerdown reads live state

	if (toggle?.contains(target as Node)) {
		control?.focus();
		if (hasHiddenDatalist) control?.click();
	}

	if (control && clear?.contains(target as Node)) {
		event.preventDefault(); // Prevent button[type="reset"]
		setValue(control, "", "deleteContentBackward");
		if (!multiple) dispatchSelect(self); // Instantly trigger removal if single mode
		control.focus();
		return hasHiddenDatalist || control.click(); // Open list if it was open before clicking clear
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

const onProgrammatic = (self: UHTMLComboboxElement) => {
	self._value = self.control?.value; // Update cache
	syncButtonsWithInput(self);
};

const onChange = (self: UHTMLComboboxElement, event: Event) => {
	if (self._skipChange) event.stopImmediatePropagation(); // Stop change for a reverted value, as nothing changed for the consumer. The synced value dispatches its own change
	self._skipChange = false;
};

const onInput = (self: UHTMLComboboxElement, e: Partial<InputEvent>) => {
	const { control, options, multiple } = self;
	const value = control?.value || "";
	const isReplace = e.inputType === "insertReplacementText"; // Firefox native <datalist> and <u-datalist>, but also spell check and autofill
	const isClick = isReplace || (e.isTrusted && !e.inputType); // WebKit and Chrome native <datalist> use Event (not InputEvent), but so does type="search" clear and autofill
	const canMatch = isClick && (value || isReplace); // Only <u-datalist> click on <option value=""> has an empty value, as type="search" clear has no inputType either
	const match = canMatch && [...options].find((o) => getValue(o) === value); // Only accept as option click if value corresponds to an option, avoiding false positives on spell check or autofill

	if (match && control) {
		e.stopImmediatePropagation?.(); // Prevent input as dispatchSelect will trigger input if needed
		self._skipChange = true; // Stop the change the datalist dispatches next, see onChange
		setTimeout(() => (self._skipChange = false)); // In case no change follows
		setValue(control, self._value || "", false); // Revert input value as we allow the user to event.preventDefault in comboboxbeforeselect
		if (value) dispatchSelect(self, getItem(match), multiple, false); // Clicking a <option value=""> should not cause select
	} else self._value = value; // Typed text, and also replacement text without an option value (i.e. Firefox spell check or autofill), so a later click reverts to it

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
		preventSubmit(control); // Prevent submitting form as we want to preform a match instead
		if (multiple) dispatchSelect(self, dispatchMatch(self), true);
		else if (!hasItemText(self))
			dispatchSelect(self, dispatchMatch(self), false); // Matches against the options present now, so no state is kept while typing
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
	if (edit?.every(isNoopAttribute, self)) return;
	if (edit?.some(isControlValueChange, self)) self._value = control.value; // Attribute changed a pristine input without hitting the prototype setter

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

	// Sync input with item in single mode with list, but only if item has actually changed. Runs last as it dispatches events
	if (!multiple && list) {
		const prev = self._singleItem;
		const next = items[0]
			? `${getValue(items[0])}\n${getText(items[0])}`
			: null; // Key on value and text, as a datalist pick between options with equal labels only changes the value
		self._singleItem = next;

		// First sync is deferred, as frameworks write their bound input value after insertion (Vue v-model mounted, Angular ngModel) or ignore events during render (React commit)
		// Using Promise.resolve() and not setTimeout() as this ensures deferral without a browser painted frame inbetween
		if (prev === undefined)
			Promise.resolve().then(() => {
				if (self.isConnected) syncInputWithItemSingleMode(self);
			});
		else if (prev !== next) syncInputWithItemSingleMode(self);
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
	const defaultSelected = true;
	const selected = true;
	let append: DocumentFragment | undefined; // Speed up by running all appends in one go after the loop
	let idx = 0;

	attr(_select, "multiple", multiple ? "" : null); // Forward multiselect
	for (const item of items) {
		if (idx && !multiple) break; // Single mode mirrors only the first item, matching the input. A single <select> would otherwise submit the last one. Extra <data> are kept for a later switch back to multiple
		const option = _select?.options[idx++]; // Use existing option if available
		const text = getText(item);
		const value = getValue(item); // u-option might not be initialized yet

		if (option)
			Object.assign(option, { defaultSelected, selected, text, value });
		else {
			if (!append) append = document.createDocumentFragment();
			append.appendChild(new Option(text, value, true, true));
		}
	}
	if (append) _select.appendChild(append);
	else for (const opt of [..._select.options].slice(idx)) opt.remove(); // Remove unused options
	self._umutate?.takeRecords(); // Clear mutation records caused by adding/removing <option> elements
};

const syncButtonsWithInput = (self: UHTMLComboboxElement) => {
	const { clear, control, toggle, list } = self;
	const isIdle = !control?.value || control?.disabled || control?.readOnly;
	if (clear) {
		const focused = !isIdle && clear === getFocusedElement(self); // Keep focusable and visible to screen readers while focused after tabbing to clear, as closing the datalist triggers a sync. Never while idle, as setting hidden on the focused clear blurs it synchronously in Chromium, re-entering this sync before the outer call writes its stale focused state
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
	const { _texts, list, multiple, values, options } = self;
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

function isNoopAttribute(this: UHTMLComboboxElement, r: MutationRecord) {
	if (r.type !== "attributes") return false;
	const next = (r.target as Element).getAttribute(r.attributeName as string);
	if (r.target === this.control && r.attributeName === "value")
		return next === (this._value ?? ""); // Controlled inputs mirror the value attribute on every keystroke, so only treat as change if differing from the value we have seen (i.e. attribute set on pristine input)
	return r.oldValue === next; // Same value written again
}

function isControlValueChange(this: UHTMLComboboxElement, r: MutationRecord) {
	return r.target === this.control && r.attributeName === "value";
}

// Helpers
const hasItemText = ({ control, items }: UHTMLComboboxElement) =>
	!!items[0] && control?.value === getText(items[0]); // Input already reflects the item (i.e. after option click). Compares against the item and not the options, so options with equal labels or options replaced by a fetch can not change a committed value
const getLabel = (el: Element) => attr(el, "label") ?? getText(el);
const getValue = (el: Element) => attr(el, "value") ?? getText(el);
const getItem = (el: Element) => ({ label: getLabel(el), value: getValue(el) });
const getSelected = (el: HTMLOptionElement) =>
	el.selected ?? el.hasAttribute("selected");
const setSelected = (el: Element, selected: boolean) =>
	attr(el, "selected", selected ? "" : null);

// Respond to programmatic input.value changes
if (isBrowser() && !window.uComboboxes?.has(UHTMLComboboxElement)) {
	window.uComboboxes ??= new WeakSet(); // Support hot module reload, and several versions on same page
	window.uComboboxes.add(UHTMLComboboxElement);
	const proto = HTMLInputElement.prototype;
	const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
	const set = function (this: HTMLInputElement, next: string) {
		const parent = this.parentElement as UHTMLComboboxElement;
		const prev = this.value; // Compare actual values as next might be number or null
		descriptor?.set?.call(this, next); // Call the original native setter to actually update the DOM
		if (prev !== this.value && parent && COMBOBOXES.has(parent))
			onProgrammatic(parent);
	};
	Object.defineProperty(proto, "value", { ...descriptor, set });
}

customElements.define("u-combobox", UHTMLComboboxElement);
