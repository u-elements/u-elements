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
	IS_SAFARI,
	isBrowser,
	off,
	on,
	onFocusLeave,
	onMutation,
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
 * - item:         a <data> inside <u-combobox>. Single mode only cares about the first item
 * - option:       an <option> inside the <datalist> / <u-datalist>
 * - text:         the current input value
 * - cached text:  the last text seen before a option pick. Used to revert text after a datalist pick in multiple mode
 * - match:        dispatch comboboxbeforematch with the first enabled and non-hidden option whose label equals the trimmed text case-insensitive,
 *                 preferring an option whose value is already an item when several labels are equal.
 *                 Prevented means custom matching: first option with option.selected is the result, so consumer should loop all options to pick or reject another option.
 *                 The result is the matched option, or a new item made from the text when creatable and no option matched (Enter only, never blur), or nothing.
 *                 Match is never dispatched for empty text, and never without a datalist (creatable still creates from the text on Enter)
 * - select:       dispatch comboboxbeforeselect with the item to add or remove.
 *                 Accepted: the DOM is changed and comboboxafterselect is dispatched. Prevented: the DOM is unchanged
 * - toggle:       multiple mode select: removes the item if its value is already an item, otherwise adds it
 * - replace:      single mode select: removes every <data>, then adds the new item. A removal only removes
 * - sync input:   set text to the item's text, or empty when there is no item. Only in single mode with a datalist,
 *                 and only when the text differs. Dispatches input, and change only when the sync follows a user commit
 *                 (pick, Enter, blur, clear, item removal), never on mount, programmatic item changes or form reset.
 *                 Also when reverting to an unchanged item, as the browser has already dispatched its own change with the typed text
 *                 before the deferred blur handling, so the last change must carry the final text. Never dispatches match or select
 * - commit:       a select from a user action. The item change that follows syncs the input with change and settles it, also when the consumer
 *                 prevented and renders the item itself (controlled mode). Otherwise it settles after the render opportunity (one microtask, then one MessageChannel task).
 *                 Settling runs the blur or clear fallback, and a later programmatic item change then dispatches no change.
 *                 Except when a prevented add expires unrendered: the next item change rendering exactly that item completes the expired commit (i.e. React startTransition,
 *                 a debounced state update) and still syncs with change, so the last change carries the final text. Any other item change or typing drops the expired commit
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
 * Enter in input (form submit is prevented on keydown when a datalist is present or creatable)
 * - The match runs on keyup, and only when the keydown reached the input and no pick followed. Safari dispatches a native <datalist> pick
 *   between the keydown and the keyup, and other browsers and <u-datalist> stops the keydown for Enter when picking.
 * - Empty text
 *   - Single:   with a datalist, select to remove the item, if any. Accepted: remove and sync input. Prevented: nothing, the empty text stays until blur, which asks to remove again.
 *               Without a datalist: nothing, as Enter only creates and the item is removed through the clear button
 *   - Multiple: nothing
 * - Text (also when equal to an item, as an item can only be removed through its option or chip)
 *   - Both:     match. No result: announce invalid, unless the text equals an item, as a confirmed item is never invalid
 *   - Single:   no result: typed text stays until blur. Result equal to the current item: sync input.
 *               Otherwise replace. Accepted: sync input. Prevented: nothing, typed text stays until blur
 *   - Multiple: no result: nothing. Result already an item: nothing, as Enter only adds. Otherwise add. Text is not changed
 *
 * Blur (focus leaves <u-combobox>; a pointer down inside defers the check until the press ends, so a click can refocus first.
 *       In Samsung Internet, focus landing on <body> is not a blur, as it parks keyboard focus there while TalkBack is on the list, see onFocusLeave)
 * - Multiple: nothing
 * - No datalist: nothing, as free text is never matched or synced
 * - Readonly: nothing, also when the text was set programmatically. A readonly input can be focused, so blur is gated like every other action
 * - Single + empty text:  select to remove the item, if any. Accepted: remove. Prevented: sync input
 * - Single + item text:   sync input, which only writes when the text differs from the item in surrounding whitespace
 * - Single + other text:  match, but never create from text. No result: sync input. Result equal to the current item: sync input.
 *                         Otherwise replace. Accepted: sync input. Prevented: sync input
 *
 * Clear button (button[type="reset"])
 * - Both:     empty the text (dispatches input), focus input, re-open the list if it was open
 * - Multiple: the emptied text is cached like typing, and change is dispatched at once, as nothing is selected or removed
 * - Single:   remember the text before the clear, then select to remove the item, if any. No item: change is dispatched at once.
 *             Accepted: remove, then dispatch change once settled. Prevented: set the text back to the remembered text, which dispatches input but not change.
 *             Neither happens when the text was edited meanwhile, i.e. by an input handler, as that write is the consumer's commit
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
 * - Prevented keydown (i.e. by a consumer capture listener): ignored, so a prevented Enter never matches on keyup
 * - No datalist: free text. Input is never synced, match is never dispatched, blur does nothing.
 *                Enter only creates from the text when creatable, never removes on empty text, and submits when not creatable
 *
 * The table assumes a datalist. Without one, only Type applies, and Enter text creates when creatable
 * | Action       | Single                                                           | Multiple                                   |
 * | :----------- | :---------------------------------------------------------------- | :----------------------------------------- |
 * | Pick         | Keep text -> replace -> sync input                                | Keep text -> toggle                        |
 * | Type         | Cache text                                                        | Cache text                                 |
 * | Enter empty  | Remove item                                                       | Nothing                                    |
 * | Enter text   | Match -> replace/create -> sync, else announce invalid, keep text | Match -> add/create, else announce invalid |
 * | Blur empty   | Remove item                                                       | Nothing                                    |
 * | Blur same    | Sync input (whitespace only)                                      | Nothing                                    |
 * | Blur other   | Match -> replace -> sync, else sync input (never creates)         | Nothing                                    |
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

const VERSION = `_uComboboxes${version}` as const; // Resolve programmatic input.value changes with multi-version support
const VERSIONS = (isBrowser() ? window : {}) as Record<
	typeof VERSION,
	WeakSet<UHTMLComboboxElement>
>;
const ARIA_LABEL = "aria-label";
const ATTR_MULTI = "data-multiple";
const DATALIST = "DATALIST";
const EVENTS = "focus click keydown keyup mousedown"; // blur and pointerdown are handled by onFocusLeave, input by onWindowInput or connectedCallback
const FALSE = "false";
const FOCUS = { focusVisible: true };
const IS_MOBILE = `${IS_IOS || IS_ANDROID}`;
const NO_OPTIONS = isBrowser() && document.getElementsByTagName("-");
const SR_ANNOUNCE = "--sr-announce";
const SR_ONLY = 'position:absolute;pointer-events:none;content:"\\00A0"'; // Used to ensure announcement from CSS

export const UHTMLComboboxStyle = `${DISPLAY_BLOCK}
[part="items"]:not([hidden]) { display:inline-flex;flex-wrap:wrap } /* Can not be "contents" as this confuses VoiceOver */
:host(:not([data-multiple])) [part="items"],
:host([data-multiple="false"]) [part="items"] { display:none }
::slotted(button[type="reset"]),
::slotted(button[aria-expanded]) { font:inherit;border:0;padding:0;background:none;color:inherit;cursor:pointer;text-decoration:none }
::slotted(data) { cursor:pointer;pointer-events:none }
::slotted(data)::before { content:''/var(${SR_ANNOUNCE},'') }
::slotted(data)::after { padding-inline:.5ch;pointer-events:auto;content:var(--x,"\\00D7");content:var(--x,"\\00D7")/", "var(--sr-remove,"Press to remove") }
::slotted(button[type="reset"])::before { content:var(--x,"\\00D7");content:var(--x,"\\00D7")/var(--sr-clear,"Clear input") }
::slotted(button[type="reset"]:not(:empty))::before { ${SR_ONLY} }
::slotted(button[type="reset"]:disabled),
::slotted(button[aria-expanded]:disabled){display:none}
::slotted(button[aria-expanded])::before { content:var(--toggle,"\\25BC");content:var(--toggle,"\\25BC")/var(--sr-toggle,"Options") }
::slotted(button[aria-expanded="true"])::before { --toggle:"\\25B2" }
::slotted(button[aria-expanded]:not(:empty))::before { ${SR_ONLY} }
#sr-items::before { ${SR_ONLY};${SR_ONLY}/var(--sr-items, "Selected") }`; // Double content: declarations without alt text to support Safari before 17.4 and Firefox before 128

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
	_items: HTMLCollectionOf<HTMLDataElement>;
	_list?: HTMLDataListElement | null;
	_options?: HTMLCollectionOf<HTMLOptionElement>;
	_root?: Document | ShadowRoot; // Root at connect, to listen for form reset events
	_select: HTMLCollectionOf<HTMLSelectElement>;
	_toggle?: HTMLElement | null;

	_enter?: boolean; // Enter keydown reached the input and no pick followed, so its keyup runs the match
	_serialized?: string[]; // Key of every item as of the last sync, to detect item changes and diff added and removed items. Only valid inside onMutations, as the DOM may change before the observer runs
	_value?: string; // Cached text, to revert a datalist pick
	_expired?: string; // Key of the item an expired commit asked to add, so a deferred render of exactly that item still dispatches change
	_commit?: {
		focus: boolean; // Focus moved to a neighbour before the select, so a removal announces through aria-label instead of the live region
		value: string; // Input text at the select, so the sync following an item change dispatches change only while the text is still this
		settle?: () => void; // Runs once when settled. Blur and clear use it for their fallback, which only reads state, so it is correct whenever it runs
	}; // Pending user commit (pick, Enter, blur, clear, chip removal), see dispatchSelect. Settled by identity, so a commit never settles a later one
	_announce?: {
		label: string | null; // Pristine aria-label of the input
		reset: ReturnType<typeof setTimeout>; // Pending announceReset
	};

	constructor() {
		super();
		const root = attachStyle(this, UHTMLComboboxStyle);
		this._items = this.getElementsByTagName("data");
		this._select = this.getElementsByTagName("select");
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
		this._unfocus = onFocusLeave(this, () => {
			this._enter = false; // The keyup lands elsewhere, so the pending Enter match is dropped
			dispatchMatch(this, true);
		});
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
		this._commit = this._root = this._umutate = this._unfocus = this._clear = this._toggle = this._control = this._options = this._list = this._value = this._serialized = this._enter = this._expired = undefined;
	}
	handleEvent(e: Event): void {
		const { type, target } = e;
		if (type === "click") onClick(this, e as MouseEvent);
		if (type === "focus") ariaNotify(); // Prepare for aria-live announcements
		if (type === "input") onInput(this, e);
		if (type === "keydown") onKeyDown(this, e as KeyboardEvent);
		if (type === "keyup") onKeyUp(this, e as KeyboardEvent);
		if (type === "mousedown") onMousedown(this, e);
		if (type === "reset") {
			if (target === this.control?.form) setTimeout(onReset, 0, this, e); // Controls are reset after the reset event has dispatched, so defer. Also when disabled or readonly
			return; // Explicit void return type, returning setTimeout causes different types in DOM and Node
		}
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
			this._clear = this.querySelector('button[type="reset"]');
		return this._clear;
	}
	get toggle(): HTMLElement | null {
		if (!this._toggle?.isConnected)
			this._toggle = this.querySelector("button[aria-expanded]");
		return this._toggle;
	}
	get items(): HTMLCollectionOf<HTMLDataElement> {
		return this._items;
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		const list = this.list; // Read first, as a replaced list resets the options cache
		const el = !this._options && list?.querySelector('option,[role="option"]'); // Support renaming u-option element
		if (el) this._options = list?.getElementsByTagName(el.nodeName as "option");
		return this._options || (NO_OPTIONS as HTMLCollectionOf<HTMLOptionElement>); // Fallback when options are not initialized yet
	}
	get values(): string[] {
		const values = Array.from(this.items, getValue);
		return this.multiple ? values : values.slice(0, 1); // Never return more than 1 in single mode
	}
}

const dispatchSelect = (
	self: UHTMLComboboxElement,
	item: { value: string; label?: string; nodeName?: string },
	fromOption = false, // Pass true when the item comes from a match or pick: single mode then only re-confirms an existing item, while a chip removes it.
	settle?: () => void, // Runs once the commit settles, see Commit
) => {
	const { control, items, multiple, values } = self;
	settleCommit(self); // A superseded commit settles first, so a pending blur or clear fallback runs before this select reads the text. The fallback would otherwise rewrite the input after the new commit recorded its text, and the sync that follows would skip change
	if (!control || control.readOnly || control.matches(":disabled")) return; // Prevent actions when inert, or without an input to insert items before
	const elem = item.nodeName === "DATA" && (item as HTMLDataElement);
	const remove = elem || items[values.indexOf(item.value)];
	const index = Array.prototype.indexOf.call(items, remove);
	const focus =
		remove === getFocused(self) &&
		(multiple ? items[index - 1] || items[index + 1] || control : control);

	if (elem) item = getItem(elem);
	if (remove && fromOption && !multiple) return syncInputSingleMode(self, true); // Already the item, sync only text
	if (focus) focus.focus(FOCUS); // Move focus if item might be removed

	const add = tag("data", { value: item.value }, item.label || item.value);
	const e = { bubbles: true, cancelable: true, detail: remove || add };
	const accept = self.dispatchEvent(new CustomEvent("comboboxbeforeselect", e));
	const commit = { focus: !!focus, value: control.value, settle }; // After dispatch to respect consumer changes
	self._commit = commit;
	self._expired = undefined; // A new commit replaces an expired one

	afterRender(() => {
		if (self._commit === commit && !accept && !remove)
			self._expired = JSON.stringify(getItem(add)); // Expired before the consumer rendered the item it was asked to add, see Commit
		settleCommit(self, commit); // Settle after framework re-renders, as consumer may change value or items
	});
	if (!accept) return;
	if (!multiple) for (const el of [...items]) el.remove(); // Spread, as items is live
	remove ? remove.remove() : control.insertAdjacentElement("beforebegin", add);
	self.dispatchEvent(new CustomEvent("comboboxafterselect", e));
};

const dispatchMatch = (self: UHTMLComboboxElement, isBlur = false) => {
	const { isConnected, control, items, list, options, multiple, values } = self;
	const inert = !control || control.readOnly || control.matches(":disabled");
	if (!isConnected || inert || (isBlur && (multiple || !list))) return; // Blur only commits in single mode with a datalist, as free text is never matched or synced

	const settle = isBlur ? () => syncInputSingleMode(self, true) : undefined;
	const value = control.value.trim();
	const first = items[0];
	const isItem = multiple
		? Array.from(items, getText).includes(value)
		: getText(first) === value;

	if (!value) {
		if (!multiple && first && list) dispatchSelect(self, first, false, settle);
		else if (isBlur) syncInputSingleMode(self, true); // Sync input to trim input value
	} else if (!isBlur || !isItem) {
		const matches = Array.prototype.filter.call(options, isMatch, value);
		let match = matches.find((o) => values.includes(getValue(o))) || matches[0]; // Prefer an option that is already an item, so Enter on the item text with equal labels confirms the item instead of swapping to the first label match
		const e = { bubbles: true, cancelable: true, detail: match };
		if (list && !self.dispatchEvent(new CustomEvent("comboboxbeforematch", e)))
			match = Array.prototype.find.call(options, isSelected);
		syncOptions(self); // Restore the mirror of the current items

		if (match) match = getItem(match);
		else if (!isBlur && self.creatable && !isItem)
			match = { value, label: value }; // Create from text if no match and creatable, but never from the text of an item, as that is a confirmed selection

		if (match && !(multiple && self.values.includes(match.value)))
			dispatchSelect(self, match, true, settle);
		else if (isBlur) syncInputSingleMode(self, true);
		else if (!match && !isItem && list && attr(list, "aria-busy") !== "true")
			ariaNotify(srText(self, "invalid", "Invalid value")); // No match on Enter keeps the typed text
	} else syncInputSingleMode(self, true); // Blur on the item text only trims surrounding whitespace, as the item is a confirmed selection
};

// Settle a commit once: on an item change, after the render opportunity, or when superseded by a later commit. No-op if already settled, so a commit never settles a later one
const settleCommit = (self: UHTMLComboboxElement, commit = self._commit) => {
	if (!commit || self._commit !== commit) return;
	self._commit = undefined;
	commit.settle?.();
};

const onProgrammatic = (self: UHTMLComboboxElement) => {
	if (window._uSetValue) return; // Skip writes by setValue, as they dispatch their own input event, or revert a pick and must keep the cached text
	self._value = self.control?.value;
	syncButtons(self);
};

const onReset = (self: UHTMLComboboxElement, e: Event) => {
	if (!self.isConnected || e.defaultPrevented) return;
	onProgrammatic(self);
	syncInputSingleMode(self);
};

const onMousedown = ({ clear, toggle }: UHTMLComboboxElement, e: Event) => {
	if (clear?.contains(e.target as Node) || toggle?.contains(e.target as Node))
		e.preventDefault(); // Keeps focus on input. Using mousedown, as pointerdown would also prevent click on iOS WebKit
};

const onClick = (self: UHTMLComboboxElement, e: MouseEvent) => {
	const { clientX: x, clientY: y, target } = e;
	const { clear, control, items, list, toggle, multiple } = self;
	const isListHidden = list?.hidden; // Read before focusing the input, as Android opens <u-datalist> on focus. Live state is reliable, as onMousedown keeps focus on the input while pressing the toggle or clear button
	const isSelf = target === self;

	if (toggle?.contains(target as Node) && list) {
		control?.focus();
		if (isListHidden) control?.click();
		else if (list.nodeName !== DATALIST) list.hidden = true;
	}

	if (clear?.contains(target as Node) && control) {
		e.preventDefault(); // Prevent button[type="reset"]
		const first = !multiple && items[0]; // Used to check if consumer removed <data> in their input handler
		const value = control.value;

		setValue(control, null, "deleteContentBackward");
		if (!first || !self.contains(first))
			control.value || dispatchChange(control); // No change event if value was edited during input handler
		else
			dispatchSelect(self, first, false, () => {
				if (!items[0]) return control.value || dispatchChange(control); // No change event if value was edited during input handler
				control.value || setValue(control, value, "insertText"); // If comboboxbeforeselect was prevented, and still no value, restore value
			});

		control.focus();
		return isListHidden || control.click(); // Open list if it was open before clicking clear
	}

	for (const item of items) {
		if (item.contains(target as Node)) return dispatchSelect(self, item);
		const rect = isSelf ? item.getBoundingClientRect() : ({} as DOMRect);
		const { y: t, right: r, bottom: b, x: l, width: w, height: h } = rect; // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (w && h && y >= t && y <= b && x >= l && x <= r) return item.focus(); // If item is larger than 0x0 and click is inside inside, focus it
	}
	if (isSelf) control?.focus(); // Focus input if clicking <u-combobox>
};

// Speed up by using a shared window capture listener for all instances in light DOM
const onWindowInput = (e: Event) => {
	const self = getCombobox(e.target as Node);
	if (self && !(self._root instanceof ShadowRoot)) self.handleEvent(e);
};

const onInput = (self: UHTMLComboboxElement, e: Partial<InputEvent>) => {
	const { control, options, list } = self;
	if (e.composedPath?.()[0] !== control) return; // Check real target since it might trigger from window
	const value = control.value;
	const isReplace = e.inputType === "insertReplacementText";
	const isPick =
		list?.nodeName === DATALIST
			? isReplace || (e.isTrusted && !e.inputType && value) // Native <datalist> picks with a trusted event: Firefox an InputEvent with insertReplacementText, WebKit and Chrome a plain Event without inputType
			: isReplace && !e.isTrusted; // An untrusted InputEvent with insertReplacementText is used by <u-datalist>
	const option =
		isPick && Array.prototype.find.call(options, (o) => getValue(o) === value);

	self._enter = false; // The pick replaces the pending Enter match
	if (e.isTrusted) self._expired = undefined; // Typing drops an expired commit, as the text no longer asks for that item
	if (option && !control.readOnly && !control.matches(":disabled")) {
		e.stopImmediatePropagation?.(); // Stop the input event, as dispatchSelect syncs the input if needed
		setValue(control, self._value || "");
		if (value) dispatchSelect(self, option, true); // Picking <option value=""> should not cause select
	} else self._value = value; // Also updates _value if readonly or disabled

	syncButtons(self);
};

const onKeyDown = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	self._enter = false; // Only the keydown right before the keyup can arm the match, so a keydown that moved focus or a modifier press never leaves it armed
	if (e.defaultPrevented) return; // Respect a keydown prevented by an earlier listener, i.e. a consumer capture listener or <u-datalist> navigating options
	if (e.ctrlKey || e.metaKey || e.shiftKey || e.key === "Alt") return; // Firefox sets altKey: false when VO key in VoiceOver
	if (self.control === e.target) onKeyDownControl(self, e);
	else onKeyDownItems(self, e);
};

const onKeyDownControl = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	const { clear, control, creatable, items, list } = self;
	const { isComposing, key: k, keyCode } = e;

	if (isComposing || keyCode === 229 || control?.readOnly) return; // The IME owns Enter and arrows while composing. Chrome has isComposing false on the keydown starting a composition, but keyCode 229
	if ((k === "ArrowLeft" || k === "Backspace") && control?.selectionEnd === 0) {
		items[items.length - 1]?.focus(FOCUS);
		e.preventDefault(); // Prevent sideways scroll
	}
	if (k === "Enter" && control && (list || creatable)) {
		const isNativeSafari = IS_SAFARI && list?.nodeName === DATALIST;
		const form = attr(control, "form");

		self._enter = true; // Match on keyup, see onKeyUp
		if (!isNativeSafari) return e.preventDefault(); // Safari stops datalist pick if click is prevented
		if (form === "#") return; // If holding Enter, avoid restoring # value
		attr(control, "form", "#"); // Temporarily remove form association to prevent submit on enter
		setTimeout(() => attr(control, "form", form));
	}
	if (k === "Tab" && control?.value) {
		if (!clear?.clientHeight || !clear.clientWidth) return; // Stop if clear is hidden
		e.preventDefault(); // Prevent default tab as we are moving into clear
		attr(clear, "aria-hidden", FALSE); // Allow screen readers to announce clear button as we are focusing it
		attr(clear, "tabindex", "0"); // Needed to prevent Safari from looping focus back to input on text Tab-press
		clear.focus(FOCUS); // Focus element, and show focus ring
		on(clear, "blur", () => syncButtons(self), EVENT_ONCE); // Revert on next blur
	}
};

const onKeyUp = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	if (!self._enter || e.key !== "Enter" || e.target !== self.control) return; // Only an armed keydown matches, so the modifier, IME, readonly and repeat guards stay on keydown
	self._enter = false;
	dispatchMatch(self);
};

const onKeyDownItems = (self: UHTMLComboboxElement, e: KeyboardEvent) => {
	const { clear, control, items } = self;
	const { key: k, repeat, target } = e;
	const index = Array.prototype.indexOf.call(items, target);

	if ((k === " " || k === "Enter") && (items[index] || target === clear)) {
		if (!repeat) (items[index] || clear)?.click();
		return e.preventDefault(); // Prevent scrolling or submitting
	}
	if (!items[index]) return;
	if (k.startsWith("Arrow") || k === "Backspace" || k === "Tab")
		e.preventDefault(); // Prevent scroll and navigation
	if (k === "ArrowLeft") return items[index - 1]?.focus(FOCUS);
	if (k === "ArrowRight") return (items[index + 1] || control)?.focus(FOCUS);
	if (k === "Backspace") return repeat || dispatchSelect(self, items[index]);
	control?.focus(); // Move focus when typing any character
};

const onMutations = (self: UHTMLComboboxElement, r?: MutationRecord[]) => {
	const { _listbox, control, items, list, multiple } = self;
	if (!control || r?.every(isNoopAttribute, self)) return; // Frameworks can re-write attributes on render (i.e. Vue sets option value, React syncs input value), which is not a state change
	if (list && r?.every(isInside, list)) return syncOptions(self); // Only the options changed (i.e. async search results)
	if (r?.every(isExpanded, self)) return syncButtons(self); // Only the open state changed, which only the toggle button mirrors

	const keys = Array.from(items, (el) => JSON.stringify(getItem(el))); // Use keys instead of nodes, as some frameworks re-render DOM nodes
	const prev = self._serialized || keys;
	const isInit = !r || r.some(isAdd, control) || r.some(isListOrMode, self);
	const isEdit = `${prev}` !== `${keys}`;

	self._value = control.value; // Also cache value attribute writes
	self._serialized = keys;

	for (const item of items) {
		attr(item, "hidden", multiple ? null : ""); // Avoid ARC Toolkit warning in single mode
		attr(item, "role", "option");
		attr(item, "slot", "items");
		attr(item, "tabindex", "-1");
		attr(item, "value", getValue(item));
	}
	if (list) attr(list, SAFE_MULTISELECTABLE, `${multiple}`);
	if (isEdit) announceItemChange(self, prev, keys);
	if (isEdit || isInit || (list && r?.some(isInside, list))) syncOptions(self);
	if (isEdit || isInit || r?.some(isAdd, self._select[0])) syncSelect(self);
	if (isEdit || isInit) {
		const hint = multiple
			? `${items.length ? srText(self, "found", "Navigate left to find %d selected").replace("%d", `${items.length}`) : srText(self, "empty", "No selected")}`
			: null;
		attr(control, "aria-description", hint); // Only when the count can have changed, as srText forces a style recalculation
	}
	attr(_listbox, "hidden", items.length ? null : ""); // Avoid Siteimprove warning about empty role="listbox"
	attr(control, "list", useId(list));
	syncButtons(self);
	self._umutate?.takeRecords(); // Clear mutations caused by our attribute writes, before dispatching events, so consumer mutations made in event handlers are kept

	if (!multiple && list) {
		const isPureCommit = self._commit?.value === control.value; // Dispatch change on pure user commit
		const isExpired = !!self._expired && keys[0] === self._expired; // The item an expired commit asked for, so the deferred render still carries change
		if (isInit) Promise.resolve().then(() => syncInputSingleMode(self));
		else if (isEdit) syncInputSingleMode(self, isPureCommit || isExpired); // Only initial sync is deferred as frameworks write their bound input value after insertion
	}
	if (isEdit) {
		self._expired = undefined; // Any item change resolves an expired commit, so an unrelated later change dispatches no change
		settleCommit(self); // An item change settles the pending commit, also by a consumer in controlled mode, so a later programmatic item change neither dispatches change nor announces through aria-label
	}
};

// Announce an added or removed item through aria-label when focus moved (chip removal), otherwise through the live region.
const announceItemChange = (
	self: UHTMLComboboxElement,
	prev: string[],
	next: string[],
) => {
	const { _announce, control, multiple, items } = self;
	const focus = getFocused(self);
	const remove = [...prev];
	const add: number[] = [];
	next.forEach((key, index) => {
		const match = remove.indexOf(key);
		match === -1 ? add.push(index) : remove.splice(match, 1);
	});
	const item = items[add[0]]; // The added item, if any. An addition is announced before a removal
	const speak = multiple ? add.length + remove.length === 1 : item === focus; // Only speak in single mode if item is visible and focused
	if (!speak || !control || !self.contains(focus)) return;

	clearTimeout(_announce?.reset);
	const label = _announce ? _announce.label : attr(control, ARIA_LABEL);
	const hint = `${srText(self, item ? "added" : "removed", item ? "Added" : "Removed")} ${item ? getText(item) : JSON.parse(remove[0]).label}, `;
	const css = hint.replace(/\s+/g, " ").replace(/[\\']/g, "\\$&"); // Collapse newlines and escape backslash and quote, as either would end the CSS string
	if (_announce) attr(control, ARIA_LABEL, label); // Restore before reading the accessible name
	if (!self._commit?.focus) setTimeout(() => ariaNotify(hint.slice(0, -2))); // Aria-live when no focus move belongs to the pending commit, remove trailing comma, setTimeout to take presence
	self._announce = { label, reset: setTimeout(announceReset, 300, self) }; // 300ms delay so screen readers announces new aria-label. Note: Causes short double/hiccup announce in NVDA Firefox
	self._listbox.style.setProperty(SR_ANNOUNCE, `'${css}'`); // On the listbox, as slotted items inherit from it, and the host style belongs to the consumer
	attr(control, ARIA_LABEL, `${hint}${getInputLabel(control)}`); // Make sure control also can aria-label-announce
};

const announceReset = (self: UHTMLComboboxElement) => {
	if (!self._announce) return; // Nothing to revert
	if (self.control) attr(self.control, ARIA_LABEL, self._announce.label); // Revert aria-label to original value after announcement
	clearTimeout(self._announce.reset);
	self._listbox.style.removeProperty(SR_ANNOUNCE);
	self._announce = undefined;
};

// Sync helpers
const syncSelect = (self: UHTMLComboboxElement) => {
	const { _umutate, _select, items, multiple } = self;
	if (_select[0])
		Object.assign(_select[0], { multiple, textContent: "" }).append(
			...Array.prototype.slice
				.call(items, 0, multiple ? undefined : 1)
				.map((item) => new Option(getText(item), getValue(item), true, true)),
		);
	_umutate?.takeRecords(); // Clear the mutation records of the rebuild
};

const syncOptions = ({ values, options }: UHTMLComboboxElement) => {
	for (const opt of options) {
		const selected = values.includes(getValue(opt));
		if ("selected" in opt) opt.selected = selected; // Avoid shadowing the accessor before u-option upgrades
		attr(opt, "selected", selected ? "" : null); // Also the attribute, as u-option might not be initialized yet
	}
};

const syncButtons = (self: UHTMLComboboxElement) => {
	const { clear, control, toggle, list } = self;
	const inert = control?.readOnly || control?.disabled; // Using .disabled since it is hidden by CSS when :disabled
	const clearable = clear && control?.value;
	if (clear) {
		const focused = control?.value && clear === getFocused(self); // It is possible to tab to clear button
		attr(clear, "aria-hidden", focused ? FALSE : IS_MOBILE); // Hide from screen readers to keep datalist open on mobile swipe right screen reader navigation
		attr(clear, "hidden", clearable && !inert ? null : "");
		attr(clear, "tabindex", focused ? "0" : "-1");
	}
	if (toggle) {
		const isNative = list?.nodeName === DATALIST;
		attr(toggle, "aria-expanded", `${!isNative && list?.hidden === false}`);
		attr(toggle, "aria-hidden", IS_MOBILE); // Hide from screen readers to keep datalist open on swipe right navigation
		attr(toggle, "hidden", !list || clearable || inert || isNative ? "" : null); // Hide toggle if native datalist
		attr(toggle, "tabindex", "-1");
		attr(toggle, "type", "button"); // Prevent submit
	}
};

const syncInputSingleMode = (self: UHTMLComboboxElement, change = false) => {
	const { isConnected, control, list, multiple, items } = self;
	if (!isConnected || !control || !list || multiple) return; // No need to sync input value if multiple or no datalist (free text)
	const value = getText(items[0]);
	const inputType = value ? "insertText" : "deleteContentBackward";
	if (value !== control.value) setValue(control, value, inputType, change); // Not cancelable, as the sync mirrors a confirmed item
};

// Mutations helpers
function isNoopAttribute(this: UHTMLComboboxElement, r: MutationRecord) {
	if (r.type !== "attributes") return false;
	const next = (r.target as Element).getAttribute(r.attributeName as string);
	if (r.target === this.control && r.attributeName === "value")
		return next === (this._value ?? ""); // Only treat as change if differing from cache, handling controlled inputs mirroring value attribute on every keystroke
	return r.oldValue === next;
}
function isInside(this: HTMLDataListElement, r: MutationRecord) {
	return r.target === this ? r.type === "childList" : this.contains(r.target);
}
function isAdd(this: Element | null, { addedNodes: a }: MutationRecord) {
	return !!this && Array.prototype.some.call(a, (n: Node) => n.contains(this));
}
function isExpanded(this: UHTMLComboboxElement, r: MutationRecord) {
	const isButton = r.target === this.control || r.target === this.toggle; // Also the toggle, as syncButtons writes aria-expanded on it outside the observer callback
	return isButton && r.attributeName === "aria-expanded";
}
function isListOrMode(this: UHTMLComboboxElement, r: MutationRecord) {
	if (isAdd.call(this.list, r)) return true; // A datalist is added
	if (r.target !== this || r.attributeName !== ATTR_MULTI) return false;
	return ((r.oldValue ?? FALSE) !== FALSE) !== this.multiple; // Ignore writes that do not change mode (i.e. null to "false" from frameworks)
}

// Element helpers
const getItem = (el: Element) => ({ label: getLabel(el), value: getValue(el) });
const getLabel = (el: Element) => attr(el, "label") ?? getText(el);
const getValue = (el: Element) => attr(el, "value") ?? getText(el);
const getCombobox = (input?: Node) => {
	const el = input?.parentElement as UHTMLComboboxElement | null | undefined;
	return el && VERSIONS[VERSION].has(el) && el.control === input ? el : null;
};
// biome-ignore format: next-line
function isMatch(this: string, opt: HTMLOptionElement) {
	return !opt.hidden && !(opt.disabled ?? opt.hasAttribute("disabled")) && getLabel(opt).trim().toLowerCase() === this.toLowerCase();
}
const isSelected = (opt: HTMLOptionElement) =>
	opt.selected ?? opt.hasAttribute("selected");

if (isBrowser() && !VERSIONS[VERSION]) {
	VERSIONS[VERSION] = new WeakSet(); // Support hot module reload, and several versions on same page
	on(window, "input", onWindowInput, true); // Respond to input events on window for Qwik support
	const prototype = HTMLInputElement.prototype;
	const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
	if (descriptor)
		Object.defineProperty(prototype, "value", {
			...descriptor,
			set(next: string) {
				const prev = this.value;
				descriptor.set?.call(this, next);
				const owner = prev !== this.value && getCombobox(this);
				if (owner) onProgrammatic(owner); // Respond to programmatic input.value changes
			},
		});
}

customElements.define("u-combobox", UHTMLComboboxElement);
