import {
	DISPLAY_BLOCK,
	FOCUS_OUTLINE,
	UHTMLElement,
	attachStyle,
	customElements,
} from "../utils";

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
	static observedAttributes = [DISABLED, SELECTED];
	constructor() {
		super();
		attachStyle(
			this,
			`${DISPLAY_BLOCK}:host(:focus){${FOCUS_OUTLINE}}:host{ cursor: pointer }`,
		);
	}
	connectedCallback() {
		this.role = "option";
		this.tabIndex = -1;
		this.attributeChangedCallback(); // Setup aria attributes
	}
	attributeChangedCallback() {
		this.ariaDisabled = `${this.disabled}`;
		this.ariaSelected = `${this.selected}`;
	}
	/** Sets or retrieves whether the option in the list box is the default item. */
	get defaultSelected(): boolean {
		return this[SELECTED];
	}
	set defaultSelected(value: boolean) {
		this[SELECTED] = value;
	}
	get disabled(): boolean {
		return this.getAttribute(DISABLED) !== null;
	}
	set disabled(value: boolean) {
		this.toggleAttribute(DISABLED, value);
	}
	/** Retrieves a reference to the form that the object is embedded in. */
	get form(): HTMLFormElement | null {
		return this.closest("form");
	}
	/** Sets or retrieves the ordinal position of an option in a list box. */
	get index(): number {
		const options =
			this.closest("u-datalist")?.getElementsByTagName("u-option");
		return Array.from(options || [this]).indexOf(this); // Fallback to 0 complies with specification
	}
	/** Sets or retrieves a value that you can use to implement your own label functionality for the object. */
	get label(): string {
		return this.getAttribute("label") || this.text;
	}
	set label(value: string) {
		this.setAttribute("label", value);
	}
	get selected(): boolean {
		return this.getAttribute(SELECTED) !== null;
	}
	set selected(value: boolean) {
		this.toggleAttribute(SELECTED, value);
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
		return this.getAttribute("value") || this.text;
	}
	set value(value: string) {
		this.setAttribute("value", value);
	}
}

customElements.define("u-option", UHTMLOptionElement);
