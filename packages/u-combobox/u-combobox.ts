import {
	afterRender,
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	declarativeShadowRoot,
	dispatchChange,
	EVENT_ONCE,
	FOCUS_OUTLINE,
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
	speak,
	tag,
	UHTMLElement,
	useId,
} from "../utils";
import { version } from "./package.json"; // Identity of this implementation

/**
 * SPECIFICATION
 *
 * Vocabulary
 * - item:         a <data> inside <u-combobox>. Single mode has at most one item, multiple mode has any number
 * - option:       an <option> inside the <datalist> / <u-datalist>
 * - text:         the current input value
 * - cached text:  the text last seen from typing, the value attribute or the value property (_value).
 *                 The clear button remembers the text before clearing, so a prevented remove can revert to it
 * - same text:    trimmed text equals an item's text, case sensitive. Compared against items, never against options.
 *                 Only used by blur, as the item is an already confirmed selection. Enter always matches against the options.
 * - announce:     announce data-sr-invalid through the live region. Skipped while the datalist has aria-busy="true",
 *                 as the options are still loading
 * - match:        dispatch comboboxbeforematch with the first option whose label equals the trimmed text case-insensitive. Only on Enter and blur, never while typing.
 *                 The consumer can prevent and set option.selected to pick another option. The result is the matched option,
 *                 or a new item made from the text when creatable and no option matched (Enter only, never blur), or nothing.
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
 * - revert input: set text back to the cached text
 * - commit:       a select from a user action. The item change that follows consumes it, also when the consumer prevented
 *                 and renders the item itself (controlled mode), so the sync dispatches change. Expires unconsumed after the
 *                 render opportunity (one microtask, then one MessageChannel task), so a later programmatic item change dispatches no change.
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
 * - Both:     revert input, then select the option. Never match. Picking <option value=""> only reverts input.
 *             <u-datalist> cancels mousedown inside the list, so the press never blurs the input and the browser never dispatches change with the typed text
 * - Single:   replace. Accepted: sync input. Prevented: the reverted text stays until blur. Picking the current item only syncs input
 * - Multiple: toggle. Text is not changed
 *
 * Enter in input (form submit is prevented when a datalist is present or creatable)
 * - Empty text
 *   - Single:   select to remove the item, if any. Accepted: remove and sync input. Prevented: nothing, the empty text stays until blur, which asks to remove again
 *   - Multiple: nothing
 * - Text (also when equal to an item, as an item can only be toggled through its option)
 *   - Both:     match. No result: announce, unless the text equals an item, as a confirmed item is never invalid
 *   - Single:   no result: typed text stays until blur. Result equal to the current item: sync input.
 *               Otherwise replace. Accepted: sync input. Prevented: nothing, typed text stays until blur
 *   - Multiple: no result: nothing. Otherwise toggle. Text is not changed
 *
 * Blur (focus leaves <u-combobox>; a pointer down inside defers the check until the press ends, so a click can refocus first)
 * - Multiple: nothing
 * - Readonly: nothing, also when the text was set programmatically. A readonly input can be focused, so blur is gated like every other action
 * - Single + empty text:  select to remove the item, if any. Accepted: remove. Prevented: sync input
 * - Single + same text:   sync input, which only writes when the text differs from the item in surrounding whitespace
 * - Single + other text:  match, but never create from text. No result: sync input. Result equal to the current item: sync input.
 *                         Otherwise replace. Accepted: sync input. Prevented: sync input
 *
 * Clear button (button[type="reset"])
 * - Both:     empty the text (dispatches input), focus input, re-open the list if it was open
 * - Single:   remember the text before the clear, then select to remove the item, if any. Accepted: remove. Prevented: revert input to the remembered text
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
 * - Disabled or readonly input: every action above is ignored, blur included. Only the text of a sync or consumer write is still cached
 * - No datalist: free text. Input is never synced, match is never dispatched
 *
 * | Action       | Single                                                    | Multiple                              |
 * | :----------- | :-------------------------------------------------------- | :------------------------------------ |
 * | Pick         | Revert input -> replace -> sync input                     | Revert input -> toggle                |
 * | Type         | Cache text                                                | Cache text                            |
 * | Enter empty  | Remove item                                               | Nothing                               |
 * | Enter text   | Match -> replace/create -> sync, else announce, keep text | Match -> toggle/create, else announce |
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

export const UHTMLComboboxStyle = `${DISPLAY_BLOCK}
[part="items"]:not([hidden]) { display: inline-flex; flex-wrap: wrap } /* Can not be "contents" as this confuses VoiceOver */
:host(:not([data-multiple])) [part="items"],
:host([data-multiple="false"]) [part="items"] { display: none }
::slotted(del),
::slotted(button[type="reset"]),
::slotted(button[aria-expanded]) { font: inherit; border: 0; padding: 0; background: none; color: inherit; cursor: pointer; text-decoration: none }
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

type Registry = Record<typeof VERSION, WeakSet<UHTMLComboboxElement>>;
const REGISTRY = (isBrowser() ? window : {}) as Registry; // Keyed on version so several versions can coexist, without augmenting Window
const VERSION = `_uComboboxes${version}` as const; // Resolve programmatic input.value changes with multi-version support
const ATTR_MULTI = "data-multiple";
const ARIA_LABEL = "aria-label";
const CSS_CLEAR = `button[type="reset"],del`;
const CSS_TOGGLE = `button[aria-expanded]`;
const CSS_DATALIST = `datalist,u-datalist,[role="listbox"]`;
const CSS_OPTION = `option,u-option,[role="option"]`;
const FOCUS_VISIBLE = { focusVisible: true };
const EVENTS = "beforeinput focus click keydown mousedown"; // blur and pointerdown are handled by onFocusLeave
const FALSE = "false";

// A select from a user action, pending until the item change that follows consumes it, or it expires unconsumed after the render opportunity. See SPECIFICATION
type Commit = {
	focus: boolean; // Focus moved to a neighbour before the select, so a removal announces through aria-label instead of the live region
	text: string; // Input text at the select, so the sync following the item change dispatches change only while the text is still this
	then?: (consumed: boolean) => void; // Runs once when settled: consumed by an item change (true), or expired unconsumed (false)
};

// An added or removed item announcement, prefixing the aria-labels of the input and items until reset. See announceItemChange
type Announce = {
	text: string; // Prefix such as "Added Apple, "
	label: string | null; // Pristine aria-label of the input, restored by speakReset
	reset: ReturnType<typeof setTimeout>; // Pending speakReset, replaced when a new announcement arrives within the reset delay
};

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
	_select?: HTMLSelectElement | null;
	_toggle?: HTMLElement | null;
	_texts = { ...TEXTS };

	_announce?: Announce; // Pending announcement prefixing aria-labels, see announceItemChange
	_commit?: Commit; // Pending user commit (pick, Enter, blur, clear, chip removal), see dispatchSelect. Settled by identity, so a commit never settles a later one
	_isDatalistPick?: ReturnType<typeof setTimeout>; // Timeout between beforeinput and input of a <u-datalist> pick, see onBeforeinput
	_singleItem?: string | null; // Item value and text to detect item change in single mode. Null when no item, undefined until first sync so the first run always syncs
	_value?: string; // Cache value to be able to revert on datalist click

	static get observedAttributes() {
		return Object.keys(TEXTS).map((key) => `data-sr-${key}`); // Using ES2015 syntax for backwards compatibility. data-multiple is handled by the MutationObserver, so a mode change syncs batched with the framework render
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
		REGISTRY[VERSION]?.add(this);
		this._root = getRoot(this);
		this._unfocus = onFocusLeave(this, () => onCommit(this, true)); // Blur commit, deferred while an item or button is pressed
		this._umutate = onMutation(this, onMutations, {
			attributeFilter: [
				"aria-expanded",
				"disabled",
				"id",
				"readonly",
				"role",
				"value",
				ATTR_MULTI,
			], // disabled and readonly re-sync the clear and toggle buttons
			attributeOldValue: true, // Needed to ignore no-op attribute writes from frameworks, and to detect a mode change
			attributes: true,
			characterData: true, // Respond to changes in <data> textContent
			childList: true,
			subtree: true,
		});
		// In light DOM, input is handled by the shared window capture listener (see onWindowInput), which runs before frameworks delegating from document (i.e. Qwik), so a datalist pick can be reverted before they read the value.
		// Inside a shadow root, bind to this instead: a window listener can not see the input through a closed shadow root, and delegating frameworks only see the retargeted host anyway
		if (this._root instanceof ShadowRoot) on(this, "input", this, true);
		on(this, EVENTS, this, true); // Bind events using capture phase to run before frameworks
		on(this._root, "reset", this, true); // Form reset does not dispatch input or call the value setter, so listen on the root as reset targets the form
	}
	attributeChangedCallback(prop: string, _: string, next?: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = next || TEXTS[text]; // Cache text attributes for performance
		if (text === "clear" && this.clear)
			attr(this.clear, ARIA_LABEL, this._texts.clear); // Backwards compatible only update clear aria-label if data-sr-clear is set
	}
	disconnectedCallback() {
		off(this, "input", this, true); // If in ShadowDOM, light DOM is handled by the shared window listener
		off(this, EVENTS, this, true);
		if (this._root) off(this._root, "reset", this, true);
		clearDatalistPick(this);
		announceReset(this); // Revert a prefixed aria-label
		REGISTRY[VERSION]?.delete(this);
		this._unfocus?.();
		this._umutate?.();
		// biome-ignore format: next-line
		this._commit = this._root = this._umutate = this._unfocus = this._clear = this._toggle = this._control = this._select = this._options = this._items = this._list = this._singleItem = this._value = undefined;
	}
	handleEvent(e: Event): void {
		const { type, target } = e;
		if (type === "reset") {
			if (target === this.control?.form) setTimeout(onReset, 0, this, e); // Controls are reset after the reset event has dispatched, so defer. Also when disabled or readonly
			return; // Explicit void return type, returning setTimeout causes different types in DOM and Node
		}
		if (type === "input" && e.composedPath()[0] !== this.control) return; // Listener is on window or this, so check the real target also inside nested shadow roots
		if (type !== "input" && isInert(this)) return; // input passes while inert, as the text of a sync must be cached and setRangeText bypasses the value setter. No user action dispatches input then, so only syncs and consumer writes reach onInput
		if (type === "beforeinput") onBeforeinput(this, e);
		if (type === "click") onClick(this, e as MouseEvent);
		if (type === "focus") speak(); // Prepare for aria-live announcements
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
			this._control = this.querySelector(':scope > input:not([type="hidden"])'); // Pure lookup, a new or replaced input is detected by onMutations through its mutation record
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
	const find = value.toLowerCase();
	let match: HTMLOptionElement | undefined;

	if (list) {
		match = [...options].find(
			(o) => !isDisabled(o) && getLabel(o).trim().toLowerCase() === find,
		);
		const event = { bubbles: true, cancelable: true, detail: match };

		if (!self.dispatchEvent(new CustomEvent("comboboxbeforematch", event)))
			match = [...options].find(isSelected); // Prevented means custom matching, so use the first option the consumer selected

		syncOptionsWithItems(self); // Keep option selection on the current items, as consumer can change option.selected in comboboxbeforematch. The matched option is selected by onMutations once its <data> is added, so a prevented or restored select never leaves a stale selection
	}

	if (!match && create && self.creatable) return { value, label: value }; // Create from text if no match and creatable
	return match && getItem(match);
};

// Returns false if prevented by comboboxbeforeselect, so the caller can decide what happens to the input.
// Pass fromOption = true when the item comes from a match or pick: single mode then only re-confirms an existing item, while a chip removes it.
// Pass then to run once the commit is settled, see Commit
const dispatchSelect = (
	self: UHTMLComboboxElement,
	item: { value: string; label?: string },
	fromOption = false,
	then?: Commit["then"],
) => {
	settleCommit(self, self._commit, false); // A superseded commit expires unconsumed, so a pending blur or clear revert runs before this select reads the text. Must run first, as the revert would otherwise rewrite the input after the new commit recorded its text, and the sync that follows would skip change
	if (item instanceof HTMLDataElement) item = getItem(item);
	const { control, items, multiple, values } = self;
	const index = values.indexOf(item.value); // Single mode only acts on the first item, as extra <data> kept from multiple mode are not mirrored
	const remove = items[index];
	const focus =
		remove === getFocused(self) &&
		(multiple ? items[index - 1] || items[index + 1] || control : control);

	if (remove && fromOption && !multiple) {
		syncInputWithItemSingleMode(self, true); // Already the item in single mode, so only sync the input text. Multiple mode toggles. A <u-datalist> pick runs this inside its own input dispatch, and its setValue skips its change as this one already committed the text
		return true;
	}
	if (focus) focus.focus(FOCUS_VISIBLE); // Move focus if item might be removed (can be prevented by comboboxbeforeselect)

	const add = tag("data", { value: item.value }, item.label || item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };
	const accepted = self.dispatchEvent(
		new CustomEvent("comboboxbeforeselect", event),
	);
	// Record the commit after the dispatch, as the consumer may write the input in the handler. Also when prevented, as a consumer rendering the item itself (controlled mode) consumes it through the item change.
	// Expire after the render opportunity if no item change consumed it, so a prevented select neither silences the live region nor dispatches change on a later programmatic item change.
	// Queued after the dispatch, so the consumer's own scheduling in the handler is ahead of it
	const commit: Commit = { focus: !!focus, text: control?.value || "", then };
	self._commit = commit;
	afterRender(() => settleCommit(self, commit, false));
	if (accepted) {
		if (!multiple) for (const el of [...items]) el.remove(); // Single mode holds at most one item, so extras kept from multiple mode are dropped on the first select. Spread, as items is live
		if (remove) remove.remove();
		else control?.insertAdjacentElement("beforebegin", add);
		self.dispatchEvent(new CustomEvent("comboboxafterselect", event));
		return true;
	}
	return false;
};

// Settle a commit once: consumed by an item change, or expired unconsumed after the render opportunity. No-op if already settled or superseded by a later commit
const settleCommit = (
	self: UHTMLComboboxElement,
	commit: Commit | undefined,
	consumed = true,
) => {
	if (!commit || self._commit !== commit) return;
	self._commit = undefined;
	commit.then?.(consumed);
};

// Shared by Enter and blur, see SPECIFICATION. Blur comes from onFocusLeave, deferred while an item or button is pressed
const onCommit = (self: UHTMLComboboxElement, isBlur = false) => {
	const { control, items, list, multiple } = self;
	if (!control || !self.isConnected) return; // Unmounted before the blur timeout
	if (isBlur && (multiple || isInert(self))) return; // Nothing to do in multiple mode. Blur bypasses handleEvent, so apply the same inert gate as every other action
	const value = control.value.trim();
	const isItem = multiple
		? Array.from(items, getText).includes(value)
		: getText(items[0]) === value; // Text equal to a confirmed item is never invalid. Enter still matches against the options, as an item can only be toggled through its option
	// A prevented select on blur falls back to the item once the commit expires, as leaving the field is not a confirmation.
	// A consumer changing the item meanwhile consumes the commit, and the item change is already synced.
	// Enter keeps the typed text when prevented
	const then = isBlur
		? (consumed: boolean) => consumed || syncInputWithItemSingleMode(self, true)
		: undefined;

	if (!value) {
		// Empty text removes the item in single mode, and is nothing in multiple mode
		if (!multiple && items[0]) dispatchSelect(self, items[0], false, then);
		else if (isBlur) syncInputWithItemSingleMode(self, true); // Sync input to trim input value
	} else if (!isBlur || !isItem) {
		const match = dispatchMatch(self, value, !isBlur); // Blur never creates from text, as leaving the field is not a confirmation
		if (match) dispatchSelect(self, match, true, then);
		else if (isBlur)
			syncInputWithItemSingleMode(self, true); // No match on blur falls back to the item
		else if (list && !isItem && attr(list, "aria-busy") !== "true")
			speak(self._texts.invalid); // No match on Enter keeps the typed text
	} else syncInputWithItemSingleMode(self, true); // Blur on the item text only trims surrounding whitespace, as the item is a confirmed selection
};

// Keep focus on the input when pressing the toggle or clear button, so no blur closes <u-datalist> before the click and onClick can read live state.
// mousedown (also the compatibility mousedown after a touch tap) is what moves focus, and cancelling it never suppresses the click.
// Cancelling pointerdown instead would also work on desktop, but WebKit then drops the click on a touch tap
const onMousedown = (self: UHTMLComboboxElement, event: Event) => {
	const { clear, toggle } = self;
	const target = event.target as Node;
	if (clear?.contains(target) || toggle?.contains(target))
		event.preventDefault();
};

const onReset = (self: UHTMLComboboxElement, event: Event) => {
	if (!self.isConnected || event.defaultPrevented) return;
	onProgrammatic(self); // Cache the restored value and sync buttons
	syncInputWithItemSingleMode(self); // Items are not form controls, so they are not reset, and single mode keeps mirroring the item
};

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	const { clear, control, items, list, toggle, multiple } = self;
	const hasHiddenDatalist = !!list?.hidden; // Live state is reliable, as onMousedown keeps focus on the input while pressing the toggle or clear button
	const isSelf = target === self;

	if (toggle?.contains(target as Node)) {
		control?.focus();
		if (hasHiddenDatalist) control?.click();
		else if (list && list.nodeName !== "DATALIST") attr(list, "hidden", ""); // Close explicitly, as the blur-close of <u-datalist> loses to the refocus above on touch
	}

	if (control && clear?.contains(target as Node)) {
		event.preventDefault(); // Prevent button[type="reset"]
		const text = self._value || "";
		const item = multiple ? undefined : items[0];

		// With an item, the emptied text is committed once the removal has consumed the commit, also by a consumer in controlled mode, and only if the text is still empty,
		// as a replaced item is already synced with change. A prevented removal expires the commit and reverts to the text before the clear without change, as the text ends up unchanged
		const then = (consumed: boolean) => {
			if (consumed) return control.value || dispatchChange(control);
			if (text !== control.value) setValue(control, text, "insertText", false); // Prevent input event being handled as "click" on option
		};

		// If a synchronous input handler removes the selected <data> when the text is cleared, setValue runs that handler before this call
		if (setValue(control, "", "deleteContentBackward", !item) && item) {
			if (self.contains(item)) dispatchSelect(self, item, false, then);
			else dispatchChange(control); // Already removed, so the emptied text is committed now
		}
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

// A <u-datalist> pick dispatches an untrusted beforeinput with insertReplacementText before writing the value, so the pick is flagged until its input event.
// This is what tells a pick from a trusted insertReplacementText (Firefox native datalist, spell check), which never flags
const onBeforeinput = (self: UHTMLComboboxElement, e: Partial<InputEvent>) => {
	const isPick = e.inputType === "insertReplacementText" || isLegacyPickType(e);
	if (!e.isTrusted && e instanceof InputEvent && isPick) {
		clearDatalistPick(self); // Keep the latest pick flagged if two picks happen in the same task
		self._isDatalistPick = setTimeout(clearDatalistPick, 0, self); // Input might never follow, i.e. if a consumer prevents beforeinput
	}
};

const clearDatalistPick = (self: UHTMLComboboxElement) => {
	clearTimeout(self._isDatalistPick);
	self._isDatalistPick = undefined; // Input might never follow, i.e. if a consumer prevents beforeinput
};

const onInput = (self: UHTMLComboboxElement, event: Partial<InputEvent>) => {
	const { control, options, _isDatalistPick: isPick } = self;
	const { isTrusted, inputType } = event;
	const value = control?.value || "";
	const isNative = self.list?.nodeName === "DATALIST"; // Only a native <datalist> picks through a trusted event, as <u-datalist> is flagged by onBeforeinput. Trusted replacements are otherwise spell check or autofill
	const isReplace =
		isPick || (isNative && inputType === "insertReplacementText"); // <u-datalist>, and Firefox native <datalist>. Only a <u-datalist> pick of <option value=""> has an empty value
	const isClick = isReplace || (isNative && isTrusted && !inputType && value); // WebKit and Chrome native <datalist> use Event (not InputEvent), but so does type="search" clear (empty value) and autofill
	const match = isClick && [...options].find((o) => getValue(o) === value); // Only accept as option click if value corresponds to an option, avoiding false positives on spell check or autofill

	clearDatalistPick(self); // Consumed, so the sync input that follows a select, and value writes by the consumer in comboboxafterselect, are not taken for the pick
	if (match && control) {
		event.stopImmediatePropagation?.(); // Prevent input as dispatchSelect will trigger input if needed
		setValue(control, self._value || "", false); // Revert input value as we allow the user to event.preventDefault in comboboxbeforeselect
		if (value) dispatchSelect(self, match, true); // Clicking a <option value=""> should not cause select. Prevented keeps the reverted text until blur
	} else self._value = value; // Typed text, and also replacement text without an option value (i.e. Firefox spell check or autofill), so a later click reverts to it

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
		e.preventDefault(); // Prevent sideways scroll
	}
	if (e.key === "Enter" && control && (list || creatable)) {
		preventSubmit(control); // Prevent submitting form as we want to perform a match instead, also on key repeat
		if (!e.repeat) onCommit(self); // Matches against the options present now, so no state is kept while typing. Holding Enter commits once, so a toggle or creatable item does not flicker
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
		if (!repeat) (items[index] || clear)?.click(); // Trigger click to ensure consistent behavior with mouse and screen readers. Holding the key removes one item, as focus moves to the next item on removal
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
	if (!self.control || edit?.every(isNoopAttribute, self)) return;
	const { _texts, control, items, list, multiple, toggle } = self;
	const isNew = !edit || edit.some(isControlAdded, self); // Mount, or a new or replaced input

	if (isNew || edit?.some(isControlValueChange, self))
		self._value = control.value; // Cache the initial value, or an attribute changing a pristine input without hitting the prototype setter
	if (isNew || !list || edit?.some(isModeChange, self))
		self._singleItem = undefined; // Treat as first sync, so a replaced input, a mode change or a re-added datalist gets a deferred input sync like on mount, as the input may hold filter text

	const edits: Node[] = [];
	for (const { addedNodes: add, removedNodes: del } of edit || []) {
		for (const el of add) if (el.nodeName === "DATA") edits.unshift(el); // Added nodes to the front
		for (const el of del) if (el.nodeName === "DATA") edits.push(el); // Removed nodes to the back
	}
	announceItemChange(self, edits);

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
	syncSingleInputWithItemChange(self); // Runs last as it dispatches events, and consumes the pending commit on an item change in single mode with a datalist
	if (edits.length && (multiple || !list)) settleCommit(self, self._commit); // Otherwise any added or removed item consumes the pending commit. Not in single mode with a datalist, as a prevented select re-rendered as a new <data> with the same text and value is no item change, and the commit must expire for the blur or clear fallback to run
};

// Announce an added or removed item through aria-label when focus moved (chip removal), otherwise through the live region
const announceItemChange = (self: UHTMLComboboxElement, edits: Node[]) => {
	const { _announce, _texts, control, multiple } = self;
	const focus = getFocused(self);
	const doSpeak = multiple ? edits.length === 1 : edits[0] === focus; // Only speak in single mode if item is visible and focused
	if (!doSpeak || !control || !self.contains(focus)) return;

	clearTimeout(_announce?.reset);
	const label = _announce ? _announce.label : attr(control, ARIA_LABEL);
	if (_announce) attr(control, ARIA_LABEL, label); // Restore before reading the accessible name
	const text = `${_texts[edits[0].isConnected ? "added" : "removed"]} ${getText(edits[0])}, `;
	self._announce = { text, label, reset: setTimeout(announceReset, 300, self) }; // 300ms delay so screen readers announces new aria-label. Note: Causes short double/hiccup announce in NVDA Firefox
	attr(control, ARIA_LABEL, `${text}${getInputLabel(control)}`); // Make sure control also can aria-label-announce
	if (!self._commit?.focus) setTimeout(() => speak(text.slice(0, -2))); // Aria-live when no focus move belongs to the pending commit, remove trailing comma, setTimeout to take presence
};

// Sync input with item in single mode with list, but only if item has actually changed
const syncSingleInputWithItemChange = (self: UHTMLComboboxElement) => {
	if (self.multiple || !self.list || !self.control) return;
	const item = self.items[0];
	const prev = self._singleItem;
	const next = item ? JSON.stringify([getText(item), getValue(item)]) : null; // Key on value and text, as a datalist pick between options with equal labels only changes the value;
	self._singleItem = next;

	// First sync is deferred, as frameworks write their bound input value after insertion (Vue v-model mounted, Angular ngModel) or ignore events during render (React commit)
	// Using Promise.resolve() and not setTimeout() as this ensures deferral without a browser painted frame inbetween
	if (prev === undefined)
		Promise.resolve().then(() => {
			if (self.isConnected) syncInputWithItemSingleMode(self);
		});
	else if (prev !== next) {
		const commit = self._commit;
		syncInputWithItemSingleMode(self, commit?.text === self.control.value); // Dispatch change only if the item change follows a user commit, and the text is still the committed text
		settleCommit(self, commit); // Consumed, also when no text needed syncing (i.e. clear removed the item), so a later programmatic item change does not dispatch change
	}
};

const announceReset = (self: UHTMLComboboxElement) => {
	if (!self._announce) return; // Nothing to revert
	if (self.control) attr(self.control, ARIA_LABEL, self._announce.label); // Revert aria-label to original value after announcement
	clearTimeout(self._announce.reset);
	self._announce = undefined;
	syncItems(self);
};

// Sync helpers
const syncItems = (self: UHTMLComboboxElement) => {
	const { _announce, _listbox, _texts, items, multiple } = self;
	const prefix = _announce?.text ?? "";

	let idx = 0;
	for (const item of items) {
		const text = `${prefix}${getText(item)}, ${_texts.remove}${IS_IOS ? `, ${++idx} ${_texts.of} ${items.length}` : ""}`;
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
		const option = _select.options[idx++]; // Use existing option if available
		const text = getText(item);
		const value = getValue(item); // u-option might not be initialized yet

		if (option)
			Object.assign(option, { defaultSelected, selected, text, value });
		else {
			if (!append) append = document.createDocumentFragment();
			append.appendChild(new Option(text, value, true, true));
		}
	}
	for (const opt of [..._select.options].slice(idx)) opt.remove(); // Remove unused options, none when appending
	if (append) _select.appendChild(append);
	self._umutate?.takeRecords(); // Clear mutation records caused by adding/removing <option> elements
};

const syncButtonsWithInput = (self: UHTMLComboboxElement) => {
	const { clear, control, toggle, list } = self;
	const isInertControl = isInert(self);
	const isIdle = !control?.value || isInertControl;
	if (clear?.nodeName === "DEL") attr(clear, "role", "button"); // Backwards compatibility for older versions using <del> as clear button
	if (clear) {
		const focused = !isIdle && clear === getFocused(self); // Keep focusable and visible to screen readers while focused after tabbing to clear, as closing the datalist triggers a sync. Never while idle, as setting hidden on the focused clear blurs it synchronously in Chromium, re-entering this sync before the outer call writes its stale focused state
		attr(clear, ARIA_LABEL) || attr(clear, ARIA_LABEL, self._texts.clear); // Set default aria-label if not set by consumer
		attr(clear, "aria-hidden", focused ? FALSE : `${IS_IOS || IS_ANDROID}`); // Hide from screen readers to keep datalist open on swipe right navigation
		attr(clear, "hidden", isIdle ? "" : null);
		attr(clear, "tabindex", focused ? "0" : "-1");
	}
	if (toggle) {
		// Show toggle only if idle, not disabled or readonly, and <u-datalist> is present, as native <datalist> can not be opened programmatically
		const show =
			isIdle && !isInertControl && list && list.nodeName !== "DATALIST";
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
	for (const opt of options) {
		const selected = values.includes(getValue(opt));
		if ("selected" in opt) opt.selected = selected; // Avoid shadowing the accessor before u-option upgrades
		attr(opt, "selected", selected ? "" : null); // Also add attribute as u-option might not be initialized yet
	}
};

// TODO: aria-required="true" => setCustomValidity
// Pass dispatchChange = true when the sync follows a user commit, so change is dispatched like the browser does on user input
const syncInputWithItemSingleMode = (
	self: UHTMLComboboxElement,
	dispatchChange = false,
) => {
	if (!self.control || !self.list || self.multiple) return; // No need to sync input value if multiple or no datalist (free text)
	const { control, items } = self;
	const value = getText(items[0]);
	const action = value ? "insertText" : "deleteContentBackward";
	if (value !== control.value)
		setValue(control, value, action, dispatchChange, false); // Not cancelable, as the sync mirrors a confirmed item and the veto point is comboboxbeforeselect. A cancelled sync would leave the input showing text the item state no longer has. Prevent input event being handled as "click" on option. The input event caches the text in onInput, also while disabled or readonly
};

// Mutations helpers
// Frameworks re-write attributes on render (i.e. Vue sets option value, React syncs input value), which is not a state change
function isNoopAttribute(this: UHTMLComboboxElement, r: MutationRecord) {
	if (r.type !== "attributes") return false;
	const next = (r.target as Element).getAttribute(r.attributeName as string);
	if (r.target === this.control && r.attributeName === "value")
		return next === (this._value ?? ""); // Controlled inputs mirror the value attribute on every keystroke, so only treat as change if differing from the value we have seen (i.e. attribute set on pristine input)
	return r.oldValue === next; // Same value written again
}

function isControlAdded(this: UHTMLComboboxElement, r: MutationRecord) {
	const { control } = this;
	return Array.prototype.some.call(r.addedNodes, (node: Node) =>
		node.contains(control),
	); // The current input was inserted in this batch, so it is new or replaced
}

function isControlValueChange(this: UHTMLComboboxElement, r: MutationRecord) {
	return r.target === this.control && r.attributeName === "value";
}

function isModeChange(this: UHTMLComboboxElement, r: MutationRecord) {
	if (r.target !== this || r.attributeName !== ATTR_MULTI) return false;
	return ((r.oldValue ?? FALSE) !== FALSE) !== this.multiple; // Ignore writes that do not change mode (i.e. null to "false" from frameworks)
}

// Element helpers
const getLabel = (el: Element) => attr(el, "label") ?? getText(el);
const getValue = (el: Element) => attr(el, "value") ?? getText(el);
const getItem = (el: Element) => ({ label: getLabel(el), value: getValue(el) });
const isDisabled = (opt: HTMLOptionElement) =>
	opt.disabled ?? opt.hasAttribute("disabled");
const isSelected = (opt: HTMLOptionElement) =>
	opt.selected ?? opt.hasAttribute("selected");
const isInert = ({ control }: UHTMLComboboxElement) =>
	control?.readOnly || control?.matches(":disabled"); // Using :disabled to respect fieldset[disabled] as well

// Compatibility with <u-datalist> before 3.0.0. To drop support, delete this section and inline false at its two call sites:
// - Before 2.0.3 the pick events had an empty inputType instead of insertReplacementText (onBeforeinput)
// - Before 3.0.0 the picked value was written through the prototype setter, which must not be taken for programmatic input (value setter below)
const isLegacyPickType = (e: Partial<InputEvent>) =>
	e.inputType === "" && typeof e.data === "string"; // Old picks always carried the option value as data, unlike a synthetic beforeinput without init (i.e. testing-library)
const isLegacyPickWrite = (self: UHTMLComboboxElement) =>
	!!self._isDatalistPick;

// Resolve the connected <u-combobox> of this implementation owning an input
const getOwner = (input: Node | null | undefined) => {
	const parent = input?.parentElement as UHTMLComboboxElement;
	return parent && REGISTRY[VERSION].has(parent) ? parent : null;
};

// One shared window capture listener for all instances in light DOM, instead of one per instance running for every input event on the page.
// Only light DOM instances are served here, where the input is never retargeted, so event.target is the input and no composedPath() array is allocated for every input event on the page
const onWindowInput = (event: Event) => {
	const owner = getOwner(event.target as Node);
	if (owner && !(owner._root instanceof ShadowRoot)) owner.handleEvent(event); // Instances in a shadow root listen on themselves, so skip to not handle twice through an open shadow root
};

// Respond to programmatic input.value changes, and to input events in light DOM
if (isBrowser() && !REGISTRY[VERSION]) {
	REGISTRY[VERSION] = new WeakSet(); // Support hot module reload, and several versions on same page
	on(window, "input", onWindowInput, true);
	const proto = HTMLInputElement.prototype;
	const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
	const set = function (this: HTMLInputElement, next: string) {
		const prev = this.value; // Compare actual values as next might be number or null
		descriptor?.set?.call(this, next); // Call the original native setter to actually update the DOM
		const owner = prev !== this.value && getOwner(this);
		if (owner && !isLegacyPickWrite(owner)) onProgrammatic(owner);
	};
	Object.defineProperty(proto, "value", { ...descriptor, set });
}

customElements.define("u-combobox", UHTMLComboboxElement);
