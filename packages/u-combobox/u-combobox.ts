import {
	DISPLAY_BLOCK,
	FOCUS_OUTLINE,
	IS_ANDROID,
	IS_BROWSER,
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
const EVENTS = "click,input,focusin,focusout,keydown,keyup";
const EVENT_ONCE = { capture: true, once: true, passive: true };
const FALSE = "false";
const IS_FIREFOX_MAC = IS_FIREFOX && !IS_ANDROID;
const IS_MOBILE = IS_ANDROID || IS_IOS;
const REPL_CHAR = "insertReplacementText"; // Firefox uses this for inputType
const SPLIT_CHAR = "\u{2001}".repeat(100); // Unicode U+001E record separator
const TEXTS = {
	added: "Added",
	remove: "Press to remove",
	removed: "Removed",
	empty: "No selected",
	found: "Navigate left to find %d selected",
	of: "of",
	singular: "%d hit",
	plural: "%d hits",
};

// Note: Label pointing to the input overwrites input's aria-label in Firefox
// TODO: <mark>
// TODO: Shadow <select>
// TODO: Announce hits

/**
 * The `<u-combobox>` HTML element contains a set of `<data>` elements.
 * No MDN reference available.
 */
export class UHTMLComboboxElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_filter: string[] | false = ["label"];
	_root: null | Document | ShadowRoot = null;
	_texts = { ...TEXTS };
	_speak = "";
	_value = ""; // Locally store value to reset on input click

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return [
			"data-filter",
			...Object.keys(TEXTS).map((key) => `data-sr-${key}`),
		];
	}

	constructor() {
		super();
		this.attachShadow({ mode: "open" }).append(
			createElement("slot"), // Content slot
			createElement(
				"style",
				`${DISPLAY_BLOCK} /* Must be display block in Safari to allow focus inside */
				::slotted(select) { display: none } /* Hide data if single mode */
				::slotted(data) { cursor: pointer; display: inline-block; outline: none; pointer-events: none }
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus)::after { ${FOCUS_OUTLINE} }`, // Show focus outline around ::after only
			),
		);
	}
	connectedCallback() {
		this._root = getRoot(this);

		if (!LIVE) LIVE = createAriaLive("assertive");
		if (!LIVE.isConnected) document.body.appendChild(LIVE);

		on(this, EVENTS, this, true); // Bind events using capture phase to run before framworks
		mutationObserver(this, { childList: true, subtree: true }); // Observe u-datalist to add aria-multiselect="true" and options to overwrite filtering
		setTimeout(render, 0, this); // Set initial aria-labels and selected items in datalist after initial render
	}
	attributeChangedCallback(prop: string, _: string, val: string) {
		const text = prop.split("data-sr-")[1] as keyof typeof TEXTS;
		if (text) this._texts[text] = val || TEXTS[text];
		else this._filter = val !== "off" && val?.split(" ").filter(Boolean);
	}
	disconnectedCallback() {
		mutationObserver(this, false);
		off(this, EVENTS, this, true);
		this._root = null;
	}
	handleEvent(event: Event) {
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "input") onInput(this, event as InputEvent);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "mutation") render(this);
	}
	get multiple() {
		return (attr(this, "data-multiple") ?? FALSE) !== FALSE; // Support both null and "false" for better React compatibility
	}
	set multiple(value: boolean) {
		attr(this, "data-multiple", value ? "" : null);
	}
	get creatable() {
		return (attr(this, "data-creatable") ?? FALSE) !== FALSE; // Support both null and "false" for better React compatibility
	}
	set creatable(value: boolean) {
		attr(this, "data-creatable", value ? "" : null);
	}
	get filter(): string[] {
		return this._filter || [];
	}
	set filter(value: string | string[]) {
		const str = ([] as string[]).concat(value).join(" ").trim() || null;
		attr(this, "data-filter", str);
	}
	get items(): NodeListOf<HTMLDataElement> {
		return this.querySelectorAll("data");
	}
	get control() {
		return this.querySelector("input");
	}
	get list() {
		return this.querySelector<HTMLDataListElement>("datalist,u-datalist");
	}
}

const getOriginal = (str?: string) => str?.split(SPLIT_CHAR)[0] || ""; // Get pure value from datalist

const render = (self: UHTMLComboboxElement) => {
	const { empty, found, remove, of } = self._texts;
	const { length: tot } = self.items;
	const input = self.control;
	const list = self.list;
	const multi = self.multiple;
	const speak = self._speak;
	const query = self._value.trim().toLowerCase();
	const values = multi ? [] : [query];

	// Setup items and store values (must run first)
	for (const item of self.items) {
		const text = item.textContent?.trim() || "";
		const value = item.value || text;
		const idx = values.push(value);
		attr(item, "aria-label", `${speak}${text}, ${remove}, ${idx} ${of} ${tot}`);
		attr(item, "role", "button");
		attr(item, "tabindex", "-1");
		attr(item, "value", value);
	}

	// Set selected options
	const tmp: Record<string, string> = {};
	for (const opt of list?.options || []) {
		tmp.label = getOriginal(opt.label);
		tmp.value = getOriginal(opt.value);
		opt.label = `${tmp.label}${self._value ? SPLIT_CHAR + self._value : ""}`; // Prevent native filtering
		opt.value = `${tmp.value}${self._value ? SPLIT_CHAR + self._value : ""}`; // Prevent native filtering
		opt.selected = values.includes(multi ? tmp.value : tmp.label.toLowerCase());

		if (!multi && opt.selected) setSelected(self, [tmp.value]); // Move selected options to select
		if (multi) attr(opt, "aria-label", `${speak}${tmp.label}`);
		if (self._filter)
			opt.disabled = !self._filter.some(
				(filter) => (tmp[filter] || opt[filter])?.toLowerCase().includes(query), // Fallback to opt for "text" property
			);
	}

	// Setup input and list
	if (list) attr(list, "aria-multiselectable", `${multi}`); // Make datalist multiselect
	if (input) {
		attr(input, "form", "#"); // Prevent form submission on Enter
		attr(input, "list", useId(list)); // Connect datalist and input
		attr(
			input,
			"aria-label",
			`${speak}${input?.labels?.[0]?.textContent?.trim() || ""}, ${multi ? (values.length ? found.replace("%d", `${values.length}`) : empty) : ""}`,
		);
	}

	// setSelected(self); // Setup select
};

const setSelected = (self: UHTMLComboboxElement, values: string[]) => {
	const select = self.querySelector("select");
	if (!select) return;
	select.multiple = self.multiple;
	if (self.multiple)
		select.replaceChildren(
			...Array.from(
				self.items,
				({ value }) => new Option("", value, true, true),
			),
		);
	mutationObserver(self).takeRecords(); // Prevent mutation observer
};

const dispatchChange = (self: UHTMLComboboxElement, item: HTMLDataElement) => {
	const isNotPrevented = self.dispatchEvent(
		new CustomEvent("combobox", {
			bubbles: true,
			cancelable: true,
			detail: { item, action: item.isConnected ? "remove" : "add" },
		}),
	);

	// Announce remove
	if (isNotPrevented) {
		const { removed, added } = self._texts;
		const active = getRoot(self)?.activeElement as HTMLElement;
		const remove = [...self.items].indexOf(active as HTMLDataElement);
		const input = self.control;
		const prev = (~remove && self.items[0]) || input; // If remove; move focus to first item to prevent datalist open
		const next = ~remove ? self.items[(remove || 2) - 1] || input : active;
		const speak = `${~remove ? removed : added} ${item.textContent}, `;

		if (IS_MOBILE || next === input) LIVE.textContent = speak; // Live announce when focus can not be moved

		self._speak = speak; // Update aria-labels
		prev?.focus(); // TMP focus input to make sure aria-label is read

		setTimeout(() => {
			next?.focus?.();
			self._speak = "";

			if (IS_FIREFOX_MAC)
				on(self, "blur", () => render(self), EVENT_ONCE); // Prevent Firefox announcing aria-label change
			else setTimeout(render, 100, self); // Support non-focus envs (JAWS forms mode)
		}, 100); // 100ms delay so VoiceOver + Chrome announces new ariaLabel
	}

	return isNotPrevented;
};

const onClick = (
	self: UHTMLComboboxElement,
	{ clientX: x, clientY: y, target }: MouseEvent,
) => {
	const remove = (target as Element)?.closest?.("data"); // Only keyboard and screen reader can set event.target to element with pointer-events: none

	if (remove) return dispatchChange(self, remove) && remove.remove();
	for (const item of self.items) {
		const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
		if (y >= top && y <= bottom && x >= left && x <= right) return item.focus(); // If clicking inside item, focus it
	}
	if (target === self) self.control?.focus(); // Focus input if clicking <u-combobox>
};

const onInput = (self: UHTMLComboboxElement, event: InputEvent) => {
	const isClick = !event.inputType || event.inputType === REPL_CHAR;
	const input = event.target as HTMLInputElement;
	const multi = self.multiple;
	const value = getOriginal(input.value.trim());
	let clicked = "";

	for (const opt of self.list?.options || []) {
		opt.label = getOriginal(opt.label); // Reset to original label so other input event listeners can use it
		opt.value = getOriginal(opt.value); // Reset to original value so other input event listeners can use it
		if (isClick && opt.value === value) clicked = opt.label; // Get clicked option label
	}

	if (!isClick) self._value = value; // Store value for reset on click
	if (isClick) event.stopImmediatePropagation(); // Prevent input events from 'input'
	if (isClick && !multi) input.value = self._value = clicked; // Set input value to clicked option label
	if (isClick && multi && value) {
		if (!clicked) self._value = ""; // Empty input if no clicked option but value comes from <input>
		const add = createElement("data", clicked || value, { value });
		const items = [...self.items];
		const remove = items.find((item) => item.value === value);

		input.value = self._value; // Reset input value
		if (!dispatchChange(self, remove || add)) return;
		if (remove) return remove.remove();
		if (!items[0]) return self.prepend(add); // If no items, add first
		items[items.length - 1].insertAdjacentElement("afterend", add); // Add after last item
		mutationObserver(self).takeRecords(); // Prevent mutation observer
	}

	setTimeout(render, 0, self); // Update datalist state after input event has run
};

const onKeyDown = (self: UHTMLComboboxElement, event: KeyboardEvent) => {
	const { key, repeat, target } = event;
	const input = self.control;
	const items = [...self.items];
	const isInput = input === target;
	const isCaretInsideText = isInput && input?.selectionEnd;
	let index = isInput ? items.length : items.indexOf(target as HTMLDataElement);

	if (index === -1 || (!isInput && asButton(event))) return; // Skip if focus is neither on item or input or if item click
	if (key === "ArrowRight" && !isInput) index += 1;
	else if (key === "ArrowLeft" && !isCaretInsideText) index -= 1;
	else if (
		key === "Enter" &&
		isInput &&
		self.multiple &&
		self.creatable &&
		input?.value.trim()
	) {
		return input?.dispatchEvent(new Event("input", { bubbles: true })); // Adding value to createable
	} else if ((key === "Backspace" || key === "Delete") && !isCaretInsideText) {
		const remove = !repeat && self.items[index];
		event.preventDefault(); // Prevent navigating away from page
		if (remove) return dispatchChange(self, remove) && remove.remove();
		if (isInput) index -= 1;
	} else return; // Skip other keys

	event.preventDefault(); // Prevent datalist arrow events
	(items[Math.max(0, index)] || input)?.focus();
};

// Polyfill input.form so it returns closest form if <u-combobox>
if (IS_BROWSER)
	Object.defineProperty(HTMLInputElement.prototype, "form", {
		configurable: true,
		enumerable: true,
		get() {
			const id = attr(this, "form")?.replace("#", "");
			return id ? document.getElementById(id) : this.closest("form");
		},
	});

customElements.define("u-combobox", UHTMLComboboxElement);

/**
 * Helpers to implement custom <u-datalist> and <datalist> filtering
 */
// type Option = {
// 	option: HTMLOptionElement;
// 	text: string;
// 	value: string;
// 	label: string;
// };

// const SPLIT_CHAR = "\u{2001}".repeat(100); // Unicode U+001E record separator
// const SPLIT_ATTR = IS_FIREFOX ? "label" : "value"; // Firefox looks at label+text, the rest looks at value+text

// export const getDatalistValue = ({
// 	value,
// }: HTMLInputElement | HTMLOptionElement) => value.split(SPLIT_CHAR)[0];

// export function useDatalistState(
// 	el: HTMLInputElement | Partial<InputEvent>,
// 	callback: (state: {
// 		options: HTMLCollectionOf<HTMLOptionElement>;
// 		input: HTMLInputElement;
// 		click: HTMLOptionElement | null;
// 	}) => void,
// ) {
// 	const isElem = el instanceof HTMLInputElement;
// 	const isClick =
// 		!isElem && (!el.inputType || el.inputType === "insertReplacementText");
// 	const input = isElem ? el : el.target;
// 	const list = input instanceof HTMLInputElement && input.list;

// 	if (list) {
// 		const options = list.options;
// 		let click: HTMLOptionElement | null = null;
// 		input.value = input.value.split(SPLIT_CHAR)[0];

// 		for (const opt of options) {
// 			opt[SPLIT_ATTR] = opt[SPLIT_ATTR].split(SPLIT_CHAR)[0]; // Reset to original value
// 			if (isClick && opt.value === input.value) click = opt;
// 		}

// 		callback({ input, options, click });

// 		for (const opt of options)
// 			opt[SPLIT_ATTR] = `${opt[SPLIT_ATTR]}${SPLIT_CHAR}${input.value}`; // Include input value

// 		// if (list instanceof UHTMLDataListElement)
// 		// 	mutationObserver(list)?.takeRecords(); // Avoid triggering mutation observer
// 	}
// }

// export function syncDatalistState(
// 	event?: Partial<InputEvent>,
// 	matcher = (option: Option, value: string) => option.value === value && value,
// ) {
// 	if (event?.target instanceof HTMLInputElement) {
// 		const { type, target, inputType } = event;
// 		const value = target.value.split(SPLIT_CHAR)[0];
// 		const isClick =
// 			type === "input" && (!inputType || inputType === "insertReplacementText");
// 		const options = Array.from(target.list?.options || [], (option) => ({
// 			option,
// 			text: option.text,
// 			label: option.label.split(SPLIT_CHAR)[0],
// 			value: option.value.split(SPLIT_CHAR)[0],
// 		}));

// 		if (isClick) {
// 			const option = options.find((opt) => opt.value === value);
// 			target.value = option?.label || option?.text || option?.value || "";
// 		}
// 		for (const item of options)
// 			item.option[SPLIT_ATTR] =
// 				`${item[SPLIT_ATTR]}${SPLIT_CHAR}${target.value}`; // Set pure value to input if click

// 		return {
// 			input: target,
// 			isClick,
// 			options,
// 			value,
// 		};
// 	}
// }

// attributeChangedCallback(name?: string) {
//   const hasFocus = getRoot(this).activeElement === this;
//   attr(this, "aria-disabled", `${this.disabled}`);

//   if (hasFocus) on(this, 'blur', this, { once: true, passive: true }); // Prevent change while focused to prevent announcement
//   else attr(this, 'aria-selected', `${this.selected}`);
// }
// handleEvent(event: Event) {
//   if (event.type === 'blur') attr(this, 'aria-selected', `${this.selected}`);
// }

// const SPLIT_CHAR = "\u{2001}".repeat(100); // Unicode U+001E record separator
// const SPLIT_ATTR = IS_FIREFOX ? "label" : "value"; // Firefox looks at label+text, the rest looks at value+text
// const FIREFOX_OPTION_CLICK = "insertReplacementText"; // Support both Firefox (insertReplacementText) and others (undefined)

// export const getDatalistValue = ({
// 	value,
// }: HTMLInputElement | HTMLOptionElement | UHTMLOptionElement) =>
// 	value.split(SPLIT_CHAR)[0];

// export function isDatalistClick(event?: Partial<InputEvent>) {
// 	const isClick =
// 		event?.type === "input" &&
// 		event.target instanceof HTMLInputElement &&
// 		(!event.inputType || event.inputType === FIREFOX_OPTION_CLICK);

// 	if (isClick) {
// 		const value = event.target.value;
// 		const ignored = Array.from(event.target.list?.options || []).some(
// 			(opt) => opt.value === value,
// 		);

// 		event.target.value = value.split(SPLIT_CHAR)[ignored ? 1 : 0]; // Keep input text if ignored option
// 	}
// 	return isClick;
// }

// // Force show items by adding needle after a record separator
// export function syncDatalistState(input: HTMLInputElement) {
// 	for (const option of input.list?.children || [])
// 		if (
// 			option instanceof HTMLOptionElement ||
// 			option instanceof UHTMLOptionElement
// 		) {
// 			option[SPLIT_ATTR] =
// 				`${getDatalistValue(option)}${SPLIT_CHAR}${input.value}`;
// 		}
// }

// createAriaLive,
// if (!LIVE) LIVE = createAriaLive("assertive");
// if (!LIVE.isConnected) document.body.appendChild(LIVE);
// let LIVE_TIMER: ReturnType<typeof setTimeout>;
// const LIVE_SR_FIX = 0; // Ensure screen reader announcing by alternating non-breaking-space suffix
// let LIVE: Element;
// const TEXTS = {
// 	singular: "%d hit",
// 	plural: "%d hits",
// };

// Announce amount of visible and interactive hits if input event is triggered
// if (!event) return;
// clearTimeout(LIVE_TIMER);
// LIVE_TIMER = setTimeout(() => {
// 	const { length } = getVisibleOptions(self).filter(
// 		(opt) => attr(opt, "role") !== "none",
// 	);
// 	const textFix = ++LIVE_SR_FIX % 2 ? "\u{A0}" : ""; // Force screen reader anouncement
// 	const textKey = length === 1 ? "singular" : "plural";
// 	const textVal = attr(self, `data-sr-${textKey}`) || TEXTS[textKey];

// 	if (LIVE)
// 		LIVE.textContent = `${(!length && self.innerText.trim()) || textVal.replace("%d", `${length}`)}${textFix}`;
// }, 1000); // 1 second makes room for screen reader to announce the typed character, before announcing the hits count

// const input = self.control;
// const label = input?.labels?.[0]?.textContent?.trim() || "";
// const change = Number.isNaN(self._focusIndex) ? null : event?.detail[0]; // Skip announcing changes when no focus
// const changeItem = change?.addedNodes[0] || change?.removedNodes[0];
// const changeText = `${changeItem ? `${changeItem.isConnected ? texts.added : texts.removed} ${changeItem.textContent}, ` : ""}`;

// attr(self, "role", "group"); 		// Kristoffer?
// attr(self, "aria-label", label); // Kristoffer?
// if (input)
// 	attr(
// 		input,
// 		"aria-label",
// 		`${changeText}${label}, ${next.length ? self._texts.found.replace("%d", `${next.length}`) : self._texts.empty}`,
// 	);

// self._values = next; // Store values for change comparison
// const isChange =
// 	prev?.length !== next.length || prev?.some((v, i) => v !== next[i]);

// console.log(prev, next, isChange);

// Announce item change
// if (changeText) {
// 	if (LIVE) LIVE.textContent = changeText;
// const nextFocus = self.items[(self._focusIndex || 1) - 1] || control;
// const sameFocus = nextFocus === getRoot(self)?.activeElement;
// const tmpFocus = options || self.items; // Move focus temporarily so out of input we get ariaLabel change announced
// self._blurAnnounceReset = false; // Do not reset announce on next focus/blur

// if (nextFocus === control) {
// 	if (sameFocus) {
// 		// Mobile does not properly run .focus() so announce with aria-live instead
// 		if (IS_MOBILE && LIVE) LIVE.textContent = changeText;
// 		else tmpFocus[0]?.focus();
// 	}
// 	setTimeout(() => nextFocus?.focus(), 100); // 100ms delay so VoiceOver + Chrome announces new ariaLabel
// } else nextFocus?.focus(); // Set focus to button right away to make NVDA happy

// setTimeout(() => {
// 	if (!IS_FIREFOX_MAC) return render(self); // Reset with timer as this works on both mobile and in JAWS forms mode
// 	self._blurAnnounceReset = true; // But use blur to reset on Firefox Mac prevent announcing aria-label changes
// }, 500); // Reset after 500ms to let focus move and screen reader announcement run first
// }
