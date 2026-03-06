export type { UHTMLOptionElement } from "./u-option";
import "./u-option"; // Import to register u-option
import {
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	debounce,
	declarativeShadowRoot,
	FOCUS_OUTLINE,
	getFocused,
	getRoot,
	IS_ANDROID,
	IS_BROWSER,
	IS_IOS,
	isPointerDown,
	off,
	on,
	onMutation,
	preventSubmit,
	SAFE_MULTISELECTABLE,
	setValue,
	speak,
	UHTMLElement,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-datalist": HTMLDataListElement;
	}
}

const DATA_ACTIVE = "data-activedescendant";
const ARIA_HIDDEN = "aria-hidden";
export const UHTMLDataListStyle = `${DISPLAY_BLOCK}
::slotted([role="option"]) { display: block; cursor: pointer }
::slotted([role="option"][${DATA_ACTIVE}]) { ${FOCUS_OUTLINE} }
::slotted([role="option"]:is([${ARIA_HIDDEN}="true"], [disabled], [hidden])) { display: none !important }`;

export const UHTMLDataListShadowRoot =
	declarativeShadowRoot(UHTMLDataListStyle);

let LIVE_TIMER: ReturnType<typeof setTimeout>;
const EVENTS = "blur click input keydown pointerdown";
const TEXTS = {
	of: "of",
	plural: "%d hits",
	singular: "%d hit",
};

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
	_input?: HTMLInputElement; // Using underscore instead of private fields for backwards compatibility
	_options?: HTMLCollectionOf<HTMLOptionElement>; // Caching options to speed up performance
	_root?: Document | ShadowRoot; // Used to consistently remember root for event delegation
	_texts = { ...TEXTS };
	_unmutate?: ReturnType<typeof onMutation>;

	static get observedAttributes() {
		return ["id", ...Object.keys(TEXTS).map((key) => `data-sr-${key}`)]; // Using ES2015 syntax for backwards compatibility
	}

	constructor() {
		super();
		attachStyle(this, UHTMLDataListStyle);
	}
	connectedCallback() {
		this._root = getRoot(this);

		attr(this, "hidden", "");
		attr(this, "role", "listbox");
		attr(this, "tabindex", "-1"); // Prevent tabstop even if consumer sets overflow: auto (https://issues.chromium.org/issues/40456188)
		on(this._root, "focus", this, true); // Use capture to catch non-bubling focus

		this._unmutate = onMutation(this, () => render(this), {
			attributeFilter: ["disabled", "hidden", "label", "value"],
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true,
		});

		this.attributeChangedCallback(); // Initial setup
	}
	disconnectedCallback() {
		if (this._root) off(this._root, `focus ${EVENTS}`, this, true); // Unbind all events
		setInputAttributes(this, null); // Reset input
		this._unmutate?.();
		this._unmutate = this._root = this._input = undefined;
	}
	attributeChangedCallback(prop?: string, _prev?: string, next?: string) {
		const text = prop?.split("data-sr-")[1] as keyof typeof TEXTS;

		if (TEXTS[text]) this._texts[text] = next || TEXTS[text];
		else if (this.id)
			requestAnimationFrame(() => {
				const selector = `input[list="${this.id}"]` as "input";
				const input = getRoot(this).querySelector(selector);
				if (input) setInputAttributes(this, input);
			}); // Allow DOM updates to finish before connecting input
	}
	handleEvent(event: Event) {
		if (event.defaultPrevented) return;
		if (event.type === "focus") onFocus(this, event);
		if (event.type === "blur") onBlur(this, event);
		if (event.type === "click") onClick(this, event);
		if (event.type === "input") render(this);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "pointerdown") onPointerDown(this, event);
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		const el = !this._options && this.querySelector('[role="option"],option'); // Support renaming u-option element
		if (el) this._options = this.getElementsByTagName(el?.nodeName as "option");
		return this._options || this.getElementsByTagName("option"); // Fallback when u-option is not initialized yet
	}
}

const isDisabled = (el: HTMLInputElement) => el.disabled || el.readOnly;
const isVisible = (el: Element) =>
	attr(el, ARIA_HIDDEN) !== "true" && el.clientHeight;

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
	if (self._input) attr(self._input, "aria-expanded", `${open}`);
	if (!open === self.hidden || !self.isConnected) return; // No change needed
	if (!open) setActive(self); // Clear activedescendant when closing
	if (self.popover) self.togglePopover(open); // Mirror Popover API if used
	self.hidden = !open; // NOTE: This triggers MutationObserver, updating options state as well
};

const setActive = (self: UHTMLDataListElement, opt?: HTMLOptionElement) => {
	self._input?.setAttribute("aria-activedescendant", useId(opt) || "");
	for (const o of self.options) attr(o, DATA_ACTIVE, o === opt ? "" : null);
	opt?.scrollIntoView({ block: "nearest" });
};

const setInputAttributes = (
	self: UHTMLDataListElement,
	setup: HTMLInputElement | null,
	open = false,
) => {
	const input = setup || self._input;
	if (!input) return;
	if (self.popover) {
		attr(self, "popover", "manual"); // Make sure we control popover state
		attr(input, "popovertarget", setup && useId(self)); // Prepare for Popover API
	}
	attr(input, "aria-activedescendant", setup && "");
	attr(input, "aria-autocomplete", setup && "list");
	attr(input, "aria-controls", setup && useId(self));
	attr(input, "aria-expanded", setup && `${open}`);
	attr(input, "autocomplete", setup && "off");
	attr(input, "role", setup && !isDisabled(input) ? "combobox" : null);
};

const onFocus = (self: UHTMLDataListElement, { target }: Event) => {
	if (self._input === target) return; // Connected to the current target
	if (target instanceof HTMLInputElement && target.list === self) {
		setInputAttributes(self, null); // Reset previous input
		setInputAttributes(self, target); // Ensure attributes
		if (isDisabled(target)) return; // Do not open if disabled or readOnly
		if (self._root) on(self._root, EVENTS, self, true); // Use capture to catch non-bubling blur
		attr(self, "aria-label", target.labels?.[0]?.textContent.trim() || null);
		speak(); // Prepare for aria-live announcements
		self._input = target;
		if (IS_ANDROID) setExpanded(self, true); // Android TalkBack does not trigger click event on input, so expand right away
	} else if (self._input) onBlurred(self);
};

const onBlur = (
	self: UHTMLDataListElement,
	event: Event & Partial<FocusEvent>,
) => {
	isPointerDown()
		? event.stopImmediatePropagation() // Native datalist does not move focus out when selecting, so prevent blur events
		: IS_ANDROID || setTimeout(onBlurred, 0, self, event); // Samsung Internet sets keyboard-focus to <body> when screen reader to <datalist>, so we should not close on blur
};

const onBlurred = (self: UHTMLDataListElement) => {
	const focused = getFocused(self);
	if (focused === self._input || self.contains(focused)) return; // Ignore if focus is still on input or inside datalist
	if (self._root) off(self._root, EVENTS, self, true); // Unbind events relevant to focused state
	setExpanded(self, false);
	self._input = undefined;
};

const onPointerDown = (self: UHTMLDataListElement, event: Event) =>
	self.contains(event.target as Node) && isPointerDown(event); // Prevent unwanted blur when pressing options with tabindex="-1"

const onClick = (self: UHTMLDataListElement, { target }: Event) => {
	if (self._input === target) return setExpanded(self, true);
	if (!self.contains(target as Node)) return onBlurred(self);
	for (const opt of self.options)
		if (opt.contains(target as Node)) {
			self._input?.focus(); // Ensure input has focus to keep datalist open, also on pointerup
			if (self._input) setValue(self._input, opt.value);
			return setExpanded(self, attr(self, SAFE_MULTISELECTABLE) === "true");
		}
};

const onKeyDown = (self: UHTMLDataListElement, event: KeyboardEvent) => {
	if (self._input !== event.target) return; // Only handle events from connected input
	const { key, ctrlKey: c, metaKey: m, shiftKey: s, altKey: alt } = event;
	if (c || m || s || key === "Tab" || (alt && !key.startsWith("Arrow"))) return; // Skip if modifier keys or tab or non-arrow with alt
	if (key === "Escape" && !self.hidden) event.preventDefault(); // Prevent Safari from minimizing the window and <dialog> from closing

	setExpanded(self, key !== "Escape"); // Close on ESC but show on other keys
	const active = attr(self._input, "aria-activedescendant");
	const opts = [...self.options].filter(isVisible);
	const prev = opts.findIndex((opt) => opt.id === active);
	const isEnter = key === "Enter";
	let next = -1;

	if (!alt && key === "ArrowDown") next = (prev + 1) % opts.length;
	if (!alt && key === "ArrowUp") next = (prev || opts.length) - 1;
	if (~prev) {
		if (key === "Home" || key === "PageUp") next = 0;
		if (key === "End" || key === "PageDown") next = opts.length - 1;
		if (isEnter) next = prev;
	}

	if (opts[next]) event.preventDefault(); // Prevent scroll when on option
	if (isEnter && opts[next]) {
		event.stopImmediatePropagation(); // Native datalist does not trigger Enter on keydown on item, but instead a input event
		preventSubmit(self._input); // Prevent form submit on enter if "focus" is inside datalist
		opts[next].click();
	} else setActive(self, opts[next]);
};

const render = debounce((self: UHTMLDataListElement, event?: Event) => {
	if (!self._input || self.hidden) return; // Do not process if hidden or no input connected
	const query = self._input.value.toLowerCase().trim() || "";
	const filter = !self.hasAttribute("data-nofilter"); // Support proposed nofilter attribute https://github.com/whatwg/html/issues/4882
	const hide: HTMLOptionElement[] = [];
	const show: HTMLOptionElement[] = [];

	// biome-ignore format: Group all read operations for performance. The spec does not specify how to filter, so we use label as it represents text content
	for (const opt of self.options) (opt.disabled || opt.hidden || (filter && !opt.label.toLowerCase().includes(query)) ? hide : show).push(opt);
	for (const opt of hide) attr(opt, ARIA_HIDDEN, "true"); // Group all write operations for performance
	for (const opt of show) attr(opt, ARIA_HIDDEN, "false");

	clearTimeout(LIVE_TIMER); // Announce hits if real user has typed
	if (event?.type === "input" && event?.isTrusted)
		LIVE_TIMER = setTimeout(() => {
			const focus = getFocused(self);
			const text = `${(!show[0] && self.innerText.trim()) || `${self._texts[show[1] ? "plural" : "singular"]}`.replace("%d", `${show.length}`)}`;
			if (!self.hidden && focus === self._input) speak(text);
		}, 500); // 500ms makes room for screen reader to announce the typed character, before announcing the hits count

	if (IS_IOS)
		show.forEach((opt, index, { length }) => {
			attr(opt, "title", `${index + 1} ${self._texts.of} ${length}`); // Announce count in iOS
		});
}, 0); // Squash mutations and input events

// Polyfill input.list so it also receives u-datalist
if (IS_BROWSER)
	Object.defineProperty(HTMLInputElement.prototype, "list", {
		configurable: true,
		enumerable: true,
		get() {
			const id = attr(this, "list");
			return id && getRoot(this).getElementById(id);
		},
	});

customElements.define("u-datalist", UHTMLDataListElement);
