import {
	asButton,
	attr,
	createElement,
	customElements,
	DISPLAY_BLOCK,
	getRoot,
	off,
	on,
	SAFE_LABELLEDBY,
	UHTMLElement,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-details": HTMLDetailsElement;
		"u-summary": HTMLElement;
	}
}

/**
 * The `<u-details>` HTML element creates a disclosure widget in which information is visible only when the widget is toggled into an "open" state. A summary or label must be provided using the `<u-summary>` element.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details)
 */
export class UHTMLDetailsElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_content: HTMLSlotElement | null = null;

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["open"];
	}
	constructor() {
		super();
		this.attachShadow({ mode: "open" }).append(
			createElement("slot", null, { name: "summary" }),
			createElement("slot", null, { part: "details-content" }),
			createElement(
				"style",
				`${DISPLAY_BLOCK}
        ::slotted(u-summary) { cursor: pointer; display: block }
				::slotted(u-summary)::before { content: ''; display: inline-block; vertical-align: middle; margin-inline: .05em .3125em; border-block: .3125em solid transparent; border-inline-start: .5em solid }
				::slotted(u-summary[aria-expanded="true"])::before { rotate: 90deg }
				:host > [part="details-content"]:not([hidden=""]) { display: block }`,
			),
		);
	}
	connectedCallback() {
		this._content = this.shadowRoot?.children[1] as HTMLSlotElement;
		attr(this, "role", "group"); // Set role to group align with HTMLDetailsElement
		on(this._content, "beforematch", this); // Open if browsers Find in page reveals content
		on(this, "click,keydown", this);
		this.attributeChangedCallback(); // We now know the element is in the DOM, so run a attribute setup
	}
	disconnectedCallback() {
		if (this._content) off(this._content, "beforematch", this);
		off(this, "click,keydown", this);
		this._content = null;
	}
	attributeChangedCallback(prop?: string, prev?: string, next?: string) {
		const hide = "onbeforematch" in this ? "until-found" : true; // Use "until-found" if supported
		const open = this.open; // Cache for speed

		// Uses nodeName (not instanceof) since UHTMLSummaryElement might not be initialized yet
		for (const el of this.children)
			if (el.nodeName === "U-SUMMARY") {
				attr(this, SAFE_LABELLEDBY, useId(el));
				attr(el, "aria-expanded", `${open}`);
			}

		if (this._content) {
			attr(this._content, "aria-hidden", `${!open}`); // Needed to prevent announcing "group" when closed in Chrome on Mac
			this._content.hidden = open ? false : (hide as boolean); // Make typescript accept "until-found"
		}

		// Close other u-details with same name
		if (open && this.name) {
			const uDetailsList = getRoot(this).querySelectorAll<UHTMLDetailsElement>(
				`${this.nodeName}[name="${this.name}"]`,
			);

			for (const uDetails of uDetailsList)
				if (uDetails !== this) uDetails.open = false;
		}

		// Trigger toggle event if change of open state
		// Comparing null version of prev and next since open attribute is truthy for "", "true" etc.
		if (prop === "open" && (prev === null) !== (next === null))
			this.dispatchEvent(new Event("toggle"));
	}
	handleEvent(event: Event) {
		const summary = this.querySelector(":scope > u-summary");
		const isSummary = summary?.contains(event.target as Node);

		if (event.defaultPrevented) return; // Allow all events to be canceled
		if (event.type === "beforematch") this.open = true;
		if (isSummary && event.type === "keydown") asButton(event);
		if (isSummary && event.type === "click") this.open = !this.open;
	}
	get open(): boolean {
		return this.hasAttribute("open");
	}
	set open(value) {
		attr(this, "open", value ? "" : null);
	}
	get name(): string {
		return attr(this, "name") || "";
	}
	set name(value: string) {
		attr(this, "name", value);
	}
}

/**
 * The `<u-summary>` HTML element specifies a summary, caption, or legend for a `<u-details>` element's disclosure box. Clicking the `<u-summary>` element toggles the state of the parent `<u-details>` element open and closed.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)
 */
export class UHTMLSummaryElement extends UHTMLElement {
	connectedCallback() {
		attr(this, "role", "button");
		this.slot = "summary";
		this.tabIndex = 0;
	}
}

customElements.define("u-details", UHTMLDetailsElement);
customElements.define("u-summary", UHTMLSummaryElement);
