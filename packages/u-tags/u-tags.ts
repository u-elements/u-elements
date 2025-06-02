import type { UHTMLOptionElement } from "../u-datalist/u-option";
import {
	FOCUS_OUTLINE,
	IS_ANDROID,
	IS_FIREFOX,
	IS_IOS,
	IS_MAC,
	IS_SAFARI,
	UHTMLElement,
	asButton,
	attr,
	createElement,
	customElements,
	getRoot,
	mutationObserver,
	off,
	on,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-tags": UHTMLTagsElement;
	}
	interface GlobalEventHandlersEventMap {
		tags: CustomEvent<{
			action: "add" | "remove";
			item: HTMLDataElement;
		}>;
	}
}

let LIVE: Element;
const SAFE_MULTISELECTABLE = `${IS_SAFARI ? "aria" : "aria"}-multiselectable`; // Use aria-multiselectable only in Safari as VoiceOver in Chrome and Firefox incorrectly announces selected when aria-selected="false"
const IS_MOBILE = IS_ANDROID || IS_IOS;
const IS_FIREFOX_MAC = IS_FIREFOX || IS_MAC;
const EVENTS = "input,focusin,focusout,keydown";
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
 * The `<u-tags>` HTML element contains a set of `<data>` elements.
 * No MDN reference available.
 */
export class UHTMLTagsElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_blurAnnounceReset = false;
	_blurTimer: ReturnType<typeof setTimeout> | number = 0;
	_focusIndex: number | null = null;
	_root: null | Document | ShadowRoot = null;
	_texts = { ...TEXTS };

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return attributeTexts(TEXTS);
	}

	constructor() {
		super();
		this.attachShadow({ mode: "open" }).append(
			createElement("slot"), // Content slot
			createElement(
				"style",
				`:host(:not([hidden])){ display: inline-block }
        ::slotted(data) { cursor: pointer; display: inline-block; outline: none; pointer-events: none }
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus)::after { ${FOCUS_OUTLINE} }`, // Show focus outline around ::after only
			),
		);
	}
	connectedCallback() {
		this._root = getRoot(this);

		if (!LIVE) LIVE = createAriaLive("polite");
		if (!LIVE.isConnected) document.body.appendChild(LIVE);

		mutationObserver(this, { childList: true }); // Observe u-datalist to add aria-multiselect="true"
		on(this._root, "click", this); // Bind click-to-focus-input on root
		on(this, EVENTS, this);
		setTimeout(() => render(this)); // Set initial aria-labels and selected items in datalist after initial render
	}
	attributeChangedCallback(prop: string, _prev: string, next: string) {
		attributeTexts(this._texts, prop, next);
	}
	disconnectedCallback() {
		mutationObserver(this, false);
		off(this._root || this, "click", this); // Unbind click-to-focus-input on root
		off(this, EVENTS, this);
		this._root = null;
	}
	handleEvent(event: Event) {
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (event.type === "click") onClick(this, event as MouseEvent);
		if (event.type === "focusin") onFocusIn(this, event);
		if (event.type === "focusout") onFocusOut(this);
		if (event.type === "input") onInputOptionClick(this, event as InputEvent);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "mutation") render(this, event as CustomEvent);
	}
	get items(): NodeListOf<HTMLDataElement> {
		return this.querySelectorAll("data");
	}
	get control() {
		return this.querySelector("input");
	}
}

const dispatchChange = (self: UHTMLTagsElement, item: HTMLDataElement) => {
	return self.dispatchEvent(
		new CustomEvent("tags", {
			bubbles: true,
			cancelable: true,
			detail: { item, action: item.isConnected ? "remove" : "add" },
		}),
	);
};

const render = (
	self: UHTMLTagsElement,
	event?: CustomEvent<MutationRecord[]>,
) => {
	const texts = self._texts;
	const change = Number.isNaN(self._focusIndex) ? null : event?.detail[0]; // Skip announcing changes when no focus
	const changeItem = change?.addedNodes[0] || change?.removedNodes[0];
	const changeText = `${changeItem ? `${changeItem.isConnected ? texts.added : texts.removed} ${changeItem.textContent}, ` : ""}`;
	const label = self.control?.labels?.[0]?.textContent || "";
	const values: string[] = [];

	// Setup self
	attr(self, "role", "group");
	attr(self, "aria-label", label);
	self.items.forEach((item, index, { length }) => {
		const label = `${changeText}${item.textContent}, ${texts.remove}, ${index + 1} ${texts.of} ${length}`;
		attr(item, "aria-label", label);
		attr(item, "role", "button");
		item.tabIndex = -1;
		item.value = (item.value || item.textContent || "").trim();
		values.push(item.value);
	});

	// Setup control
	const control = self.control;
	const controlLabel = `${changeText}${label}, ${values.length ? texts.found.replace("%d", `${values.length}`) : texts.empty}`;
	const list = control && document.getElementById(attr(control, "list") || ""); // UHTMLDatalist might not be initialized yet
	const options = list?.children as
		| HTMLCollectionOf<HTMLOptionElement>
		| undefined;

	if (control) attr(control, "aria-label", controlLabel);
	if (list) attr(list, SAFE_MULTISELECTABLE, "true"); // Make <u-datalist> multiselect
	for (const option of options || [])
		option.selected = values.includes(getDatalistValue(option)); // Set selected options in datalist

	// Announce item change
	if (changeText) {
		const nextFocus = self.items[(self._focusIndex || 1) - 1] || control;
		const sameFocus = nextFocus === getRoot(self)?.activeElement;
		const tmpFocus = options || self.items; // Move focus temporarily so out of input we get ariaLabel change announced
		self._blurAnnounceReset = false; // Do not reset announce on next focus/blur

		if (nextFocus === control) {
			if (sameFocus) {
				// Mobile does not properly run .focus() so announce with aria-live instead
				if (IS_MOBILE && LIVE) LIVE.textContent = changeText;
				else tmpFocus[0]?.focus();
			}
			setTimeout(() => nextFocus?.focus(), 100); // 100ms delay so VoiceOver + Chrome announces new ariaLabel
		} else nextFocus?.focus(); // Set focus to button right away to make NVDA happy

		setTimeout(() => {
			if (!IS_FIREFOX_MAC) return render(self); // Reset with timer as this works on both mobile and in JAWS forms mode
			self._blurAnnounceReset = true; // But use blur to reset on Firefox Mac prevent announcing aria-label changes
		}, 500); // Reset after 500ms to let focus move and screen reader announcement run first
	}
};

const onFocusIn = (self: UHTMLTagsElement, { target }: Event) => {
	clearTimeout(self._blurTimer);
	self._focusIndex = [...self.items].indexOf(target as HTMLDataElement);
};

const onFocusOut = (self: UHTMLTagsElement) => {
	if (self._blurAnnounceReset) render(self);
	self._blurTimer = setTimeout(() => {
		self._focusIndex = null;
	});
};

const onClick = (
	self: UHTMLTagsElement,
	{ target, clientX: x, clientY: y }: MouseEvent,
) => {
	const items = self.contains(target as Node) ? [...self.items] : null; // Only care about items if click is inside
	const itemRemove = items?.find((item) => item.contains(target as Node)); // Only keyboard and screen reader can set event.target to element pointer-events: none
	const itemClicked = items?.find((item) => {
		const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
		return y >= top && y <= bottom && x >= left && x <= right;
	});

	if (itemRemove) dispatchChange(self, itemRemove) && itemRemove.remove();
	else if (itemClicked) itemClicked.focus();
	else if (target === self) self.control?.focus(); // Focus if clicking <u-tags>
};

const onInputOptionClick = (self: UHTMLTagsElement, event: InputEvent) => {
	const input = event.target as HTMLInputElement | null;
	if (!isDatalistClick(event) || !input?.value.trim()) return; // Skip if typing or empty

	const value = getDatalistValue(input);
	const items = [...self.items];
	const options = [...(input?.list?.children || [])] as HTMLOptionElement[];
	const optionClicked = options.find((opt) => getDatalistValue(opt) === value);
	const itemRemove = items.find((item) => item.value === value);
	const itemAdd = createElement("data", optionClicked?.text || value, {
		value,
	});

	input.value = "";
	if (!dispatchChange(self, itemRemove || itemAdd)) return;
	if (itemRemove) return itemRemove.remove();
	if (!items[0]) return self.prepend(itemAdd); // If no items, add first
	items[items.length - 1].insertAdjacentElement("afterend", itemAdd); // Add after last item
};

const onKeyDown = (self: UHTMLTagsElement, event: KeyboardEvent) => {
	const { key, repeat, target } = event;
	const input = self.control === target ? self.control : null;
	const isCaretInside = input?.selectionEnd;
	let index = input ? self.items.length : (self._focusIndex ?? -1);

	if (index === -1 || (!input && asButton(event))) return; // Skip if focus is neither on item or input or if item click
	if (key === "ArrowRight" && !input) index += 1;
	else if (key === "ArrowLeft" && !isCaretInside) index -= 1;
	else if (key === "Enter" && input) {
		event.preventDefault(); // Prevent submit
		return input.dispatchEvent(new Event("input", { bubbles: true }));
	} else if ((key === "Backspace" || key === "Delete") && !isCaretInside) {
		const remove = !repeat && self.items[index];
		event.preventDefault(); // Prevent navigating away from page
		if (remove) return dispatchChange(self, remove) && remove.remove();
		if (input) index -= 1;
	} else return; // Skip other keys

	event.preventDefault(); // Prevent datalist arrow events
	(self.items[Math.max(0, index)] || self.control)?.focus();
};

customElements.define("u-tags", UHTMLTagsElement);

const SPLIT_CHAR = "\u{2001}".repeat(100); // Unicode U+001E record separator
// const SPLIT_ATTR = IS_FIREFOX ? "label" : "value"; // Firefox looks at label+text, the rest looks at value+text
const FIREFOX_OPTION_CLICK = "insertReplacementText"; // Support both Firefox (insertReplacementText) and others (undefined)

const getDatalistValue = ({
	value,
}: HTMLInputElement | HTMLOptionElement | UHTMLOptionElement) =>
	value.split(SPLIT_CHAR)[0];

function isDatalistClick(event?: Partial<InputEvent>) {
	const isClick =
		event?.type === "input" &&
		event.target instanceof HTMLInputElement &&
		(!event.inputType || event.inputType === FIREFOX_OPTION_CLICK);

	if (isClick) {
		const value = event.target.value;
		const ignored = Array.from(event.target.list?.options || []).some(
			(opt) => opt.value === value,
		);

		event.target.value = value.split(SPLIT_CHAR)[ignored ? 1 : 0]; // Keep input text if ignored option
	}
	return isClick;
}

/**
 * attributeTexts
 * @description Creates a aria-live element for announcements
 * @param mode Value of aria-live attribute
 * @return HTMLDivElement or null if on server
 */
function attributeTexts(
	texts: Record<string, string>,
	prop?: string,
	value?: string,
) {
	if (!prop) return Object.keys(texts).map((key) => `data-sr-${key}`); // List attributes if not updating
	const key = prop?.startsWith("data-sr-") && prop.slice(8); // Update if getting an attribute
	if (key && value && texts[key]) texts[key] = value;
	return [];
}

const createAriaLive = (mode: "polite" | "assertive") => {
	const live = createElement("div");
	live.style.cssText =
		"position:fixed;overflow:hidden;width:1px;white-space:nowrap";
	attr(live, "aria-live", mode);
	return live;
};
