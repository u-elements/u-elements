import {
	afterRender,
	attachStyle,
	attr,
	customElements,
	declarativeShadowRoot,
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

const ARIA_LABEL = "aria-label";
const ARIA_LABELLEDBY = "aria-labelledby";
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
	_afterRender = false; // A re-sync is scheduled, see attributeChangedCallback
	_internals?: ElementInternals;
	_label?: string | null; // aria-label as written by the consumer, as the computed label is written to the same attribute
	_labelledby?: string | null; // aria-labelledby as written by the consumer, as it is resolved into aria-label and removed
	_skipAttrChange = false;

	// Prevent Chrome DevTools warning about <label for=""> pointing to <u-progress>
	static formAssociated = true;

	static get observedAttributes() {
		return [ARIA_LABEL, ARIA_LABELLEDBY, "id", VALUE, MAX]; // Using ES2015 syntax for backwards compatibility. id as <label for> is matched by id
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
	attributeChangedCallback(prop?: string, _?: string, next?: string | null) {
		if (!this._skipAttrChange) {
			if (prop === ARIA_LABEL) this._label = next;
			if (prop === ARIA_LABELLEDBY) this._labelledby = next;
		}
		if (this._skipAttrChange || !this.hasAttribute("role")) return; // Prevent infinite loop when updating ARIA attributes
		if (!this._afterRender && prop !== VALUE && prop !== MAX) {
			this._afterRender = true; // Sync again once frameworks have rendered, as labels and ids referenced by aria-labelledby may be written after this element (i.e. Angular and Qwik). Not for value and max, as they never affect the label and a progress bar can update every frame
			afterRender(() => {
				try {
					if (this.isConnected) this.attributeChangedCallback();
				} finally {
					this._afterRender = false; // Important to run last, so the re-sync does not schedule itself again. In finally, so a throw does not block later re-syncs
				}
			});
		}
		this._skipAttrChange = true;
		try {
			const position = this.position;
			const percentage = Math.max(0, Math.round(position * 100));

			// Write CSS variable before getLabel (innerText triggers style recalc)
			this.style.setProperty("--percentage", `${percentage}%`);

			let label = getLabel(this);
			if (IS_IOS)
				label = `${label.replace(/\(\d+%\)$/, "")} (${percentage}%)`.trim(); // Always use percentage as iOS role="img"

			// Set ARIA attributes
			attr(this, "aria-busy", `${position === -1}`);
			attr(this, "aria-valuenow", position === -1 ? null : `${percentage}`);
			attr(this, ARIA_LABEL, label); // Must use aria-label to include percentage value
			attr(this, ARIA_LABELLEDBY, null);
		} finally {
			this._skipAttrChange = false; // In finally, so a throw does not leave every later attribute change ignored
		}
	}
	get labels(): NodeListOf<HTMLLabelElement> {
		const labels = this._internals?.labels;
		if (labels) return labels as NodeListOf<HTMLLabelElement>; // Use native labels if supported

		const id = useId(this);
		const label = this.closest("label:not([for])");
		if (label) attr(label, "for", id);
		return getRoot(this).querySelectorAll<HTMLLabelElement>(
			`label[for="${id}"]`,
		); // Fallback to manual label association
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

// Like getInputLabel, but from the aria-label and aria-labelledby the consumer wrote, as the element rewrites both
const getLabel = (self: UHTMLProgressElement) => {
	const root = getRoot(self);
	const ids = self._labelledby?.split(" ") || [];
	return [
		...ids.map((id) => root.getElementById(id.trim() || "-")),
		...Array.from(self.labels),
	]
		.reduce(
			// biome-ignore lint: using innerText to only get visual text
			(acc, el) => acc || el?.innerText?.trim() || "",
			self._label || "",
		)
		.trim();
};

const getNumber = (el: Element, key: string, min = 0) => {
	const value = attr(el, key);
	const float = Number(value);
	if (value === null) return min;
	return (Number.isFinite(float) && Math.max(min, float)) || min;
};

const setNumber = (el: Element, key: string, value: unknown, min = 0) => {
	if (value === null || value === undefined) return attr(el, key, null); // Frameworks write null and undefined through the property, so remove the attribute like they would for a native element (i.e. value={undefined} for indeterminate)
	const float = Number(value);
	if (Number.isFinite(float))
		return attr(el, key, `${Math.max(min, float) || min}`);

	// The HTML spec does not specify this error message, but major browsers have started to throw when setting invalid max/value
	throw new Error(
		`Failed to set the '${key}' property on 'UHTMLProgressElement': The provided double value is non-finite.`,
	);
};

customElements.define("u-progress", UHTMLProgressElement);
