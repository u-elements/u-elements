import {
	attachStyle,
	attr,
	customElements,
	declarativeShadowRoot,
	getLabel,
	getRoot,
	IS_IOS,
	UHTMLElement,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-progress": HTMLProgressElement;
	}
}

let SKIP_ATTRIBUTE_CHANGE = false;
const VALUE = "value";
const MAX = "max";

export const UHTMLProgressStyle = `:host(:not([hidden])) { box-sizing: border-box; border: 1px solid; display: inline-block; height: .5em; width: 10em; overflow: hidden }
:host::before { content: ''; display: block; height: 100%; background: currentColor; width: var(--percentage, 0%); transition: width .2s }
:host(:not([value])) { background: linear-gradient(90deg,currentColor 25%, transparent 50%, currentColor 75%) 50%/400% }
@media (prefers-reduced-motion: no-preference) { :host { animation: indeterminate 2s linear infinite }  }
@keyframes indeterminate { from { background-position-x: 100% } to { background-position-x: 0 } }`;

export const UHTMLProgressShadowRoot =
	declarativeShadowRoot(UHTMLProgressStyle);

/**
 * The `<u-progress value="70" max="100">` HTML element displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)
 */
export class UHTMLProgressElement extends UHTMLElement {
	_internals?: ElementInternals;

	// Prevent Chrome DevTools warning about <label for=""> pointing to <u-progress>
	static formAssociated = true;

	static get observedAttributes() {
		return ["aria-label", "aria-labelledby", VALUE, MAX]; // Using ES2015 syntax for backwards compatibility
	}

	constructor() {
		super();
		attachStyle(this, UHTMLProgressStyle);
		this._internals = this.attachInternals?.();
	}
	connectedCallback() {
		attr(this, "aria-valuemin", "0");
		attr(this, "aria-valuemax", "100");
		attr(this, "role", IS_IOS ? "img" : "progressbar");
		this.attributeChangedCallback();
	}
	attributeChangedCallback() {
		if (SKIP_ATTRIBUTE_CHANGE || !this.hasAttribute("role")) return; // Prevent infinite loop when updating ARIA attributes
		SKIP_ATTRIBUTE_CHANGE = true;
		const position = this.position;
		const percentage = Math.max(0, Math.round(position * 100));

		// Write CSS variable before getLabel (innerText triggers style recalc)
		this.style.setProperty("--percentage", `${percentage}%`);

		let label = getLabel(this);
		if (IS_IOS)
			label = `${label.replace(/\(\d+%\)$/, "")} (${percentage}%)`.trim(); // Always use percentage as iOS role="img"

		// Set ARIA attributes
		attr(this, "aria-busy", `${position === -1}`);
		attr(this, "aria-label", label); // Must use aria-label to include percentage value
		attr(this, "aria-labelledby", null);
		attr(this, "aria-valuenow", position === -1 ? null : `${percentage}`);
		SKIP_ATTRIBUTE_CHANGE = false;
	}
	get labels(): NodeList {
		const labels = this._internals?.labels;
		if (labels) return labels; // Use native labels if supported

		const id = useId(this);
		const label = this.closest("label:not([for])");
		if (label) attr(label, "for", id);
		return getRoot(this).querySelectorAll(`label[for="${id}"]`); // Fallback to manual label association
	}
	get position(): number {
		return this.hasAttribute(VALUE) ? Math.min(this.value / this.max, 1) : -1;
	}
	get value(): number {
		return Math.min(getNumber(this, VALUE), this.max);
	}
	set value(value: unknown) {
		setNumber(this, VALUE, value);
	}
	get max(): number {
		return getNumber(this, MAX, 1);
	}
	set max(max: unknown) {
		setNumber(this, MAX, max, 1);
	}
}

const getNumber = (el: Element, key: string, alt = 0) => {
	const value = attr(el, key);
	const float = Math.max(0, Number(value));
	if (value === null) return alt;
	return (Number.isFinite(float) && float) || alt;
};

const setNumber = (el: Element, key: string, value: unknown, alt = 0) => {
	const float = Math.max(0, Number(value));
	if (Number.isFinite(float)) return attr(el, key, `${float || alt}`);
	throw new Error(
		`Failed to set the '${key}' property on 'UHTMLProgressElement': The provided double value is non-finite.`,
	);
};

customElements.define("u-progress", UHTMLProgressElement);
