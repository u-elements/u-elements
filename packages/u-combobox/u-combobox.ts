import {
	afterRender,
	ariaNotify,
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	declarativeShadowRoot,
	dispatchChange,
	EVENT_ONCE,
	getFocused,
	getInputLabel,
	getRoot,
	getText,
	IS_ANDROID,
	IS_IOS,
	isBrowser,
	off,
	on,
	onFocusLeave,
	onMutation,
	preventSubmit,
	SAFE_MULTISELECTABLE,
	setValue,
	srText,
	tag,
	UHTMLElement,
	useId,
} from "../utils";
import { version } from "./package.json";

/**
 * SPECIFICATION
 *
 * Vocabulary
 * - item:         a <data> inside <u-combobox>. Single mode has at most one item, multiple mode has any number
 * - option:       an <option> inside the <datalist> / <u-datalist>
 * - text:         the current input value
 * - cached text:  the text last seen from typing, the value attribute or the value property (_value). Only used to revert a datalist pick,
 *                 as the pick has already written the option value when its input event dispatches. The clear button reads the text itself before clearing
 * - same text:    trimmed text equals an item's text, case sensitive. Compared against items, never against options.
 *                 Only used by blur, as the item is an already confirmed selection. Enter always matches against the options.
 * - announce:     announce --sr-invalid through the live region. Skipped while the datalist has aria-busy="true",
 *                 as the options are still loading
 * - match:        dispatch comboboxbeforematch with the first enabled and non-hidden option whose label equals the trimmed text case-insensitive. Only on Enter and blur, never while typing.
 *                 Options keep mirroring the items while the event dispatches. Prevented means custom matching: the result is the first option with option.selected,
 *                 so the consumer must set option.selected on every option to pick another option, or deselect every option to reject the match.
 *                 The result is the matched option, or a new item made from the text when creatable and no option matched (Enter only, never blur), or nothing.
 *                 Match is never dispatched for empty text, and never without a datalist (creatable still creates from the text on Enter)
 * - select:       dispatch comboboxbeforeselect with the item to add or remove.
 *                 Accepted: the DOM is changed and comboboxafterselect is dispatched. Prevented: the DOM is unchanged
 * - toggle:       multiple mode select: removes the item if its value is already an item, otherwise adds it
 * - replace:      single mode select: removes every <data>, then adds the new item. A removal only removes.
 *                 Extra <data> kept from multiple mode are therefore dropped on the first select, as single mode holds at most one item
 * - sync input:   set text to the item's text, or empty when there is no item. Only in single mode with a datalist,
 *                 and only when the text differs. Dispatches input, and change only when the sync follows a user commit
 *                 (pick, Enter, blur, clear, item removal), never on mount, programmatic item changes or form reset.
 *                 Also when reverting to an unchanged item, as the browser has already dispatched its own change with the typed text
 *                 before the deferred blur handling, so the last change must carry the final text. Never dispatches match or select
 * - revert input: set text back to the cached text, as a datalist pick has already written the option value. Dispatches nothing
 * - commit:       a select from a user action. The item change that follows syncs the input with change and settles it, also when the consumer
 *                 prevented and renders the item itself (controlled mode). Otherwise it settles after the render opportunity (one microtask, then one MessageChannel task).
 *                 Settling runs the blur or clear fallback, and a later programmatic item change then dispatches no change.
 *                 A consumer deferring the render beyond that (i.e. React startTransition, a debounced state update) is a programmatic item change
 *
 * Mount and item mutations (connectedCallback, <data> added/removed/changed, <input> replaced, data-multiple changed)
 * - Single:   sync input. The first sync after mount is deferred one microtask so frameworks can write their bound value first.
 *             A prefilled text without an item is therefore cleared on mount
 * - Multiple: text is kept as filter text
 * - Both:     option.selected mirrors the items, <select> (if present) mirrors the items, added/removed items are announced
 *
 * Typing and programmatic text (input event, value attribute, value property)
 * - Both:     cache text, sync clear and toggle buttons. Never match, never select
 *
 * Datalist pick (option click, or Enter on an option in <u-datalist>)
 * - Both:     keep the text, then select the option. Never match. Picking <option value=""> only keeps the text.
 *             Both <u-datalist> and native <datalist> write the option value before dispatching input, so the pick is reverted in input and the event is stopped,
 *             as neither dispatches beforeinput. See onInput for how a pick is told apart from typing, autofill, spell check and the type="search" clear button.
 *             <u-datalist> cancels mousedown inside the list, so the press never blurs the input and the browser never dispatches change with the typed text
 * - Single:   replace. Accepted: sync input. Prevented: the text stays until blur. Picking the current item only syncs input
 * - Multiple: toggle. Text is not changed
 *
 * Enter in input (form submit is prevented when a datalist is present or creatable)
 * - Empty text
 *   - Single:   select to remove the item, if any. Accepted: remove and sync input. Prevented: nothing, the empty text stays until blur, which asks to remove again
 *   - Multiple: nothing
 * - Text (also when equal to an item, as an item can only be removed through its option or chip)
 *   - Both:     match. No result: announce, unless the text equals an item, as a confirmed item is never invalid
 *   - Single:   no result: typed text stays until blur. Result equal to the current item: sync input.
 *               Otherwise replace. Accepted: sync input. Prevented: nothing, typed text stays until blur
 *   - Multiple: no result: nothing. Result already an item: nothing, as Enter only adds. Otherwise add. Text is not changed
 *
 * Blur (focus leaves <u-combobox>; a pointer down inside defers the check until the press ends, so a click can refocus first.
 *       In Samsung Internet, focus landing on <body> is not a blur, as it parks keyboard focus there while TalkBack is on the list, see onFocusLeave)
 * - Multiple: nothing
 * - Readonly: nothing, also when the text was set programmatically. A readonly input can be focused, so blur is gated like every other action
 * - Single + empty text:  select to remove the item, if any. Accepted: remove. Prevented: sync input
 * - Single + same text:   sync input, which only writes when the text differs from the item in surrounding whitespace
 * - Single + other text:  match, but never create from text. No result: sync input. Result equal to the current item: sync input.
 *                         Otherwise replace. Accepted: sync input. Prevented: sync input
 *
 * Clear button (button[type="reset"])
 * - Both:     empty the text (dispatches input), focus input, re-open the list if it was open
 * - Single:   remember the text before the clear, then select to remove the item, if any. Accepted: remove. Prevented: set text back to the remembered text
 * - Multiple: the emptied text is cached like typing, and stays as nothing is selected or removed
 *
 * Toggle button (button[aria-expanded])
 * - Both:     focus input, then open the list if it was closed, otherwise close it.
 *             mousedown on the button is cancelled so focus stays on the input, as the blur would otherwise close <u-datalist> before the click.
 *             Closing is explicit, as it can not rely on that blur: a tap dispatches mousedown and click together, so the refocus wins
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
 * - data-multiple removed: the first item is the item, extra <data> are kept in DOM but not mirrored until the first select drops them. Sync input
 * - data-multiple added:   all <data> are items. Text is kept
 * - data-creatable:        only affects the next Enter
 *
 * Always
 * - Disabled or readonly input: every action above is ignored, blur included. Only the text of a sync or consumer write is still cached.
 * - No datalist: free text. Input is never synced, match is never dispatched.
 *                Enter or blur on empty text still removes the item in single mode, as empty text is no selection
 *
 * | Action       | Single                                                    | Multiple                              |
 * | :----------- | :-------------------------------------------------------- | :------------------------------------ |
 * | Pick         | Keep text -> replace -> sync input                        | Keep text -> toggle                   |
 * | Type         | Cache text                                                | Cache text                            |
 * | Enter empty  | Remove item                                               | Nothing                               |
 * | Enter text   | Match -> replace/create -> sync, else announce, keep text | Match -> add/create, else announce    |
 * | Blur empty   | Remove item                                               | Nothing                               |
 * | Blur same    | Sync input (whitespace only)                              | Nothing                               |
 * | Blur other   | Match -> replace -> sync, else sync input (never creates) | Nothing                               |
 */

declare global {
	interface HTMLElementTagNameMap {
		"u-combobox": UHTMLComboboxElement;
	}
	interface GlobalEventHandlersEventMap {
		comboboxafterselect: CustomEvent<HTMLDataElement>;
		comboboxbeforematch: CustomEvent<HTMLOptionElement | undefined>;
		comboboxbeforeselect: CustomEvent<HTMLDataElement>;
	}
}

const VERSIONS = (isBrowser() ? window : {}) as Record<
	typeof VERSION,
	WeakSet<UHTMLComboboxElement>
>;
const VERSION = `_uComboboxes${version}` as const; // Resolve programmatic input.value changes with multi-version support
const ATTR_MULTI = "data-multiple";
const ARIA_LABEL = "aria-label";
const FOCUS_VISIBLE = { focusVisible: true };
const EVENTS = "focus click keydown mousedown"; // blur and pointerdown are handled by onFocusLeave, input by onWindowInput or connectedCallback
const FALSE = "false";
const SR_ANNOUNCE = "--sr-announce";
const SR_ONLY = 'position:absolute;pointer-events:none;content:"\\00A0"'; // Used to ensure announcement from CSS

export const UHTMLComboboxStyle = `${DISPLAY_BLOCK}
[part="items"]:not([hidden]) { display:inline-flex;flex-wrap:wrap } /* Can not be "contents" as this confuses VoiceOver */
:host(:not([data-multiple])) [part="items"],
:host([data-multiple="false"]) [part="items"] { display:none }
::slotted(del),
::slotted(button[type="reset"]),
::slotted(button[aria-expanded]) { font:inherit;border:0;padding:0;background:none;color:inherit;cursor:pointer;text-decoration:none }
::slotted(data) { cursor:pointer;pointer-events:none }
::slotted(data)::before { content:''/var(${SR_ANNOUNCE},'') }
::slotted(data[tabindex])::after { padding-inline:.5ch;pointer-events:auto;content:var(--x,"\\00D7")/", "var(--sr-remove,"Press to remove")var(--sr-ios,"") }
::slotted(button[type="reset"])::before,
::slotted(del)::before { content:var(--x,"\\00D7")/var(--sr-clear,"Clear") }
::slotted(button[type="reset"]:not(:empty))::before,
::slotted(del:not(:empty))::before { ${SR_ONLY};--x:"" }
::slotted(button[aria-expanded])::before { content:var(--toggle,"\\25BC")/var(--sr-toggle,"Options") }
::slotted(button[aria-expanded="true"])::before { --toggle:"\\25B2" }
::slotted(button[aria-expanded]:not(:empty))::before { ${SR_ONLY};--toggle:"" }
#sr-items::before { ${SR_ONLY}/var(--sr-items, "selected") }
@supports(-webkit-touch-callout:none) {
	:host { counter-reset:sr-ios }
	::slotted(data)::after { counter-increment:sr-ios;--sr-ios:", "counter(sr-ios)" "var(--sr-of,"of")" "var(--sr-count,"") }
}`;

export const UHTMLComboboxShadowRoot =
	declarativeShadowRoot(UHTMLComboboxStyle);

/**
 * The `<u-combobox>` HTML element contain `<data>`, `<input>` and `<u-datalist>` elements.
 * No MDN reference available.
 */
export class UHTMLComboboxElement extends UHTMLElement {
	_unfocus?: ReturnType<typeof onFocusLeave>;
	_umutate?: ReturnType<typeof onMutation>; // Using underscore instead of private fields for backwards compatibility
	_listbox: HTMLElement;

	// Speed up by caching elements
	_clear?: HTMLElement | null;
	_control?: HTMLInputElement | null;
	_items?: HTMLCollectionOf<HTMLDataElement>;
	_list?: HTMLDataListElement | null;
	_options?: HTMLCollectionOf<HTMLOptionElement>;
	_root?: Document | ShadowRoot; // Root at connect, to listen for form reset events
	_select?: HTMLCollectionOf<HTMLSelectElement>;
	_toggle?: HTMLElement | null;

	_serialized?: string[]; // Key of every item as of the last sync, to detect item changes and diff added and removed items. Only valid inside onMutations, as the DOM may change before the observer runs
	_value?: string; // Cached text, to revert a datalist pick
	_commit?: {
		focus: boolean; // Focus moved to a neighbour before the select, so a removal announces through aria-label instead of the live region
		value: string; // Input text at the select, so the sync following an item change dispatches change only while the text is still this
		settle?: () => void; // Runs once when settled. Blur and clear use it for their fallback, which only reads state, so it is correct whenever it runs
	}; // Pending user commit (pick, Enter, blur, clear, chip removal), see dispatchSelect. Settled by identity, so a commit never settles a later one
	_announce?: {
		prefix: string; // Prefix such as "Added Apple, "
		label: string | null; // Pristine aria-label of the input
		reset: ReturnType<typeof setTimeout>; // Pending announceReset
	};

	version = version; // Expose version for easier debugging
	constructor() {
		super();
		const root = attachStyle(this, UHTMLComboboxStyle);
		this._listbox = tag("div", {
			"aria-labelledby": "sr-items", // Note: Not announced by NVDA
			"aria-orientation": "horizontal",
			role: "listbox",
			part: "items",
			tabindex: "-1", // Prevent tabstop even if consumer sets overflow: auto (https://issues.chromium.org/issues/40456188)
		});
		this._listbox.append(tag("slot", { name: "items" })); // Avoid innerHTML to comply with Trusted Types CSP
		root.append(tag("div", { id: "sr-items", "aria-hidden": "true" }));
		root.prepend(this._listbox);
	}
	connectedCallback() {
		VERSIONS[VERSION]?.add(this);
		this._root = getRoot(this);
		this._unfocus = onFocusLeave(this, () => onCommit(this, true));
		this._umutate = onMutation(this, onMutations, {
			attributeFilter: [
				"aria-expanded", // Sync toggle button state with u-datalist visibility
				"disabled", // Sync items with input state
				"readonly", // Sync items with input state
				"role", // In case u-datalist is initialized async
				"value", // Update _value if input value attribute changes
				ATTR_MULTI, // Update selected list options if swapping mode
			],
			attributeOldValue: true, // Needed to ignore no-op attribute writes from frameworks, and to detect a mode change
			attributes: true,
			characterData: true, // Respond to changes in <data> textContent
			childList: true,
			subtree: true,
		});
		if (this._root instanceof ShadowRoot) on(this, "input", this, true); // If inside ShadowDOM. LightDOM is handled by onWindowInput
		on(this, EVENTS, this, true); // Bind events using capture phase to run before frameworks
		on(this._root, "reset", this, true); // Update _value on form reset too
	}
	disconnectedCallback() {
		if (this._root) off(this._root, "reset", this, true);
		off(this, `${EVENTS} input`, this, true);
		announceReset(this);
		VERSIONS[VERSION]?.delete(this);
		this._unfocus?.();
		this._umutate?.();
		// biome-ignore format: next-line
		this._commit = this._root = this._umutate = this._unfocus = this._clear = this._toggle = this._control = this._select = this._options = this._items = this._list = this._value = this._serialized = undefined;
	}
	handleEvent(e: Event): void {
		const { type, target } = e;
		if (type === "reset") {
			if (target === this.control?.form) setTimeout(onReset, 0, this, e); // Controls are reset after the reset event has dispatched, so defer. Also when disabled or readonly
			return; // Explicit void return type, returning setTimeout causes different types in DOM and Node
		}
		if (type === "input" && e.composedPath()[0] !== this.control) return; // Listener is on window or this, so check the real target also inside nested shadow roots
		if (type !== "input" && isInert(this)) return; // input passes while inert, as the text of a sync must be cached and setRangeText bypasses the value setter. No user action dispatches input then, so only syncs and consumer writes reach onInput
		if (type === "click") onClick(this, e as MouseEvent);
		if (type === "focus") ariaNotify(); // Prepare for aria-live announcements
		if (type === "input") onInput(this, e);
		if (type === "keydown") onKeyDown(this, e as KeyboardEvent);
		if (type === "mousedown") onMousedown(this, e);
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
		if (!this._control?.isConnected)
			this._control = this.querySelector(':scope > input:not([type="hidden"])');
		return this._control; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control
	}
	get list(): HTMLDataListElement | null {
		if (!this._list?.isConnected) {
			this._list = this.querySelector('datalist,u-datalist,[role="listbox"]'); // Can not use this.control.list as it might not be connected yet
			this._options = undefined; // Reset options cache as list might be changed
		}
		return this._list; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
	}
	get clear(): HTMLElement | null {
		if (!this._clear?.isConnected)
			this._clear = this.querySelector('button[type="reset"],del');
		return this._clear;
	}
	get toggle(): HTMLElement | null {
		if (!this._toggle?.isConnected)
			this._toggle = this.querySelector("button[aria-expanded]");
		return this._toggle;
	}
	get items(): HTMLCollectionOf<HTMLDataElement> {
		if (!this._items) this._items = this.getElementsByTagName("data");
		return this._items;
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		const list = this.list; // Read first, as a replaced list resets the options cache
		const name = !this._options && list?.children[0]?.nodeName; // Support renaming u-option element
		if (name) this._options = list?.getElementsByTagName(name as "option");
		return this._options || this.getElementsByTagName("-" as "option"); // Fallback when u-option is not initialized yet
	}
	get values(): string[] {
		const values = Array.from(this.items, getValue);
		return this.multiple ? values : values.slice(0, 1); // Never return more than 1 in single mode
	}
}

// value is the non-empty trimmed text, see onCommit. Pass create = false to never create from text (blur)
const dispatchMatch = (
	self: UHTMLComboboxElement,
	value: string,
	create = true,
) => {
	const { options, list } = self;
	const query = value.toLowerCase();
	let match = Array.prototype.find.call(
		options,
		(opt) =>
			!opt.hidden &&
			!isDisabled(opt) &&
			getLabel(opt).trim().toLowerCase() === query,
	);

	if (list) {
		const event = { bubbles: true, cancelable: true, detail: match };
		if (!self.dispatchEvent(new CustomEvent("comboboxbeforematch", event)))
			match = Array.prototype.find.call(options, isSelected); // Prevented means custom matching: the first option the handler selected, or nothing to reject the match
		syncOptionsWithItems(self); // Restore the mirror of the current items. The matched option is selected by onMutations once its <data> is added, so a prevented or restored select never leaves a stale selection
	}

	if (!match && create && self.creatable) return { value, label: value }; // Create from text if no match and creatable
	return match && getItem(match);
};

const dispatchSelect = (
	self: UHTMLComboboxElement,
	item: HTMLDataElement | { value: string; label?: string },
	fromOption = false, // Pass true when the item comes from a match or pick: single mode then only re-confirms an existing item, while a chip removes it.
	settle?: () => void, // Runs once the commit settles, see Commit
) => {
	settleCommit(self); // A superseded commit settles first, so a pending blur or clear fallback runs before this select reads the text. The fallback would otherwise rewrite the input after the new commit recorded its text, and the sync that follows would skip change
	const { control, items, multiple, values } = self;
	const index =
		item instanceof HTMLDataElement
			? Array.prototype.indexOf.call(items, item) // Ensure the correct element is used when provided
			: values.indexOf(item.value);
	const remove = items[index];
	const focus =
		remove === getFocused(self) &&
		(multiple ? items[index - 1] || items[index + 1] || control : control);

	if (item instanceof HTMLDataElement) item = getItem(item);
	if (remove && fromOption && !multiple) {
		syncInputWithItemSingleMode(self, true); // Already the item in single mode, so only sync the input text. Multiple mode toggles. No commit, as the item is confirmed and a blur fallback has nothing to revert
		return true;
	}
	if (focus) focus.focus(FOCUS_VISIBLE); // Move focus if item might be removed (can be prevented by comboboxbeforeselect)

	const add = tag("data", { value: item.value }, item.label || item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };
	const accepted = self.dispatchEvent(
		new CustomEvent("comboboxbeforeselect", event),
	);
	// Record the commit after the dispatch, as the consumer may write the input in the handler. Also when prevented, as a consumer rendering the item itself (controlled mode) settles it through the item change.
	// Expire after the render opportunity if no item change settled it, so a prevented select neither silences the live region nor dispatches change on a later programmatic item change.
	// Queued after the dispatch, so the consumer's own scheduling in the handler is ahead of it
	const commit = { focus: !!focus, value: control?.value || "", settle };
	self._commit = commit;
	afterRender(() => settleCommit(self, commit));
	if (accepted) {
		if (!multiple) for (const el of [...items]) el.remove(); // Single mode holds at most one item, so extras kept from multiple mode are dropped on the first select. Spread, as items is live
		if (remove) remove.remove();
		else control?.insertAdjacentElement("beforebegin", add);
		self.dispatchEvent(new CustomEvent("comboboxafterselect", event));
		return true;
	}
	return false;
};

// Settle a commit once: on an item change, after the render opportunity, or when superseded by a later commit. No-op if already settled, so a commit never settles a later one
const settleCommit = (self: UHTMLComboboxElement, commit = self._commit) => {
	if (!commit || self._commit !== commit) return;
	self._commit = undefined;
	commit.settle?.();
};

// Shared by Enter and blur, see SPECIFICATION. Blur comes from onFocusLeave, deferred while an item or button is pressed
const onCommit = (self: UHTMLComboboxElement, isBlur = false) => {
	const { control, items, list, multiple } = self;
	if (!control || !self.isConnected) return; // Unmounted before the blur timeout
	if (isBlur && (multiple || isInert(self))) return; // Nothing to do in multiple mode. Blur bypasses handleEvent, so apply the same inert gate as every other action
	const value = control.value.trim();
	const isItem = multiple
		? Array.from(items, getText).includes(value)
		: getText(items[0]) === value;
	// Blur falls back to the item once the commit settles, as leaving the field is not a confirmation: a prevented select reverts the text,
	// while an accepted or consumer rendered item change is already synced, so the fallback writes nothing. Enter keeps the typed text when prevented
	const settle = isBlur
		? () => syncInputWithItemSingleMode(self, true)
		: undefined;

	if (!value) {
		// Empty text removes the item in single mode, and is nothing in multiple mode
		if (!multiple && items[0]) dispatchSelect(self, items[0], false, settle);
		else if (isBlur) syncInputWithItemSingleMode(self, true); // Sync input to trim input value
	} else if (!isBlur || !isItem) {
		const match = dispatchMatch(self, value, !isBlur); // Blur never creates from text, as leaving the field is not a confirmation
		const isAdded = multiple && !!match && self.values.includes(match.value); // Already an item: keep it, as Enter only adds. Removal is only intended through a pick or a chip
		if (match && !isAdded) dispatchSelect(self, match, true, settle);
		else if (isBlur)
			syncInputWithItemSingleMode(self, true); // No match on blur falls back to the item
		else if (!match && list && !isItem && attr(list, "aria-busy") !== "true")
			ariaNotify(srText(self, "invalid", "Invalid value")); // No match on Enter keeps the typed text
	} else syncInputWithItemSingleMode(self, true); // Blur on the item text only trims surrounding whitespace, as the item is a confirmed selection
};

// Keep focus on the input when pressing the toggle or clear button. Cancelling pointerdown would also cancel click on iOS WebKit, so using mousedown instead
const onMousedown = (self: UHTMLComboboxElement, e: Event) => {
	const { clear, toggle } = self;
	const el = e.target as Node;
	if (clear?.contains(el) || toggle?.contains(el)) e.preventDefault();
};

const onReset = (self: UHTMLComboboxElement, e: Event) => {
	if (!self.isConnected || e.defaultPrevented) return;
	onProgrammatic(self);
	syncInputWithItemSingleMode(self);
};

const onClick = (self: UHTMLComboboxElement, e: MouseEvent) => {
	const { clientX: x, clientY: y, target } = e;
	const { clear, control, items, list, toggle, multiple } = self;
	const isListHidden = list?.hidden; // Read before focusing the input, as Android opens <u-datalist> on focus. Live state is reliable, as onMousedown keeps focus on the input while pressing the toggle or clear button
	const isSelf = target === self;

	if (toggle?.contains(target as Node) && list) {
		control?.focus();
		if (isListHidden) control?.click();
		else if (list.nodeName !== "DATALIST") list.hidden = true;
	}

	if (control && clear?.contains(target as Node)) {
		e.preventDefault(); // Prevent button[type="reset"]
		const itemToClear = !multiple && items[0];
		const value = control.value; // Read before clearing, so a prevented removal can set it back

		setValue(control, "", { inputType: "deleteContentBackward" });
		if (!itemToClear || !self.contains(itemToClear))
			dispatchChange(control); // Consumer might allready have removed <data> in their input handler
		else
			dispatchSelect(self, itemToClear, false, () => {
				// Once the commit settles: a removal, also by a consumer in controlled mode, commits the emptied text with change, as no blur does so,
				// and only if the text is still empty, as a replaced item is already synced with change. A prevented removal reverts to the text before the clear without change, as the text ends up unchanged
				if (!items[0]) return control.value || dispatchChange(control);
				if (value !== control.value)
					setValue(control, value, { inputType: "insertText" }); // insertText, so the input event is cached like typing and never taken for a pick
			});

		control.focus();
		return isListHidden || control.click(); // Open list if it was open before clicking clear
	}

	for (const item of items) {
		if (item.contains(target as Node)) return dispatchSelect(self, item); // Only keyboard and screen reader can set target to element with pointer-events: none
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

// Typing, programmatic writes and datalist picks. No pick dispatches beforeinput, so the input event is the only signal, and the list has already written the option value when it dispatches:
// - <u-datalist> picks through setValue: an untrusted InputEvent with insertReplacementText. A trusted replacement is then Firefox spell check or autofill, and is typing
// - Native <datalist> picks with a trusted event: Firefox an InputEvent with insertReplacementText, WebKit and Chrome a plain Event without inputType.
//   Spell check, autofill and the type="search" clear button dispatch the same events, so a pick also requires the value to be an option value, and the clear button an empty value.
//   An untrusted replacement is also accepted, as tests can not open the native popup
// Syncs and the clear button use insertText and deleteContentBackward, and a revert dispatches nothing, so they never match. Inert is gated by handleEvent, but the input passes it, so a replacement while inert is a consumer write, cached like typing
const onInput = (self: UHTMLComboboxElement, e: Partial<InputEvent>) => {
	const { control, list } = self;
	const value = control?.value || "";
	const isReplacement = e.inputType === "insertReplacementText";
	const isPick =
		list &&
		!isInert(self) &&
		(list.nodeName === "DATALIST"
			? isReplacement || (e.isTrusted && !e.inputType && value)
			: isReplacement && !e.isTrusted);
	const match = isPick && getOption(self, value); // Only accept as pick if value is an option value, avoiding false positives on spell check or autofill

	if (match && control) {
		e.stopImmediatePropagation?.(); // Stop the input, as the consumer must never see the option value as text. dispatchSelect syncs the input if needed
		setValue(control, self._value || ""); // Revert, as the list writes the option value before dispatching. Silent, so neither input nor change reports the option value. Prevented keeps the reverted text until blur
		if (value) dispatchSelect(self, match, true); // Picking <option value=""> should not cause select
	} else self._value = value;

	syncButtonsWithInput(self);
};

const onKeyDown = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	if (e.ctrlKey || e.metaKey || e.shiftKey || e.key === "Alt") return; // Firefox sets altKey: false when VO key
	if (self.control === e.target) onKeyDownControl(self, e);
	else onKeyDownItems(self, e);
};

const onKeyDownControl = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	const { clear, control, creatable, items, list } = self;
	const isBackwards = e.key === "ArrowLeft" || e.key === "Backspace";
	if (e.isComposing || e.keyCode === 229) return; // The IME owns Enter and arrows while composing. Chrome has isComposing false on the keydown starting a composition, but keyCode 229

	// selectionEnd is null for type="email" and type="number", so only act when caret is known to be at start
	if (isBackwards && control?.selectionEnd === 0) {
		items[items.length - 1]?.focus(FOCUS_VISIBLE); // Focus last item if pressing left or backspace at start of input
		if (items.length) e.preventDefault(); // Prevent sideways scroll
	}
	if (e.key === "Enter" && control && (list || creatable)) {
		preventSubmit(control); // Prevent submitting form as we want to perform a match instead, also on key repeat
		if (!e.repeat) onCommit(self); // Matches against the options present now, so no state is kept while typing. Holding Enter commits once, so a toggle or creatable item does not flicker
	}
	if (e.key === "Tab" && clear && control?.value) {
		e.preventDefault(); // Prevent default tab as we are moving into clear
		attr(clear, "aria-hidden", "false"); // Allow screen readers to announce clear button as we are focusing it
		attr(clear, "tabindex", "0"); // Needed to prevent Safari from looping focus back to input on text Tab-press
		clear.focus(FOCUS_VISIBLE); // Focus element, and show focus ring
		on(clear, "blur", () => syncButtonsWithInput(self), EVENT_ONCE); // Revert on next blur
	}
};

const onKeyDownItems = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	const { clear, control, items } = self;
	const { key, repeat, target } = e;
	const index = Array.prototype.indexOf.call(items, target as HTMLDataElement);
	const isKeyClick = key === " " || key === "Enter";

	if (isKeyClick && (items[index] || target === clear)) {
		if (!repeat) (items[index] || clear)?.click(); // Trigger click to ensure consistent behavior with mouse and screen readers. Holding the key removes one item, as focus moves to the next item on removal
		return e.preventDefault(); // Prevent scrolling or submitting
	}
	if (!items[index]) return;
	if (key.startsWith("Arrow")) e.preventDefault(); // Prevent sideways scroll
	if (key === "ArrowLeft") return items[index - 1]?.focus(FOCUS_VISIBLE);
	if (key === "ArrowRight")
		return (items[index + 1] || control)?.focus(FOCUS_VISIBLE);
	if (key === "Backspace") {
		e.preventDefault(); // Prevent navigating away from page
		return repeat || dispatchSelect(self, items[index]);
	}
	control?.focus(); // Move focus when typing any character
};

const onMutations = (self: UHTMLComboboxElement, record?: MutationRecord[]) => {
	if (!self.control || record?.every(isNoopAttribute, self)) return;
	if (record?.every(isInsideList, self)) {
		syncOptionsWithItems(self); // Only the options changed (i.e. async search results), so only the option mirror needs a sync. Nothing else reads the options
		self._umutate?.takeRecords();
		return;
	}
	const { control, items, list, multiple, toggle } = self;
	const isNewControl = !record || record.some((r) => isAdded(r, control)); // Mount, or a new or replaced input
	const isNew = isNewControl || record?.some(isNewListOrMode, self); // Also a new or replaced datalist, or a mode change, as the input may hold filter text

	if (isNewControl || record?.some(isControlValueChange, self))
		self._value = control.value; // Cache the initial value, or an attribute changing a pristine input without hitting the prototype setter

	// Items added, removed, changed or reordered, compared with the last sync. Not when re-rendered with the same text and value (i.e. Angular @for without track after a prevented select),
	// as the pending commit must then expire for the blur or clear fallback to run, and a sync would dispatch a change for an unchanged item
	const keys = Array.from(items, (el) =>
		JSON.stringify([getText(el), getValue(el)]),
	);
	const prev = self._serialized || keys; // No change on mount, as isNew handles the first sync
	const isItemChange = `${prev}` !== `${keys}`;
	self._serialized = keys;

	// Read the texts before the writes below, so the computed style is not flushed twice
	const count = items.length;
	const hint = `${count ? srText(self, "found", "Navigate left to find %d selected").replace("%d", `${count}`) : srText(self, "empty", "No selected")}`;
	self.style.setProperty("--sr-count", `'${count}'`);

	if (isItemChange) announceItemChange(self, prev, keys);
	syncItems(self);
	syncButtonsWithInput(self);
	if (isNew || isItemChange || record?.some(isInsideList, self))
		syncOptionsWithItems(self); // The option mirror only depends on the items, the mode and the options, so skip the loop over every option on unrelated changes (i.e. the list opening)
	syncSelectWithItems(self);

	// Forward aria-expanded to toggle button, and keep aria-expanded="false" if no list to make it CSS selectable
	if (list) attr(list, SAFE_MULTISELECTABLE, `${multiple}`); // Forward multiselect
	if (toggle) {
		const expanded = !!list && list.nodeName !== "DATALIST" && !list.hidden;
		attr(toggle, "aria-expanded", `${expanded}`);
	}

	attr(control, "aria-description", multiple ? hint : null);
	attr(control, "list", useId(list)); // Connect datalist and input
	self._umutate?.takeRecords(); // Clear mutation records caused by our own attribute writes. Must run before dispatching events below, so consumer mutations made in event handlers are kept

	syncInputWithItemChange(self, isNew, isItemChange); // Runs last as it dispatches events, and reads the pending commit
	if (isItemChange) settleCommit(self); // An item change settles the pending commit, also by a consumer in controlled mode, so a later programmatic item change neither dispatches change nor announces through aria-label
};

// Announce an added or removed item through aria-label when focus moved (chip removal), otherwise through the live region.
// Takes the indexes of the added items and the keys of the removed items, see diffKeys
const announceItemChange = (
	self: UHTMLComboboxElement,
	prev: string[],
	next: string[],
) => {
	const { _announce, control, multiple } = self;
	const focus = getFocused(self);
	const removed = [...prev];
	const added: number[] = [];
	next.forEach((key, index) => {
		const match = removed.indexOf(key);
		if (match < 0) added.push(index);
		else removed.splice(match, 1);
	});
	const item = self.items[added[0]]; // The added item, if any. An addition is announced before a removal
	const doSpeak = multiple
		? added.length + removed.length === 1
		: item === focus; // Only speak in single mode if item is visible and focused
	if (!doSpeak || !control || !self.contains(focus)) return;

	clearTimeout(_announce?.reset);
	const label = _announce ? _announce.label : attr(control, ARIA_LABEL);
	if (_announce) attr(control, ARIA_LABEL, label); // Restore before reading the accessible name
	const prefix = `${srText(self, item ? "added" : "removed", item ? "Added" : "Removed")} ${item ? getText(item) : JSON.parse(removed[0])[0]}, `;
	const reset = setTimeout(announceReset, 300, self); // 300ms delay so screen readers announces new aria-label. Note: Causes short double/hiccup announce in NVDA Firefox
	self.style.setProperty(SR_ANNOUNCE, `'${prefix}'`);
	self._announce = { prefix, label, reset };
	attr(control, ARIA_LABEL, `${prefix}${getInputLabel(control)}`); // Make sure control also can aria-label-announce
	if (!self._commit?.focus) setTimeout(() => ariaNotify(prefix.slice(0, -2))); // Aria-live when no focus move belongs to the pending commit, remove trailing comma, setTimeout to take presence
};

// Sync input with item in single mode with list, on mount and when the item changed, so unrelated mutations never overwrite typed text
const syncInputWithItemChange = (
	self: UHTMLComboboxElement,
	isNew: boolean,
	isItemChange: boolean,
) => {
	if (self.multiple || !self.list || !self.control) return;
	// First sync is deferred, as frameworks write their bound input value after insertion (Vue v-model mounted, Angular ngModel) or ignore events during render (React commit)
	// Using Promise.resolve() and not setTimeout() as this ensures deferral without a browser painted frame inbetween
	if (isNew)
		Promise.resolve().then(() => {
			if (self.isConnected) syncInputWithItemSingleMode(self);
		});
	else if (isItemChange)
		syncInputWithItemSingleMode(
			self,
			self._commit?.value === self.control.value,
		); // Dispatch change only if the item change follows a user commit, and the text is still the committed text
};

const announceReset = (self: UHTMLComboboxElement) => {
	if (!self._announce) return; // Nothing to revert
	if (self.control) attr(self.control, ARIA_LABEL, self._announce.label); // Revert aria-label to original value after announcement
	self.style.removeProperty(SR_ANNOUNCE);
	clearTimeout(self._announce.reset);
	self._announce = undefined;
};

// Sync helpers
const syncItems = (self: UHTMLComboboxElement) => {
	const { _listbox, items, multiple } = self; // _announce,
	const hidden = multiple ? null : "";
	const tabindex = isInert(self) ? null : "-1"; // disabled and readonly are observed, so this re-runs when they change
	for (const item of items) {
		attr(item, "hidden", hidden); // Avoid ARC Toolkit warning in single mode
		attr(item, "role", "option");
		attr(item, "slot", "items");
		attr(item, "tabindex", tabindex);
		attr(item, "value", getValue(item));
	}
	attr(_listbox, "hidden", items.length ? null : ""); // Avoid Siteimprove warning about empty role="listbox"
};

const syncSelectWithItems = (self: UHTMLComboboxElement) => {
	if (!self._select) self._select = self.getElementsByTagName("select");
	if (!self._select[0]) return;
	const select = self._select[0];
	let append: DocumentFragment | undefined; // Speed up by running all appends in one go after the loop
	let idx = 0;

	attr(select, "multiple", self.multiple ? "" : null); // Forward multiselect
	for (const item of self.items) {
		if (idx && !self.multiple) break; // Single mode mirrors only the first item, matching the input. A single <select> would otherwise submit the last one. Extra <data> are kept for a later switch back to multiple
		const opt = select.options[idx++]; // Use existing option if available
		const text = getText(item);
		const value = getValue(item); // u-option might not be initialized yet

		if (opt) {
			setSelected(opt, true);
			attr(opt, "value", value);
			if (opt.textContent !== text) opt.textContent = text;
		} else {
			if (!append) append = document.createDocumentFragment();
			append.appendChild(new Option(text, value, true, true));
		}
	}
	for (const o of Array.prototype.slice.call(select.options, idx)) o.remove();
	if (append) select.appendChild(append);
	self._umutate?.takeRecords(); // Clear mutation records caused by adding/removing <option> elements
};

const syncButtonsWithInput = (self: UHTMLComboboxElement) => {
	const { clear, control, toggle, list } = self;
	const inert = isInert(self);
	const empty = !control?.value;
	if (clear?.nodeName === "DEL") attr(clear, "role", "button"); // Backwards compatibility for older versions using <del> as clear button
	if (clear) {
		const focused = !inert && !empty && clear === getFocused(self); // Keep focusable and visible to screen readers while focused after tabbing to clear, as closing the datalist triggers a sync. Never while idle, as setting hidden on the focused clear blurs it synchronously in Chromium, re-entering this sync before the outer call writes its stale focused state
		attr(clear, "aria-hidden", focused ? FALSE : `${IS_IOS || IS_ANDROID}`); // Hide from screen readers to keep datalist open on swipe right navigation
		attr(clear, "hidden", empty || inert ? "" : null);
		attr(clear, "tabindex", focused ? "0" : "-1");
	}
	if (toggle) {
		const show = empty && !inert && list && list.nodeName !== "DATALIST"; // Show toggle only if idle, not disabled or readonly, and <u-datalist> is present, as native <datalist> can not be opened programmatically
		attr(toggle, "aria-hidden", `${IS_IOS || IS_ANDROID}`); // Hide from screen readers to keep datalist open on swipe right navigation
		attr(toggle, "hidden", show ? null : "");
		attr(toggle, "tabindex", "-1");
		attr(toggle, "type", "button"); // Prevent submit
	}
};

const syncOptionsWithItems = (self: UHTMLComboboxElement) => {
	if (!self.list) return;
	const values = new Set(self.values); // Speed up by making a cache
	for (const opt of self.options) setSelected(opt, values.has(getValue(opt)));
};

// TODO: aria-required="true" => setCustomValidity
const syncInputWithItemSingleMode = (
	self: UHTMLComboboxElement,
	change = false, // Set true when the sync follows a user commit, so change is dispatched like the browser does on user input
) => {
	if (!self.control || !self.list || self.multiple) return; // No need to sync input value if multiple or no datalist (free text)
	const { control, items } = self;
	const value = getText(items[0]);
	const inputType = value ? "insertText" : "deleteContentBackward";
	if (value !== control.value) setValue(control, value, { inputType }, change); // Not cancelable, as the sync mirrors a confirmed item
};

// Mutations helpers
// Options added, removed or changed. Attribute records on the list itself take the full path, as its id and role connect it to the input.
// contains also accepts the text node of a characterData record
function isInsideList(this: UHTMLComboboxElement, r: MutationRecord) {
	const { list } = this;
	if (!list) return false;
	if (r.target === list) return r.type === "childList";
	return list.contains(r.target);
}

// Frameworks re-write attributes on render (i.e. Vue sets option value, React syncs input value), which is not a state change
function isNoopAttribute(this: UHTMLComboboxElement, r: MutationRecord) {
	if (r.type !== "attributes") return false;
	const next = (r.target as Element).getAttribute(r.attributeName as string);
	if (r.target === this.control && r.attributeName === "value")
		return next === (this._value ?? ""); // Controlled inputs mirror the value attribute on every keystroke, so only treat as change if differing from the value we have seen (i.e. attribute set on pristine input)
	return r.oldValue === next; // Same value written again
}

const isAdded = (r: MutationRecord, el: Element | null) =>
	!!el &&
	Array.prototype.some.call(r.addedNodes, (node: Node) => node.contains(el)); // The element was inserted in this batch, so it is new or replaced

function isControlValueChange(this: UHTMLComboboxElement, r: MutationRecord) {
	return r.target === this.control && r.attributeName === "value";
}

// A datalist inserted, or data-multiple changing the mode. Both get a deferred input sync like on mount, as the input may hold filter text and frameworks write their bound value after insertion
function isNewListOrMode(this: UHTMLComboboxElement, r: MutationRecord) {
	if (isAdded(r, this.list)) return true;
	if (r.target !== this || r.attributeName !== ATTR_MULTI) return false;
	return ((r.oldValue ?? FALSE) !== FALSE) !== this.multiple; // Ignore writes that do not change mode (i.e. null to "false" from frameworks)
}

// Element helpers
const getLabel = (el: Element) => attr(el, "label") ?? getText(el);
const getValue = (el: Element) => attr(el, "value") ?? getText(el);
const getItem = (el: Element) => ({ label: getLabel(el), value: getValue(el) });
const getOption = (self: UHTMLComboboxElement, value?: string | null) =>
	typeof value === "string" // Never match a missing value, as a synthetic event has no data
		? Array.prototype.find.call(self.options, (o) => getValue(o) === value)
		: undefined;
const isInert = ({ control }: UHTMLComboboxElement) =>
	control?.readOnly || control?.matches(":disabled"); // Using :disabled to respect fieldset[disabled] as well
const isDisabled = (opt: HTMLOptionElement) =>
	opt.disabled ?? opt.hasAttribute("disabled");
const isSelected = (opt: HTMLOptionElement) =>
	opt.selected ?? opt.hasAttribute("selected");
const setSelected = (opt: HTMLOptionElement, selected: boolean) => {
	if ("selected" in opt) opt.selected = selected; // Avoid shadowing the accessor before u-option upgrades
	attr(opt, "selected", selected ? "" : null); // Also the attribute, as u-option might not be initialized yet
};

// Resolve the connected <u-combobox> of this implementation owning an input
const getOwner = (input: Node | null | undefined) => {
	const parent = input?.parentElement as UHTMLComboboxElement;
	return parent && VERSIONS[VERSION].has(parent) && parent.control === input
		? parent
		: null; // Only the control, as a sibling <input type="hidden"> carrying the form value is not owned
};

// One shared window capture listener for all instances in light DOM, instead of one per instance running for every input event on the page.
// Only light DOM instances are served here, where the input is never retargeted, so event.target is the input and no composedPath() array is allocated for every input event on the page
const onWindowInput = (event: Event) => {
	const owner = getOwner(event.target as Node);
	if (owner && !(owner._root instanceof ShadowRoot)) owner.handleEvent(event); // Instances in a shadow root listen on themselves, so skip to not handle twice through an open shadow root
};

// Respond to programmatic input.value changes, and to input events in light DOM
if (isBrowser() && !VERSIONS[VERSION]) {
	VERSIONS[VERSION] = new WeakSet(); // Support hot module reload, and several versions on same page
	on(window, "input", onWindowInput, true);
	const proto = HTMLInputElement.prototype;
	const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
	if (descriptor) {
		// Only wrap an existing native accessor, as defining a setter without the native getter would break input.value for the whole page
		const set = function (this: HTMLInputElement, next: string) {
			const prev = this.value; // Compare actual values as next might be number or null
			descriptor.set?.call(this, next); // Call the original native setter to actually update the DOM
			const owner = prev !== this.value && getOwner(this);
			if (owner) onProgrammatic(owner);
		};
		Object.defineProperty(proto, "value", { ...descriptor, set }); // Keep the native getter and flags, only wrap the setter
	}
}

customElements.define("u-combobox", UHTMLComboboxElement);
