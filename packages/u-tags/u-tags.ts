import {
	ARIA_LIVE,
	FOCUS_OUTLINE,
	IS_ANDROID,
	IS_FIREFOX,
	SAFE_MULTISELECTABLE,
	UHTMLElement,
	asButton,
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
		"u-tags": UHTMLTagsElement;
	}
	interface GlobalEventHandlersEventMap {
		tags: CustomEvent<{
			item: HTMLDataElement;
			action: "add" | "remove";
		}>;
	}
}

// TEST:
// If remove: Use ariaLabel
// If add: Use ariaLive

const EVENTS = "change,input,focusin,focusout,keydown";
const TEXTS = {
	added: "Added",
	remove: "Press to remove",
	removed: "Removed",
	empty: "No selected",
	found: "Navigate left to find %d selected",
	of: "of",
};

// TODO: What to include in dispatchChange detail?
// TODO: Announce datalist items count on type?

/**
 * The `<u-tags>` HTML element contains a set of `<data>` elements.
 * No MDN reference available.
 */
export class UHTMLTagsElement extends UHTMLElement {
	#blurTimer: ReturnType<typeof setTimeout> | number = 0;
	#focusIndex = Number.NaN; // NaN = focus outside, -1 = focus inside, 0+ = focus on item
	#root: null | Document | ShadowRoot = null;

	constructor() {
		super();
		this.attachShadow({ mode: "open" }).append(
			createElement("slot"), // Content slot
			createElement("style", {
				textContent: `:host(:not([hidden])){ display: inline-block }
        ::slotted(data) { cursor: pointer; display: inline-block; outline: none; pointer-events: none }
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus)::after { ${FOCUS_OUTLINE} }`, // Show focus outline around ::after only
			}),
		);
	}
	connectedCallback() {
		this.#root = getRoot(this);
		this.#render(); // Set initial aria-labels and selected items in u-datalist

		mutationObserver(this, { childList: true }); // Observe u-datalist to add aria-multiselect="true"
		on(this.#root, "click", this); // Bind click-to-focus-input on root
		on(this, EVENTS, this);
	}
	disconnectedCallback() {
		mutationObserver(this, false);
		off(this, EVENTS, this);
		off(this.#root || this, "click", this); // Unbind click-to-focus-input on root
		this.#root = null;
	}
	handleEvent(event: Event) {
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (event.type === "click") this.#onClick(event as MouseEvent);
		if (event.type === "input") this.#onInputOptionClick(event as InputEvent);
		if (event.type === "keydown") this.#onKeyDown(event as KeyboardEvent);
		if (event.type === "mutation") this.#render(event as CustomEvent);
		if (event.type === "focusin") this.#onFocusIn(event);
		if (event.type === "focusout") this.#onFocusOut();
	}
	get items(): NodeListOf<HTMLDataElement> {
		return this.querySelectorAll("data");
	}
	// Note: <label for=""> should point to <u-tags> instead of <input>,
	// since label pointing to the input overwrites input's aria-label in Firefox
	get labels(): NodeListOf<HTMLLabelElement> {
		return getRoot(this).querySelectorAll<HTMLLabelElement>(
			`label[for="${useId(this)}"]`,
		);
	}
	// A HTMLElement representing the control with which the u-tags is associated.
	get control() {
		return this.querySelector("input");
	}

	#dispatchChange(item: HTMLDataElement) {
		return this.dispatchEvent(
			new CustomEvent("tags", {
				bubbles: true,
				cancelable: true,
				detail: { item, action: item.parentNode ? "remove" : "add" },
			}),
		);
	}

	#render(event?: CustomEvent<MutationRecord[]>) {
		const texts = { ...TEXTS, ...this.dataset };
		const change = Number.isNaN(this.#focusIndex) ? null : event?.detail[0]; // Skip announcing changes when no focus
		const changeItem = change?.addedNodes[0] || change?.removedNodes[0];
		const changeText = `${changeItem ? `${changeItem.parentNode ? texts.added : texts.removed} ${changeItem.textContent}, ` : ""}`;
		const values: string[] = [];

		// Setup self
		this.ariaLabel = this.labels[0]?.textContent;
		this.items.forEach((item, index, { length }) => {
			item.ariaLabel = `${changeText}${item.textContent}, ${texts.remove}, ${index + 1} ${texts.of} ${length}`;
			item.role = "button";
			item.tabIndex = -1;
			item.value = item.value || item.textContent?.trim() || "";
			values.push(item.value);
		});

		// Setup control
		const control = this.control;
		const options = control?.list?.options || [];
		control?.list?.setAttribute(SAFE_MULTISELECTABLE, "true"); // Make <u-datalist> multiselect
		for (const opt of options) opt.selected = values.includes(opt.value);
		if (control)
			control.ariaLabel = `${changeText}${this.ariaLabel}, ${values.length ? texts.found.replace("%d", `${values.length}`) : texts.empty}`;

		// Announce item change
		if (changeItem) {
			const isDesktopFireFox = IS_FIREFOX && !IS_ANDROID; // FireFox desktop announces ariaLabel changes
			const nextFocus = this.items[(this.#focusIndex || 1) - 1] || control;

			if (nextFocus === getRoot(this).activeElement) {
				if (ARIA_LIVE) ARIA_LIVE.textContent = changeText; // If focus does not move, announce with ariaLive
			} else if (nextFocus === control) {
				setTimeout(() => nextFocus?.focus(), 100); // Add 100ms delay to avoid native input announcement in Chrome
			} else nextFocus?.focus(); // Set focus right away if moving to item

			// Use timeout to reset ariaLabel as mobile phones does not trigger focusout
			// but use focusout on only desktop Firefox since Firefox announces ariaLabel changes
			setTimeout(() => {
				if (!isDesktopFireFox) this.#render();
				else on(self, "focusout", () => this.#render(), { once: true });
			}, 500);
		}
	}

	#onFocusIn({ target }: Event) {
		clearTimeout(this.#blurTimer);
		if (ARIA_LIVE) document.body.appendChild(ARIA_LIVE);
		this.#focusIndex = [...this.items].indexOf(target as HTMLDataElement);
	}

	#onFocusOut() {
		this.#blurTimer = setTimeout(() => {
			this.#focusIndex = Number.NaN;
			ARIA_LIVE?.remove();
		});
	}

	#onClick({ target, clientX: x, clientY: y }: MouseEvent) {
		const label = (target as Element)?.closest?.("label")?.htmlFor;
		const items = this.contains(target as Node) ? [...this.items] : null;
		const itemRemove = items?.find((item) => item.contains(target as Node)); // Only keyboard and screen reader can set event.target to element pointer-events: none
		const itemClicked = items?.find((item) => {
			const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
			return y >= top && y <= bottom && x >= left && x <= right;
		});

		if (itemRemove && this.#dispatchChange(itemRemove)) itemRemove.remove();
		else if (itemClicked) itemClicked.focus();
		else if (target === this || label === this.id) this.control?.focus(); // Focus <input> if click on <u-tags>
	}

	#onInputOptionClick(event: InputEvent) {
		if (event.inputType) return; // Skip typing - clicking item in <datalist> or pressing "Enter" triggers onInput, but without inputType
		const input = event.target as HTMLInputElement;
		const items = [...this.items];
		const options = Array.from(input.list?.options || []);
		const optionClicked = options.find(({ value }) => value === input.value);
		const itemRemove = items.find((item) => item.value === input.value);
		const itemAdd = createElement("data", {
			textContent: optionClicked?.text || input.value,
			value: input.value,
		});

		input.value = "";

		if (!this.#dispatchChange(itemRemove || itemAdd)) return this.#render(); // Restore datalist state if preventDefault
		if (itemRemove) return itemRemove.remove();
		if (!items[0]) return this.prepend(itemAdd); // If no items, add first
		items[items.length - 1].insertAdjacentElement("afterend", itemAdd); // Add after last item
	}

	#onKeyDown(event: KeyboardEvent) {
		const { key, repeat, target: el } = event;
		const input = this.control;
		const items = [...this.items, input].filter(Boolean);
		const index = items.findIndex((item) => item?.contains(el as Node));
		const isCaretAtStartOfInput = !input?.selectionEnd;
		let next = -1;

		if (index === -1 || (el !== input && asButton(event))) return; // No input or item focused or keydown to click on item
		if (key === "ArrowRight") next = index + 1;
		if (key === "ArrowLeft" && isCaretAtStartOfInput) next = index - 1;
		if (key === "Enter" && el === input) {
			event.preventDefault(); // Prevent submit
			const hasValue = !!input?.value.trim();
			if (hasValue) input?.dispatchEvent(new Event("input", { bubbles: true })); // Trigger input.value change
		}
		if (key === "Backspace" || key === "Delete") {
			if (repeat || !isCaretAtStartOfInput) return; // Prevent multiple deletes and only delete if in caret is at start
			if (el === input) next = index - 1;
			else if (this.#dispatchChange(this.items[index])) items[index]?.remove();
		}
		if (items[next]) {
			event.preventDefault(); // Prevent <u-datalist> moving focus to <input>
			items[next]?.focus();
		}
	}
}

customElements.define("u-tags", UHTMLTagsElement);
