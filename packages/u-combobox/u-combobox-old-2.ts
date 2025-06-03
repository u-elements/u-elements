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
	_chips?: HTMLCollectionOf<HTMLDataElement>;
	_clear?: HTMLElement | null;
	_focus?: HTMLElement;
	_input?: HTMLInputElement | null; // Speed up by caching
	_list?: HTMLDataListElement | null;
	_options?: HTMLCollectionOf<HTMLOptionElement>;
	_root?: Document | ShadowRoot;
	_select?: HTMLSelectElement | null;
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
		mutationObserver(this, { childList: true, subtree: true });
		setTimeout(render, 0, this); // Delay to allow DOM to be ready
		setTimeout(syncInputValue, 0, this); // Sync input value without triggering event
	}
	attributeChangedCallback(prop: string, _: string, val: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = val || TEXTS[text];
	}
	disconnectedCallback() {
		mutationObserver(this, false);
		off(this, EVENTS, this, true);
		this._chips = this._clear = this._focus = this._input = undefined;
		this._list = this._options = this._root = this._select = undefined;
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
		return this.select?.multiple || false;
	}
	set multiple(value: boolean) {
		if (this.select) this.select.multiple = value;
	}
	get creatable() {
		return (attr(this, "data-creatable") ?? FALSE) !== FALSE; // Allow data-creatable="false" to be more React friendly
	}
	set creatable(value: boolean) {
		attr(this, "data-creatable", value ? "" : null);
	}
	get nochips() {
		return (attr(this, "data-nochips") ?? FALSE) !== FALSE; // Allow data-nochips="false" to be more React friendly
	}
	set nochips(value: boolean) {
		attr(this, "data-nochips", value ? "" : null);
	}
	get input(): HTMLInputElement | null {
		if (!this._input?.isConnected) this._input = this.querySelector("input");
		return this._input; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control
	}
	get list(): HTMLDataListElement | null {
		if (!this._list?.isConnected)
			this._list = this.querySelector("u-datalist,datalist");
		return this._list; // Inspired by https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
	}
	get select(): HTMLSelectElement {
		if (!this._select?.isConnected) this._select = this.querySelector("select");
		if (!this._select)
			throw new Error(
				"u-combobox: No <select> found. Please add a <select> as child.",
			);
		return this._select;
	}
	get clear(): HTMLElement | null {
		if (!this._clear?.isConnected) this._clear = this.querySelector("del");
		return this._clear;
	}
	get chips(): HTMLCollectionOf<HTMLDataElement> {
		if (!this._chips) this._chips = this.getElementsByTagName("data");
		return this._chips;
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> | undefined {
		if (!this._options) {
			const tag = this.list?.nodeName === "U-DATALIST" ? "u-option" : "option";
			this._options = this.list?.getElementsByTagName(tag as "option"); // u-datalist might not be initialized yet
		}
		return this._options;
	}
	get values(): { label: string; value: string }[] {
		return Array.from(this.select.selectedOptions, ({ label, value }) => ({
			label,
			value,
		}));
	}
	get selected(): HTMLCollectionOf<HTMLOptionElement> {
		return this.select.selectedOptions;
	}
}

const render = (
	self: UHTMLComboboxElement,
	event?: CustomEvent<MutationRecord[]>,
) => {
	const { _focus, _texts, chips, input, list, multiple, select, selected } =
		self;
	let label = `${input?.labels?.[0]?.textContent || ""}, ${multiple ? (selected.length ? _texts.found.replace("%d", `${selected.length}`) : _texts.empty) : ""}`;
	const isChip = _focus instanceof HTMLDataElement;
	const edits: HTMLOptionElement[] = [];
	for (const mutation of event?.detail || [])
		if (mutation.target === select) {
			edits.unshift(...(mutation.addedNodes as NodeListOf<HTMLOptionElement>));
			edits.push(...(mutation.removedNodes as NodeListOf<HTMLOptionElement>));
		}

	if (_focus && input && (multiple ? edits.length === 1 : isChip)) {
		const inputMode = attr(input, "inputmode"); // Use inputMode to prevent virtual keyboard on iOS and Android
		const nextFocus = isChip ? input : _focus;
		self._speak = `${_texts[edits[0].isConnected ? "added" : "removed"]} ${edits[0].label}, `; // Update aria-labels

		if (IS_MOBILE || _focus === input) speak(self._speak); // Live announce when focus can not be moved
		if (input !== nextFocus) {
			attr(input, "aria-expanded", null); // Prevent announce state when temporarily focused
			attr(input, "inputmode", "none"); // Prevent virtual keyboard on iOS and Android
			label = "\u{A0}"; // Prevent VoiceOver announcing aria-label change
			input.focus();
		}

		setTimeout(() => {
			attr(input, "aria-expanded", "true"); // Revert aria-expanded
			attr(input, "inputmode", inputMode); // Revert inputMode

			nextFocus?.focus?.();
			self._speak = ""; // Prevent Firefox announcing aria-label change, but also support non-focus environments such as JAWS forms mode
			if (IS_FIREFOX_MAC) on(self, "blur", () => render(self), EVENT_ONCE);
			else setTimeout(render, 100, self);
		}, 100); // 100ms delay so VoiceOver + Chrome announces new ariaLabel
	}

	// Setup chips
	if (!self.nochips)
		Array.from(
			{ length: Math.max(chips.length, selected.length) },
			(_, idx) => {
				const option = selected[idx];
				const chip =
					chips[idx] ||
					input?.insertAdjacentElement("beforebegin", createElement("data"));

				if (!option) return chip?.remove(); // Remove chip if no option
				const aria = `${self._speak}${option.label}, ${_texts.remove}, ${idx + 1} ${_texts.of} ${selected.length}`;
				chip.textContent = option.label;
				attr(chip, "role", "button");
				attr(chip, "tabindex", "-1");
				attr(chip, "aria-label", aria);
			},
		);

	// Setup input and list (Note: Label pointing to the input overwrites input's aria-label in Firefox)
	if (list) attr(list, "aria-multiselectable", `${multiple}`); // Sync datalist multiselect
	if (input) attr(input, "list", useId(list)); // Connect datalist and input
	if (input) attr(input, "aria-label", `${self._speak}${label}`);

	syncOptionsWithSelected(self);
	syncClearWithInput(self);
	mutationObserver(self)?.takeRecords();
};

const syncClearWithInput = (self: UHTMLComboboxElement) => {
	if (self.clear) attr(self.clear, "role", "button");
	if (self.clear) self.clear.hidden = !self.input?.value;
};

const syncOptionsWithSelected = (self: UHTMLComboboxElement) => {
	const { _speak, options = [], selected } = self;
	const values = Array.from(selected, (o) => o.value); // Get selected values
	for (const opt of options) {
		const text = opt.textContent?.trim() || ""; // u-option might not be initialized yet
		const value = attr(opt, "value") ?? attr(opt, "label") ?? text;
		attr(opt, "aria-label", _speak ? `${_speak}${text}` : null);
		attr(opt, "selected", values.includes(value) ? "" : null);
	}
};

const syncInputValue = (self: UHTMLComboboxElement) => {
	const { input, multiple, selected } = self;
	const label = selected[0]?.label || "";
	if (!multiple && input && label !== input.value)
		setValue(input, label, "insertText");
};

const dispatchMatch = (self: UHTMLComboboxElement, sync = true) => {
	const { _texts, options = [], creatable, input, selected, multiple } = self;
	const value = input?.value?.trim() || "";
	const query = value.toLowerCase() || null; // Fallback to null to prevent matching empty strings
	let match = [...options].find((o) => o.label.trim().toLowerCase() === query); // Match label
	const event = { bubbles: true, cancelable: true, detail: match };

	if (self.dispatchEvent(new CustomEvent("beforematch", event)))
		for (const opt of options) opt.selected = opt === match; // u-option is initialized at this point, so we can use .selected
	match = [...options].find((o) => o.selected);
	syncOptionsWithSelected(self); // Re-sync options with items

	if (match) return dispatchChange(self, match, false, !!sync);
	if (creatable && value) return dispatchChange(self, { value }, false);
	if (!multiple && selected[0]) dispatchChange(self, selected[0], true, false); // Remove items if no match
	if (sync) speak(_texts.invalid);
};

const dispatchChange = (
	self: UHTMLComboboxElement,
	item: { value: string; label?: string },
	removable = true,
	sync = true,
) => {
	const { select, selected, multiple } = self;
	const add = new Option(item.label || item.value, item.value, true, true);
	const remove = [...selected].find((opt) => opt.value === item.value);
	const event = { bubbles: true, cancelable: true, detail: remove || add };
	const skip = remove && !removable;

	if (!skip && self.select.dispatchEvent(new CustomEvent("change", event))) {
		if (!multiple) for (const opt of [...selected]) opt.remove(); // Clear if multiple
		remove ? remove.remove() : select.add(add);
	}
	// TODO: How can we sync value on option-click, and do an input event, without triggering a dispatchMatch?
	// if (sync) setTimeout(syncInputValue, 10, self); // 100ms so frameworks can update DOM first
};

const onFocus = (self: UHTMLComboboxElement, { target }: Event) => {
	if (target instanceof HTMLElement) self._focus = target;
	speak(); // Prepare for screen reader announcements
};

const onBlur = (self: UHTMLComboboxElement) =>
	IS_PRESS || setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element

const onBlurred = (self: UHTMLComboboxElement) => {
	if (!self._focus || self.contains(self._root?.activeElement as Node)) return; // Blur is allready done or focus is still in combobox
	syncInputValue(self);
};

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	const { clear, input, chips, selected } = self;

	// Support clear button
	if (clear?.contains(target as Node)) {
		if (input) setValue(input, "", "deleteContentBackward");
		return input?.focus();
	}

	Array.from(chips, (chip, idx) => {
		const { top, right, bottom, left } = chip.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (chip.contains(target as Node))
			return dispatchChange(self, selected[idx]); // Keyboard and screen reader can set target to element with pointer-events: none
		if (y >= top && y <= bottom && x >= left && x <= right) return chip.focus(); // If clicking inside item, focus it
	});
	if (target === self) input?.focus(); // Focus input if clicking <u-combobox>
};

const onInput = (
	self: UHTMLComboboxElement,
	event: Event & Partial<InputEvent>,
) => {
	const { options = [], input, multiple } = self;
	const value = input?.value?.trim() || "";
	const isClick =
		event instanceof InputEvent
			? !event.inputType || event.inputType === CLICK // Firefox uses inputType "insertReplacementText" when clicking on <datalist>
			: !!value; // WebKit uses Event (not InputEvent) both on <datalist> click and clear when type="search" so we need to check value

	if (isClick) {
		event.stopImmediatePropagation(); // Prevent input event when reverting value anyway
		if (input) input.value = self._value; // Revert value as it will be changed by dispatchChange if needed
		for (const opt of options)
			if (opt.value && opt.value === value)
				return dispatchChange(self, opt, multiple);
	} else if (!multiple) dispatchMatch(self, false); // Match while typing if single
	syncClearWithInput(self);
};

const onKeyDown = (self: UHTMLComboboxElement, event: KeyboardEvent) => {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	const { clear, input, chips } = self;
	const { key, repeat, target } = event;
	const isInput = input && input === target;
	const inText = isInput && input?.selectionEnd;
	let index = isInput
		? chips.length
		: [...chips].indexOf(target as HTMLDataElement);

	if (isInput && key === "Tab" && clear && !clear.hidden) {
		event.preventDefault(); // Prevent tabbing away from combobox
		clear.tabIndex = -1; // Allow programatic focus
		clear.focus(); // Focus first item on tab
		on(clear, "blur", () => attr(clear, "tabindex", null), EVENT_ONCE); // Revert tabIndex
	}

	if ((!isInput && asButton(event)) || index === -1) return; // Skip if focus is neither on item or control or if item click
	if (key === "ArrowRight" && !isInput) index += 1;
	else if (key === "ArrowLeft" && !inText) index -= 1;
	else if (key === "Enter" && isInput) {
		const form = attr(input, "form");
		attr(input, "form", "#"); // Prevent submit without preventing native datalist
		requestAnimationFrame(() => attr(input, "form", form)); // Restore form attribute after event has bubbled;
		return dispatchMatch(self);
	} else if ((key === "Backspace" || key === "Delete") && !inText) {
		event.preventDefault(); // Prevent navigating away from page
		if (!repeat && chips[index]) return dispatchChange(self, chips[index]);
		if (isInput) index -= 1;
	} else return isInput || input?.focus(); // Skip other keys and move back to control

	event.preventDefault(); // Prevent datalist arrow events
	(chips[Math.max(0, index)] || input)?.focus();
};

customElements.define("u-combobox", UHTMLComboboxElement);
