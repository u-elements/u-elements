export type { UHTMLOptionElement } from "./u-option";

import "./u-option"; // Import to register u-option
import {
	afterRender,
	ariaNotify,
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	declarativeShadowRoot,
	FOCUS_OUTLINE,
	getFocused,
	getRoot,
	IS_ANDROID,
	IS_IOS,
	isBrowser,
	off,
	on,
	onFocusLeave,
	onMutation,
	SAFE_MULTISELECTABLE,
	setValue,
	srText,
	UHTMLElement,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-datalist": HTMLDataListElement;
	}
}

const CSS_SPECIAL = /["\\\n\r\f]/g; // Only " and \ end or break a quoted attribute selector, and line breaks are invalid in a CSS string. Using regex as jsdom does not support CSS.escape
const DATA_ACTIVE = "data-activedescendant";
const ARIA_INSET = "aria-posinset";
const DATA_INSET = "data-posinset";
const ARIA_SIZE = "aria-setsize";
const DATA_SIZE = "data-setsize";
const ARIA_HIDDEN = "aria-hidden";
export const UHTMLDataListStyle = `${DISPLAY_BLOCK}
::slotted([role="option"]) { display:block;cursor:pointer }
::slotted([role="option"][${DATA_ACTIVE}]) { ${FOCUS_OUTLINE} }
::slotted([role="option"][${ARIA_HIDDEN}="true"]),
::slotted([role="option"][disabled]),
::slotted([role="option"][hidden]) { display: none !important }
::slotted([role="option"][${DATA_INSET}])::after { content: ""/", "attr(${DATA_INSET})" "var(--sr-of, "of")" "attr(${DATA_SIZE}) }
::slotted([role="option"][${DATA_INSET}][aria-setsize="-1"])::after { content: ""/", "attr(${DATA_INSET})" }`;

export const UHTMLDataListShadowRoot =
	declarativeShadowRoot(UHTMLDataListStyle);

let LIVE_TIMER: ReturnType<typeof setTimeout>;
const EVENTS_IDLE_CAPTURE = "focus click keydown mousedown";
const EVENTS_ACTIVE_BUBBLE = "input"; // Using bubble here so <u-combobox> capture input events runs before <u-datalist>. focusout and pointerdown are handled by onFocusLeave

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
	_announced?: string; // Last announced query and hit count
	_control?: HTMLInputElement; // Using underscore instead of private fields for backwards compatibility
	_options?: HTMLCollectionOf<HTMLOptionElement>; // Caching options to speed up performance
	_root?: Document | ShadowRoot; // Used to consistently remember root for event delegation
	_unfocus?: ReturnType<typeof onFocusLeave>;
	_umutate?: ReturnType<typeof onMutation>;

	static get observedAttributes() {
		return ["hidden", "id"]; // Using ES2015 syntax for backwards compatibility
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
		on(this._root, EVENTS_IDLE_CAPTURE, this, true); // Use capture to catch non-bubling focus

		// Close when focus leaves the input and the list, deferred while an option is pressed. Bound on the root as the input is outside this.
		this._unfocus = onFocusLeave(
			this._root,
			() => onBlurred(this),
			(node) => this._control === node || this.contains(node),
		);

		this._umutate = onMutation(this, onMutations, {
			attributeFilter: [
				"disabled",
				"hidden",
				"label",
				"value",
				ARIA_INSET,
				ARIA_SIZE,
			],
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true,
		});
		syncInputs(this);
	}
	disconnectedCallback() {
		if (this._root) off(this._root, EVENTS_IDLE_CAPTURE, this, true); // Unbind capture
		if (this._root) off(this._root, EVENTS_ACTIVE_BUBBLE, this); // Unbind bubble
		for (const el of getInputs(this, this.id)) setInputAttr(this, el, false); // Reset inputs by attributes
		setInputAttr(this, this._control, false); // Reset input, also if its list attribute changed
		this._unfocus?.();
		this._umutate?.();
		this._umutate = this._unfocus = this._root = this._control = undefined;
	}
	attributeChangedCallback(prop?: string, prev?: string, next?: string) {
		if (prop === "hidden") {
			// hidden is the open state, and this is the single place it is applied, whether written by setExpanded or a consumer (i.e. <u-combobox> toggle button)
			const open = next === null;
			if (this._control) attr(this._control, "aria-expanded", `${open}`);
			if (!open) setActive(this); // Clear activedescendant when closing
			if (!open) this._announced = undefined; // Announce hits again next time the list opens
			if (this.popover && this.isConnected) this.togglePopover(open); // Mirror Popover API if used
		} else if (this.isConnected) {
			for (const el of getInputs(this, prev)) setInputAttr(this, el, false); // Reset inputs left pointing to the previous id. Inputs following the id are set up again by syncInputs
			syncInputs(this);
			afterRender(() => syncInputs(this)); // Sync again once frameworks have rendered, as the input list attribute may be written after the id
		}
	}
	handleEvent(event: Event) {
		if (event.defaultPrevented) return;
		if (event.type === "focus") onFocus(this, event);
		if (event.type === "click") onClick(this, event);
		if (event.type === "input") onMutations(this);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "mousedown") onMousedown(this, event);
	}
	get options(): HTMLCollectionOf<HTMLOptionElement> {
		const el = !this._options && this.querySelector('[role="option"],option'); // Support renaming u-option element
		if (el) this._options = this.getElementsByTagName(el?.nodeName as "option");
		return this._options || this.getElementsByTagName("option"); // Fallback when u-option is not initialized yet
	}
}

const isInput = (el: unknown): el is HTMLInputElement =>
	el instanceof HTMLInputElement;
const isVisible = (el: Element) =>
	attr(el, ARIA_HIDDEN) !== "true" && el.clientHeight;

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
	if (self._control) attr(self._control, "aria-expanded", `${open}`); // Also when unchanged, i.e. when a new input connects
	if (!self.isConnected || self.hidden !== open) return; // No change needed
	if (open) setTimeout(() => clearTimeout(LIVE_TIMER)); // Prevent announcing hits on open
	self.hidden = !open; // attributeChangedCallback applies the open state, and MutationObserver updates options state
};

const setActive = (self: UHTMLDataListElement, opt?: HTMLOptionElement) => {
	if (self._control) attr(self._control, "aria-activedescendant", useId(opt));
	for (const o of self.options) attr(o, DATA_ACTIVE, o === opt ? "" : null);
	opt?.scrollIntoView?.({ block: "nearest" }); // Using ?. as JSDOM does not support scrollIntoView
};

// Inputs in the same root pointing to id through their list attribute
const getInputs = (self: UHTMLDataListElement, id?: string | null) => {
	if (!self._root || !id) return [];
	const selector = `input[list="${id.replace(CSS_SPECIAL, (c) => `\\${c.charCodeAt(0).toString(16)} `)}"]`;
	return self._root.querySelectorAll(selector as "input");
};

const syncInputs = (self: UHTMLDataListElement) => {
	const { _control, id } = self;
	if (_control && attr(_control, "list") !== id) {
		setExpanded(self, false);
		setInputAttr(self, _control, false); // Disconnect previous input
		self._control = undefined;
	}
	for (const input of getInputs(self, id)) setInputAttr(self, input);
};

// Set up input attributes, or remove them when setup is false
const setInputAttr = (
	self: UHTMLDataListElement,
	input?: HTMLInputElement | null,
	setup = true,
) => {
	const hidden = !self._root || self.hidden; // Assume hidden when no _root, as the component has not run connectedCallback yet
	const set = (value: string | null) => (setup ? value : null);
	if (!input) return;
	if (self.popover) {
		attr(self, "popover", "manual"); // Make sure we control popover state
		attr(input, "popovertarget", set(useId(self))); // Prepare for Popover API
	}
	attr(input, "aria-autocomplete", set("list"));
	attr(input, "aria-controls", set(useId(self)));
	attr(input, "aria-expanded", set(`${!hidden}`));
	attr(input, "autocomplete", set("off"));
	attr(input, "enterkeyhint", "done");
	attr(input, "role", set("combobox"));
};

const onFocus = (self: UHTMLDataListElement, { target: el }: Event) => {
	if (self._control === el) return; // Connected to the current target
	if (isInput(el) && el.getAttribute("list") === self.id) {
		setInputAttr(self, self._control, false); // Reset previous input
		setInputAttr(self, el); // Ensure attributes
		if (el.readOnly || el.matches(":disabled")) return; // Do not open if disabled or readOnly
		if (self._root) on(self._root, EVENTS_ACTIVE_BUBBLE, self); // Listen to input events to update the list
		attr(self, "aria-label", el.labels?.[0]?.textContent.trim() || null);
		ariaNotify(); // Prepare for aria-live announcements
		self._control = el;
		if (IS_ANDROID) setExpanded(self, true); // Android TalkBack does not trigger click event on input, so expand right away
	} else onBlurred(self);
};

// Focus has left the input and the list (see onFocusLeave), or focus moved to another input, or a click landed outside
const onBlurred = (self: UHTMLDataListElement) => {
	const focus = getFocused(self);
	if (self._control === focus || self.contains(focus)) return; // Ignore if focus is still on input or inside datalist, as onFocus and onClick call this directly
	if (self._root) off(self._root, EVENTS_ACTIVE_BUBBLE, self); // Unbind events relevant to focused state
	setExpanded(self, false);
	self._control = undefined;
};

// Keep focus on the input when pressing inside the list, so no blur closes it or makes the browser dispatch change with the typed text before the pick.
// mousedown (also the compatibility mousedown after a touch tap) is what moves focus, and cancelling it never suppresses the click or scrollbar drag
const onMousedown = (self: UHTMLDataListElement, event: Event) => {
	if (self.contains(event.target as Node)) event.preventDefault();
};

const onClick = (self: UHTMLDataListElement, event: Event) => {
	const el = event.target as Node;
	if (isInput(el)) onFocus(self, event); // Make sure we potentially connect, in case focus happens before u-datalist connectedCallback has run
	if (self._control === el) return setExpanded(self, true);
	if (!self.contains(el) || !self._control?.isConnected) return onBlurred(self); // Firefox and WebKit dispatch no focusout for a removed focused input, so release it on the first pick instead
	for (const opt of self.options)
		if (opt.contains(el)) {
			self._control?.focus(); // Ensure input has focus to keep datalist open, also on pointerup
			if (self._control) {
				const inputType = "insertReplacementText";
				setValue(self._control, opt.value, inputType, true); // Dispatch change like native <datalist>, unless an input handler reverted the value (i.e. <u-combobox>)
			}
			return setExpanded(self, attr(self, SAFE_MULTISELECTABLE) === "true");
		}
};

const onKeyDown = (self: UHTMLDataListElement, event: KeyboardEvent) => {
	if (isInput(event.target)) onFocus(self, event); // Make sure we potentially connect, in case focus happens before u-datalist connectedCallback has run
	if (self._control !== event.target) return; // Only handle events from connected input
	const { key, ctrlKey, metaKey, altKey, repeat } = event;
	const isComposing = event.isComposing || event.keyCode === 229; // Chrome has isComposing false on the keydown starting a composition, but keyCode 229
	const skip = ctrlKey || metaKey || key === "Shift" || key === "Tab";
	if (skip || (altKey && !key.startsWith("Arrow"))) return; // Skip if modifier keys or tab or non-arrow with alt
	if (key === "Escape" && !self.hidden && !isComposing) event.preventDefault(); // Prevent Safari from minimizing the window and <dialog> from closing

	const isEnter = key === "Enter";
	if (!repeat && !(isComposing && key === "Escape"))
		setExpanded(self, key !== "Escape"); // Close on ESC but show on other keys, except a held Enter, which must not re-open after the pick closed the list, and ESC while composing, which only cancels the composition
	if (isComposing) return; // The IME owns Enter, Escape and arrows while composing, so only open the list
	const active = attr(self._control, "aria-activedescendant");
	const opts: HTMLOptionElement[] = [];
	let prev = -1;
	let next = -1;
	for (const opt of self.options)
		if (isVisible(opt)) {
			opts.push(opt); // Performance optimized loop as this runs many times
			if (opt.id === active) prev = opts.length - 1;
		}

	if (!altKey && key === "ArrowDown") next = (prev + 1) % opts.length;
	if (!altKey && key === "ArrowUp") next = (prev || opts.length) - 1;
	if (~prev) {
		if (key === "Home" || key === "PageUp") next = 0;
		if (key === "End" || key === "PageDown") next = opts.length - 1;
		if (isEnter) next = prev;
	}

	if (opts[next]) {
		event.preventDefault(); // Prevent scroll when on option
		self._control.focus(); // Force Firefox to keep focus on input
	}
	if (isEnter && opts[next]) {
		event.stopImmediatePropagation(); // Native datalist does not trigger Enter on keydown on item, but instead a input event
		event.preventDefault(); // Prevent form submit on enter if "focus" is inside datalist, also on key repeat
		if (!repeat) opts[next].click(); // Holding Enter picks once, so a multiselect option does not toggle on every repeat
	} else setActive(self, opts[next]);
};

const onMutations = (self: UHTMLDataListElement) => {
	if (!self._control || self.hidden) return; // Do not process if hidden or no input connected
	const query = self._control.value.toLowerCase().trim() || "";
	const filter = !self.hasAttribute("data-nofilter"); // Support proposed nofilter attribute https://github.com/whatwg/html/issues/4882
	const hide: HTMLOptionElement[] = [];
	const show: HTMLOptionElement[] = [];

	// biome-ignore format: Group all read operations for performance. The spec does not specify how to filter, so we use label as it represents text content
	for (const opt of self.options) (opt.disabled || opt.hidden || (filter && !opt.label.toLowerCase().includes(query)) ? hide : show).push(opt);
	for (const opt of hide) attr(opt, ARIA_HIDDEN, "true"); // Group all write operations for performance
	for (const opt of show) attr(opt, ARIA_HIDDEN, "false");

	clearTimeout(LIVE_TIMER); // Announce hits if real user has typed
	LIVE_TIMER = setTimeout(announce, 500, self, show); // 500ms makes room for screen reader to announce the typed character, before announcing the hits count

	// onMutations, after the aria-hidden writes. On the options, not the host style, so a consumer style binding can not overwrite it
	if (IS_IOS) {
		const count = `${getCount(show)}`;
		for (const [index, opt] of show.entries()) {
			attr(opt, DATA_INSET, attr(opt, ARIA_INSET) || `${index + 1}`);
			attr(opt, DATA_SIZE, count);
		}
	}
	self._umutate?.takeRecords(); // Clear mutation records to prevent unwanted MutationObserver triggers when changing attributes in render
};

const getCount = (opts: HTMLOptionElement[]) => {
	const sized = opts.find((opt) => opt.hasAttribute(ARIA_SIZE));
	const total = Number(sized?.getAttribute(ARIA_SIZE)) || opts.length;
	return Number.isFinite(total) && total > 0 ? total : opts.length;
};

const announce = (self: UHTMLDataListElement, hits: HTMLOptionElement[]) => {
	if (self.hidden || self._control !== getFocused(self)) return;
	const count = getCount(hits);
	// biome-ignore lint: using innerText to only get visual text
	const hint = `${hits.some(({ value }) => value) ? srText(self, count === 1 ? "singular" : "plural", count === 1 ? "%d hit" : "%d hits").replace("%d", `${count}`) : (self.innerText ?? self.textContent)}`; // Fallback to textContent to support JSDOM
	const announced = JSON.stringify([self._control?.value, count, hint]);
	if (self._announced === announced) return; // Prevent re-announcing if same result
	self._announced = announced;
	ariaNotify(hint);
};

// Polyfill input.list so it also receives u-datalist
if (isBrowser())
	Object.defineProperty(HTMLInputElement.prototype, "list", {
		configurable: true,
		enumerable: true,
		get() {
			const id = attr(this, "list");
			return id && getRoot(this).getElementById(id);
		},
	});

customElements.define("u-datalist", UHTMLDataListElement);
