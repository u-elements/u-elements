import {
	FOCUS_OUTLINE,
	IS_ANDROID,
	IS_FIREFOX,
	SAFE_MULTISELECTABLE,
	UHTMLElement,
	ariaLive,
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

const EVENTS = "input,focusin,focusout,keydown";
const TEXTS = {
	added: "Added",
	remove: "Press to remove",
	removed: "Removed",
	empty: "No selected",
	found: "Navigate left to find %d selected",
	of: "of",
};

/**
 * The `<u-tags>` HTML element contains a set of `<data>` elements.
 * No MDN reference available.
 */
export class UHTMLTagsElement extends UHTMLElement {
	#blurTimer: ReturnType<typeof setTimeout> | number = 0;
	#focusIndex: number | null = null;
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
		this.#render(); // Set initial aria-labels and selected items in datalist

		mutationObserver(this, { childList: true }); // Observe u-datalist to add aria-multiselect="true"
		on(this.#root, "click", this); // Bind click-to-focus-input on root
		on(this, EVENTS, this);
	}
	disconnectedCallback() {
		mutationObserver(this, false);
		off(this.#root || this, "click", this); // Unbind click-to-focus-input on root
		off(this, EVENTS, this);
		this.#root = null;
	}
	handleEvent(event: Event) {
		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (event.type === "click") this.#onClick(event as MouseEvent);
		if (event.type === "focusin") this.#onFocusIn(event);
		if (event.type === "focusout") this.#onFocusOut();
		if (event.type === "input") this.#onInputOptionClick(event as InputEvent);
		if (event.type === "keydown") this.#onKeyDown(event as KeyboardEvent);
		if (event.type === "mutation") this.#render(event as CustomEvent);
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
	get control() {
		return this.querySelector("input");
	}

	#dispatchChange(item: HTMLDataElement) {
		return this.dispatchEvent(
			new CustomEvent("tags", {
				bubbles: true,
				cancelable: true,
				detail: { item, action: item.isConnected ? "remove" : "add" },
			}),
		);
	}

	#render(event?: CustomEvent<MutationRecord[]>) {
		const texts = { ...TEXTS, ...this.dataset };
		const change = Number.isNaN(this.#focusIndex) ? null : event?.detail[0]; // Skip announcing changes when no focus
		const changeItem = change?.addedNodes[0] || change?.removedNodes[0];
		const changeText = `${changeItem ? `${changeItem.isConnected ? texts.added : texts.removed} ${changeItem.textContent}, ` : ""}`;
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
		const list = document.getElementById(control?.getAttribute("list") || ""); // UHTMLDatalist might not be initialized yet
		list?.setAttribute(SAFE_MULTISELECTABLE, "true"); // Make <u-datalist> multiselect
		for (const option of list?.children || []) {
			const value = option.getAttribute("value") || option.textContent || "";
			option.toggleAttribute("selected", values.includes(value)); // Set selected options in datalist
		}
		if (control)
			control.ariaLabel = `${changeText}${this.ariaLabel}, ${values.length ? texts.found.replace("%d", `${values.length}`) : texts.empty}`;

		// Announce item change
		if (changeText) {
			const isDesktopFireFox = IS_FIREFOX && !IS_ANDROID; // FireFox desktop announces ariaLabel changes
			const nextFocus = this.items[(this.#focusIndex || 1) - 1] || control;
			const nowFocus = getRoot(this).activeElement;

			if (nextFocus === nowFocus) ariaLive(changeText);
			else if (nextFocus !== control) nextFocus?.focus();
			else setTimeout(() => nextFocus?.focus(), 100); // Add 100ms delay to avoid native input announcement in Chrome

			// Reset ariaLabel with setTimeout as mobile phones does not trigger focusout,
			// but use focusout on desktop Firefox as Firefox announces ariaLabel changes
			setTimeout(() => {
				if (!isDesktopFireFox) this.#render();
				else on(self, "focusout", () => this.#render(), { once: true });
			}, 500);
		}
	}

	#onFocusIn({ target }: Event) {
		ariaLive(true);
		clearTimeout(this.#blurTimer);
		this.#focusIndex = [...this.items].indexOf(target as HTMLDataElement);
	}

	#onFocusOut() {
		this.#blurTimer = setTimeout(() => {
			this.#focusIndex = null;
			ariaLive(false);
		});
	}

	#onClick({ target, clientX: x, clientY: y }: MouseEvent) {
		const label = (target as Element)?.closest?.("label")?.htmlFor;
		const items = this.contains(target as Node) ? [...this.items] : null; // Only care about items if click is inside
		const itemRemove = items?.find((item) => item.contains(target as Node)); // Only keyboard and screen reader can set event.target to element pointer-events: none
		const itemClicked = items?.find((item) => {
			const { top, right, bottom, left } = item.getBoundingClientRect(); // Use coordinates to inside since pointer-events: none will prevent correct event.target
			return y >= top && y <= bottom && x >= left && x <= right;
		});

		if (itemRemove && this.#dispatchChange(itemRemove)) itemRemove.remove();
		else if (itemClicked) itemClicked.focus();
		else if (target === this || label === this.id) this.control?.focus(); // Focus if clicking <u-tags> or <label>
	}

	#onInputOptionClick(event: InputEvent) {
		const input = event.target as HTMLInputElement;
		if (event.inputType || !input.value.trim()) return; // Skip typing or empty (clicking item in <datalist> or pressing "Enter" triggers onInput, but without inputType)
		const items = [...this.items];
		const options = Array.from(input?.list?.options || []);
		const optionClicked = options.find(({ value }) => value === input?.value);
		const itemRemove = items.find((item) => item.value === input?.value);
		const itemAdd = createElement("data", {
			textContent: optionClicked?.text || input?.value,
			value: input?.value,
		});

		if (input) input.value = "";
		if (!this.#dispatchChange(itemRemove || itemAdd)) return;
		if (itemRemove) return itemRemove.remove();
		if (!items[0]) return this.prepend(itemAdd); // If no items, add first
		items[items.length - 1].insertAdjacentElement("afterend", itemAdd); // Add after last item
	}

	#onKeyDown(event: KeyboardEvent) {
		const { key, repeat, target } = event;
		const input = this.control === target ? this.control : null;
		let index = input ? this.items.length : this.#focusIndex ?? -1;

		if (index === -1 || (!input && asButton(event))) return; // Skip if focus is neither on item or input or if item click
		if (key === "ArrowRight" && !input) index += 1;
		else if (key === "ArrowLeft" && !input?.selectionEnd) index -= 1;
		else if (key === "Enter" && input) {
			event.preventDefault(); // Prevent submit
			return input.dispatchEvent(new Event("input", { bubbles: true }));
		} else if (key === "Backspace" || key === "Delete") {
			const remove = this.items[index];
			if (repeat || input?.selectionEnd) return; // Prevent multiple deletes and only delete if in caret is at start
			if (remove) return this.#dispatchChange(remove) && remove.remove();
			if (input) index -= 1;
		} else return; // Skip other keys

		event.preventDefault(); // Prevent datalist arrow events
		(this.items[Math.max(0, index)] || this.control)?.focus();
	}
}

customElements.define("u-tags", UHTMLTagsElement);
