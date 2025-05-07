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
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-combobox": UHTMLComboboxElement;
	}
	interface GlobalEventHandlersEventMap {
		tags: CustomEvent<{
			action: "add" | "remove";
			item: HTMLDataElement;
		}>;
	}
}

let LIVE: Element;
const EVENTS = "blur,focus,click,input,keydown";
const EVENT_ONCE = { capture: true, once: true, passive: true };
const IS_FIREFOX_MAC = IS_FIREFOX && !IS_ANDROID;
const IS_MOBILE = IS_ANDROID || IS_IOS;
const CHAR_CLICK = "insertReplacementText"; // Firefox uses this for inputType
const TEXTS = {
	added: "Added",
	remove: "Press to remove",
	removed: "Removed",
	empty: "No selected",
	found: "Navigate left to find %d selected",
	of: "of",
};

// Note: Label pointing to the input overwrites input's aria-label in Firefox

/**
 * The `<u-combobox>` HTML element contains a set of `<data>` elements.
 * No MDN reference available.
 */
export class UHTMLComboboxElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_focus: HTMLElement | null = null;
	_root: null | Document | ShadowRoot = null;
	_speak = "";
	_texts = { ...TEXTS };
	_value = ""; // Locally store value to reset on input click

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
				::slotted(data) { display: inline-block; pointer-events: none }
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus) { ${FOCUS_OUTLINE} }`, // Show focus outline around ::after only
			),
		);
	}
	connectedCallback() {
		this._root = getRoot(this);

		if (!LIVE) LIVE = createAriaLive("assertive");
		if (!LIVE.isConnected) document.body.appendChild(LIVE);

		on(this, EVENTS, this, true); // Bind events using capture phase to run before framworks
		mutationObserver(this, { childList: true });
		setTimeout(render, 0, this);
	}
	attributeChangedCallback(prop: string, _: string, val: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = val || TEXTS[text];
	}
	disconnectedCallback() {
		mutationObserver(this, false);
		off(this, EVENTS, this, true);
		this._focus = this._root = null;
	}
	handleEvent(event: Event) {
		if (event.type === "blur") onBlur(this);
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "focus") onFocus(this, event);
		if (event.type === "input") onInput(this, event as InputEvent);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "mutation") render(this, event as CustomEvent);
	}
	get multiple() {
		return this.hasAttribute("data-multiple");
	}
	set multiple(value: boolean) {
		attr(this, "data-multiple", value ? "" : null);
	}
	get control(): HTMLInputElement | null {
		return this.querySelector("input");
	}
	get items(): NodeListOf<HTMLDataElement> {
		return this.querySelectorAll("data");
	}
}

const text = (el?: Node) => el?.textContent?.trim() || "";
const render = (
	self: UHTMLComboboxElement,
	e?: CustomEvent<MutationRecord[]>,
) => {
	let { _speak, _focus, _texts, control, items, multiple } = self;
	const mutation = _focus && e?.detail.length === 1 && e.detail[0]; // Only count if focused and single edit
	const values: string[] = [];
	const list = control?.list;

	// Announce change if focused and only one item changed
	if (mutation && (!mutation.addedNodes[1] || !mutation.removedNodes[1])) {
		const item = mutation.addedNodes[0] || mutation.removedNodes[0];

		if (item.nodeName !== "DATA") return; // Ignore if not data
		_speak = `${item.isConnected ? _texts.added : _texts.removed} ${text(item)}, `; // Update aria-labels
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
	for (const item of items) {
		const label = text(item);
		const value = item.value || label;
		const aria = `${_speak}${label}, ${_texts.remove}, ${values.push(value)} ${_texts.of} ${items.length}`;
		attr(item, "role", "button");
		attr(item, "value", value);
		attr(item, "tabindex", "-1");
		attr(item, "aria-label", aria);
	}

	// Set selected datalist options
	for (const opt of list?.options || []) {
		attr(opt, "aria-label", `${_speak}${opt.label}`);
		opt.selected = values.includes(opt.value); // TODO match label case insensitive
	}

	// Setup input and list
	const label = `${_speak}${text(control?.labels?.[0])}, ${items.length ? _texts.found.replace("%d", `${items.length}`) : _texts.empty}`;
	if (list) attr(list, "aria-multiselectable", `${multiple}`); // Make datalist multiselect
	if (control && !control?.placeholder) attr(control, "placeholder", ""); // Ensure placeholder so we can use :placeholder-shown
	if (control) attr(control, "list", useId(list)); // Connect datalist and input
	if (control) attr(control, "aria-label", label);

	// Setup select optionally
	const select = self.querySelector("select");
	if (select) select.multiple = multiple;
	select?.replaceChildren(
		...[...items].map((item) => new Option(text(item), item.value, true, true)),
	);
};

const dispatchMatch = (
	self: UHTMLComboboxElement,
	opt?: HTMLOptionElement,
	canRemove = true,
) => {
	const { control, items, multiple } = self;
	const opts = [...(control?.list?.options || [])];
	const query = control?.value?.trim().toLowerCase() || null; // Fallback to null to prevent empty matches
	const match = opt || opts.find((o) => o.label.trim().toLowerCase() === query);

	if (match && control) {
		const { label, value } = match;
		const remove = canRemove && [...items].find((o) => o.value === value); // Deleted option if multiple
		const add = createElement("data", label, { value });

		if (!multiple) control.value = self._value = ""; // Empty input if single select
		dispatchChange(self, remove || add); // Add or remove item
	}
};

const dispatchChange = (self: UHTMLComboboxElement, item: HTMLDataElement) => {
	const { control, items, multiple } = self;
	const event = { bubbles: true, cancelable: true, detail: item };

	if (!self.dispatchEvent(new CustomEvent("beforechange", event))) return; // Event was prevented
	if (!multiple) for (const el of items) if (el !== item) el.remove();
	if (item.isConnected) item.remove();
	else control?.insertAdjacentElement("beforebegin", item);
};

const onFocus = (self: UHTMLComboboxElement, { target }: Event) => {
	if (target instanceof HTMLInputElement) target.value = self._value; // Restore value
	self._focus = target as HTMLElement;
};

const onBlur = (self: UHTMLComboboxElement) => setTimeout(onBlurred, 0, self); // Delay to allow focus to be set on new element
const onBlurred = (self: UHTMLComboboxElement) => {
	const { _root, control, multiple } = self;
	if (self.contains(_root?.activeElement as Node) || !control) return; // Focus is inside
	if (!multiple) dispatchMatch(self, undefined, false); // Try to match when single, but without removing

	self._focus = null;
	self._value = control.value; // Store value to restore on focus
	control.value = ""; // Empty value on blur
};

const onClick = (self: UHTMLComboboxElement, event: MouseEvent) => {
	const { clientX: x, clientY: y, target } = event;
	for (const item of self.items) {
		if (item.contains(target as Node)) return dispatchChange(self, item); // Keyboard and screen reader can set target to element with pointer-events: none
		const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (y >= top && y <= bottom && x >= left && x <= right) return item.focus(); // If clicking inside item, focus it
	}
	if (target === self) self.control?.focus(); // Focus input if clicking <u-combobox>
};

const onInput = (self: UHTMLComboboxElement, event: InputEvent) => {
	const isClick = !event.inputType || event.inputType === CHAR_CLICK;
	const control = event.target as HTMLInputElement;
	const value = control.value;

	if (!isClick) self._value = value;
	else {
		event.stopImmediatePropagation(); // Prevent input events from 'input'
		if (self.multiple) control.value = self._value; // Restore if multiple, but without triggering input event
		for (const opt of control.list?.options || [])
			if (opt.value === value) dispatchMatch(self, opt);
	}
};

const onKeyDown = (self: UHTMLComboboxElement, event: KeyboardEvent) => {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
	const { key, repeat, target: el } = event;
	const { control } = self;
	const items = [...self.items];
	const isControl = control && control === el;
	const isCaretInsideText = isControl && control?.selectionEnd;
	let index = isControl ? items.length : items.indexOf(el as HTMLDataElement);

	if (index === -1 || (!isControl && asButton(event))) return; // Skip if focus is neither on item or control or if item click
	if (key === "ArrowRight" && !isControl) index += 1;
	else if (key === "ArrowLeft" && !isCaretInsideText) index -= 1;
	else if (key === "Enter" && isControl) {
		const form = attr(control, "form");
		attr(control, "form", "#"); // Prevent submit without preventing native datalist
		setTimeout(() => attr(control, "form", form), 0); // Restore
		dispatchMatch(self);
		return;
	} else if ((key === "Backspace" || key === "Delete") && !isCaretInsideText) {
		event.preventDefault(); // Prevent navigating away from page
		if (!repeat && items[index]) return dispatchChange(self, items[index]);
		if (isControl) index -= 1;
	} else return control?.focus(); // Skip other keys and move back to control

	event.preventDefault(); // Prevent datalist arrow events
	(items[Math.max(0, index)] || control)?.focus();
};

customElements.define("u-combobox", UHTMLComboboxElement);
