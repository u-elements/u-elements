import { IS_IOS, UHTMLElement, attr, customElements } from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-option": HTMLOptionElement;
	}
}

// Constants for better compression
const DISABLED = "disabled";
const SELECTED = "selected";

/**
 * The `<u-option>` HTML element is used to define an item contained in a `<u-datalist>` element. As such, <u-option> can represent lists of items in an HTML document.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option)
 */
export class UHTMLOptionElement extends UHTMLElement {
	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return [DISABLED, SELECTED];
	}
	connectedCallback() {
		if (!IS_IOS) this.tabIndex = -1; // Do not set tabIndex on iOS as this causes keyboard to toggle on and off
		if (!this.hasAttribute("role")) attr(this, "role", "option"); // Only set role if not allready specified
		this.attributeChangedCallback(); // Setup aria attributes (Firefox defaults to "selected" unless aria-selected="false" is set)
	}
	attributeChangedCallback() {
		attr(this, "aria-disabled", `${this.disabled}`);
		attr(this, "aria-selected", `${this.selected}`);
	}
	/** Sets or retrieves whether the option in the list box is the default item. */
	get defaultSelected(): boolean {
		return this[SELECTED];
	}
	set defaultSelected(value: boolean) {
		this[SELECTED] = value;
	}
	get disabled(): boolean {
		return attr(this, DISABLED) !== null;
	}
	set disabled(value: boolean) {
		attr(this, DISABLED, value ? "" : null);
	}
	/** Retrieves a reference to the form that the object is embedded in. */
	get form(): HTMLFormElement | null {
		return this.closest("form");
	}
	/** Sets or retrieves the ordinal position of an option in a list box. */
	get index(): number {
		return [
			...((this.parentElement as HTMLDataListElement)?.options || [this]),
		].indexOf(this); // Fallback to 0 complies with specification
	}
	/** Sets or retrieves a value that you can use to implement your own label functionality for the object. */
	get label(): string {
		return attr(this, "label") ?? this.text; // Using ?? to also support empty string
	}
	set label(value: string) {
		attr(this, "label", value);
	}
	get selected(): boolean {
		return attr(this, SELECTED) !== null;
	}
	set selected(value: boolean) {
		attr(this, SELECTED, value ? "" : null);
	}
	/** Sets or retrieves the text string specified by the option tag. */
	get text(): string {
		return this.textContent?.trim() || "";
	}
	set text(text: string) {
		this.textContent = text;
	}
	/** Sets or retrieves the value which is returned to the server when the form control is submitted. */
	get value(): string {
		return attr(this, "value") ?? this.text; // Using ?? to also support empty string
	}
	set value(value: string) {
		attr(this, "value", value);
	}
}

customElements.define("u-option", UHTMLOptionElement);
