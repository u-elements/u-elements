import {
	attachStyle,
	attr,
	customElements,
	declarativeShadowRoot,
	getLabel,
	getRoot,
	IS_IOS,
	onMutation,
	UHTMLElement,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-progress": HTMLProgressElement;
	}
}

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
	_unmutate?: ReturnType<typeof onMutation>; // Using underscore instead of private fields for backwards compatibility

	// Prevent Chrome DevTools warning about <label for=""> pointing to <u-progress>
	static formAssociated = true;

	constructor() {
		super();
		attachStyle(this, UHTMLProgressStyle);
	}
	connectedCallback() {
		this._unmutate = onMutation(this, onMutations, {
			attributeFilter: ["aria-label", "aria-labelledby", "value", "max"], // Using MutationObserver to merge multiple attribute changes to single callback
			attributes: true,
		});
	}
	disconnectedCallback() {
		this._unmutate?.();
		this._unmutate = undefined;
	}
	get labels(): NodeListOf<HTMLLabelElement> {
		const label = this.closest<HTMLLabelElement>("label:not([for])");
		const id = useId(this);

		if (label) attr(label, "for", id); // Set for of parent label to include it in returned NodeList
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

const onMutations = (self: UHTMLProgressElement) => {
	const percentage = Math.max(0, Math.round(self.position * 100)); // Always use percentage as iOS role="progressbar"
	self.style.setProperty("--percentage", `${percentage}%`); // Write style before any read operation to avoid excess animation
	let label = getLabel(self); // Uses innerText so must be after setting self.style

	if (IS_IOS) label = `${label.replace(/\d+%$/, "")} ${percentage}%`.trim(); // Replace removes previously added percentage
	attr(self, "aria-busy", `${self.position === -1}`); // true if indeterminate
	attr(self, "aria-label", label); // Must use aria-label to include percentage value
	attr(self, "aria-labelledby", null); // Since we always want to use aria-label
	attr(self, "aria-valuemax", "100");
	attr(self, "aria-valuemin", "0");
	attr(self, "aria-valuenow", self.position === -1 ? null : `${percentage}`);
	attr(self, "role", IS_IOS ? "img" : "progressbar"); // iOS does not announce amount, so we use img and percentage

	self._unmutate?.takeRecords(); // Prevent infinite loop that would be caused by updating aria-label and aria-valuenow
};

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
