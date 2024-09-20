import {
	IS_FIREFOX,
	IS_IOS,
	UHTMLElement,
	attr,
	createElement,
	customElements,
	getLabel,
	getRoot,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-progress": HTMLProgressElement;
	}
}

// Skip attributeChangedCallback caused by attributeChangedCallback
let SKIP_ATTR_CHANGE = false;

/**
 * The `<u-progress value="70" max="100">` HTML element displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)
 */
export class UHTMLProgressElement extends UHTMLElement {
	// Prevent Chrome DevTools warning about <label for=""> pointing to <u-progress>
	static formAssociated = true;

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["aria-label", "aria-labelledby", "value", "max"]; // Also watch aria labels to sync Firefox/iOS
	}
	constructor() {
		super();
		this.attachShadow({ mode: "open" }).append(
			createElement("slot", null, { hidden: "" }), // Slot hiding content allows legacy browser to display fallback text
			createElement(
				"style",
				`:host(:not([hidden])) { box-sizing: border-box; border: 1px solid; display: inline-block; height: .5em; width: 10em; overflow: hidden }
        :host::before { content: ''; display: block; height: 100%; background: currentColor; width: var(--percentage, 0%); transition: width .2s }
        :host(:not([value])) { background: linear-gradient(90deg,currentColor 25%, transparent 50%, currentColor 75%) 50%/400% }
        @media (prefers-reduced-motion: no-preference) { :host { animation: indeterminate 2s linear infinite }  }
        @keyframes indeterminate { from { background-position-x: 100% } to { background-position-x: 0 } }`,
			),
		);
	}
	connectedCallback() {
		this.attributeChangedCallback(); // We now know the element is in the DOM, so run a attribute setup
	}
	attributeChangedCallback() {
		if (SKIP_ATTR_CHANGE) return; // Skip attributeChangedCallback caused by attributeChangedCallback
		SKIP_ATTR_CHANGE = true;
		const roleImage = IS_IOS || IS_FIREFOX; // iOS and Firefox does not correctly read value of role="progress"
		const percentage = Math.max(0, Math.round(this.position * 100)); // Always use percentage as iOS role="progressbar"
		this.style.setProperty("--percentage", `${percentage}%`); // Write style before any read operation to avoid excess animation
		let label = getLabel(this); // Uses innerText so must be after setting this.style

		if (roleImage) label = `${label.replace(/\d+%$/, "")} ${percentage}%`;
		if (IS_FIREFOX) for (const el of this.labels) attr(el, "aria-label", label); // Fixes double announcement in Firefox

		attr(this, "aria-busy", `${this.position === -1}`); // true if indeterminate
		attr(this, "aria-label", label.trim());
		attr(this, "aria-labelledby", null); // Since we always want to use aria-label
		attr(this, "aria-valuemax", "100");
		attr(this, "aria-valuemin", "0");
		attr(this, "aria-valuenow", `${percentage}`);
		attr(this, "role", roleImage ? "img" : "progressbar");

		SKIP_ATTR_CHANGE = false;
	}
	get labels(): NodeListOf<HTMLLabelElement> {
		const label = this.closest<HTMLLabelElement>("label:not([for])");
		const id = useId(this);

		if (label) label.htmlFor = id; // Set for of parent label to include it in returned NodeList
		const el = getRoot(this).querySelectorAll<HTMLLabelElement>(
			`label[for="${id}"]`,
		);
		return el;
	}
	get position(): number {
		return this.value === null ? -1 : Math.min(this.value / this.max, 1);
	}
	get value(): number | null {
		return getNumber(this, "value");
	}
	set value(value: string | number | null) {
		setNumber(this, "value", value);
	}
	get max(): number {
		return getNumber(this, "max") || 1;
	}
	set max(max: string | number | null) {
		setNumber(this, "max", max);
	}
}

const isNumeric = (value: unknown): value is number | string =>
	!Number.isNaN(Number.parseFloat(`${value}`)) &&
	Number.isFinite(Number(value));

const getNumber = (el: Element, key: string): number | null => {
	const value = attr(el, key);
	return isNumeric(value) ? Math.max(0, Number.parseFloat(value)) : null;
};

const setNumber = (el: Element, key: string, val: unknown) => {
	if (val === null || isNumeric(val)) attr(el, key, `${val}`);
	else throw new Error(`Failed to set non-numeric '${attr}': '${val}'`);
};

customElements.define("u-progress", UHTMLProgressElement);
