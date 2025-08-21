import {
	asButton,
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	declarativeShadowRoot,
	getRoot,
	mutationObserver,
	off,
	on,
	SAFE_LABELLEDBY,
	UHTMLElement,
	useId,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-tabs": UHTMLTabsElement;
		"u-tablist": UHTMLTabListElement;
		"u-tab": UHTMLTabElement;
		"u-tabpanel": UHTMLTabPanelElement;
	}
}

export const UHTMLTabsStyle = DISPLAY_BLOCK;
export const UHTMLTabListStyle = DISPLAY_BLOCK;
export const UHTMLTabPanelStyle = DISPLAY_BLOCK;
export const UHTMLTabStyle =
	":host(:not([hidden])) { cursor: pointer; display: inline-block }";

export const UHTMLTabsShadowRoot = declarativeShadowRoot(UHTMLTabsStyle);
export const UHTMLTabListShadowRoot = declarativeShadowRoot(UHTMLTabListStyle);
export const UHTMLTabShadowRoot = declarativeShadowRoot(UHTMLTabStyle);
export const UHTMLTabPanelShadowRoot =
	declarativeShadowRoot(UHTMLTabPanelStyle);

const ARIA_CONTROLS = "aria-controls";
const ARIA_SELECTED = "aria-selected";

/**
 * The `<u-tabs>` HTML element is used to group a `<u-tablist>` and several `<u-tabpanel>` elements.
 * No MDN reference available.
 */
export class UHTMLTabsElement extends UHTMLElement {
	constructor() {
		super();
		attachStyle(this, UHTMLTabsStyle);
	}
	get tabList(): UHTMLTabListElement | null {
		return queryWithoutNested("u-tablist", this)[0] || null;
	}
	get selectedIndex(): number {
		return getSelectedIndex(this.tabs);
	}
	set selectedIndex(index: number) {
		setSelected(this.tabs[index]);
	}
	get tabs(): NodeListOf<UHTMLTabElement> {
		return queryWithoutNested("u-tab", this);
	}
	get panels(): NodeListOf<UHTMLTabPanelElement> {
		return queryWithoutNested("u-tabpanel", this);
	}
}

/**
 * The `<u-tablist>` HTML element serves as the container for a set of `<u-tab>` elements. The `<u-tab>` content are referred to as `<u-tabpanel>` elements.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tablist_role)
 */
export class UHTMLTabListElement extends UHTMLElement {
	constructor() {
		super();
		attachStyle(this, UHTMLTabListStyle);
	}
	connectedCallback() {
		attr(this, "role", "tablist");
		on(this, "click,keydown", this); // Listen for tab events on tablist to minimize amount of listeners
		mutationObserver(this, { childList: true }); // Using mutation to ensure all u-tab elements have rendered
		if (this.tabs.length) this.handleEvent(); // Trigger initial "mutation" if already containing children
	}
	disconnectedCallback() {
		off(this, "click,keydown", this);
		mutationObserver(this, false);
	}
	handleEvent(event?: Event) {
		if (!event || event.type === "mutation") {
			const tab = this.tabs[Math.max(this.selectedIndex, 0)]; // Fallback to first tab if non is select
			return tab?.setAttribute(ARIA_SELECTED, "true"); // Using setAttribute to trigger attributeChangedCallback
		}

		const { key } = event as KeyboardEvent;
		const tabs = [...this.tabs];
		const prev = tabs.findIndex((tab) => tab.contains(event.target as Node));
		let next = prev;

		if (event.defaultPrevented || prev === -1) return; // Event prevented or not a tab
		if (event.type === "click") setSelected(tabs[prev]);
		if (event.type === "keydown" && !asButton(event)) {
			if (key === "ArrowDown" || key === "ArrowRight")
				next = (prev + 1) % tabs.length;
			else if (key === "ArrowUp" || key === "ArrowLeft")
				next = (prev || tabs.length) - 1;
			else if (key === "End") next = tabs.length - 1;
			else if (key === "Home") next = 0;
			else if (key === "Tab") next = getSelectedIndex(tabs);
			else return; // Do not hijack other keys

			// Change tabIndex after event has run to make sure Tab key works as expected
			setTimeout(() => {
				tabs[prev].tabIndex = -1;
				tabs[next].tabIndex = 0;
			});

			if (key !== "Tab") {
				event.preventDefault(); // Prevent scroll
				tabs[next].focus();
			}
		}
	}
	get tabsElement(): UHTMLTabsElement | null {
		return this.closest("u-tabs");
	}
	get tabs(): NodeListOf<UHTMLTabElement> {
		return this.querySelectorAll("u-tab");
	}
	get selectedIndex(): number {
		return getSelectedIndex(this.tabs);
	}
	set selectedIndex(index: number) {
		setSelected(this.tabs[index]);
	}
}

/**
 * The `<u-tab>` HTML element is an interactive element inside a `<u-tablist>` that, when activated, displays its associated `<u-tabpanel>`.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tab_role)
 */
// Skip attributeChangedCallback caused by attributeChangedCallback
let SKIP_ATTR_CHANGE = false;
export class UHTMLTabElement extends UHTMLElement {
	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["id", ARIA_SELECTED, ARIA_CONTROLS];
	}
	constructor() {
		super();
		attachStyle(this, UHTMLTabStyle);
	}
	connectedCallback() {
		attr(this, "role", "tab");
		this.tabIndex = this.selected ? 0 : -1;
	}
	attributeChangedCallback() {
		if (!SKIP_ATTR_CHANGE && this.selected && this.tabList) {
			SKIP_ATTR_CHANGE = true;
			const tabs = [...this.tabList.querySelectorAll("u-tab")];
			const panels = queryWithoutNested("u-tabpanel", this.tabsElement || this);
			const nextPanel = getPanel(this, panels[tabs.indexOf(this)]);
			if (nextPanel) attr(nextPanel, SAFE_LABELLEDBY, useId(this));

			tabs.forEach((tab, index) => {
				const panel = getPanel(tab, panels[index]);

				tab.tabIndex = tab === this ? 0 : -1;
				attr(tab, ARIA_SELECTED, `${tab === this}`);
				attr(tab, ARIA_CONTROLS, panel?.id || null);
				if (panel) panel.hidden = panel !== nextPanel;
			});
			SKIP_ATTR_CHANGE = false;
		}
	}
	get tabsElement(): UHTMLTabsElement | null {
		return this.closest("u-tabs");
	}
	get tabList(): UHTMLTabListElement | null {
		const tablist = this.parentElement as UHTMLTabListElement | null;
		return tablist?.nodeName === "U-TABLIST" ? tablist : null;
	}
	get selected(): boolean {
		return attr(this, ARIA_SELECTED) === "true";
	}
	set selected(value: boolean) {
		attr(this, ARIA_SELECTED, `${!!value}`);
	}
	/** Retrieves the ordinal position of an tab in a tablist. */
	get index(): number {
		const tabList = this.tabList;
		return tabList ? [...tabList.querySelectorAll("u-tab")].indexOf(this) : 0; // Fallback to 0 complies with HTMLOptionElement specification
	}
	get panel(): UHTMLTabPanelElement | null {
		return getPanel(this);
	}
}

/**
 * The `<u-tabpanel>` HTML element is a container for the resources of layered content associated with a `<u-tab>`.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tabpanel_role)
 */
export class UHTMLTabPanelElement extends UHTMLElement {
	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["hidden"];
	}
	constructor() {
		super();
		attachStyle(this, UHTMLTabPanelStyle);
	}
	connectedCallback() {
		attr(this, "role", "tabpanel");
		this.hidden = getSelectedIndex(this.tabs) === -1;
		this.attributeChangedCallback(); // Setup initial tabindex
	}
	attributeChangedCallback() {
		const hidden = this.hidden;
		attr(this, "aria-hidden", `${hidden}`); // Safari 18.6 has a bug where hidden alone is not enough to prevent screen readers focus
		attr(this, "tabindex", hidden || isFocusable(this.firstChild) ? null : "0"); // Set tabIndex=0 only if firstChild is not interactive
	}
	get tabsElement(): UHTMLTabsElement | null {
		return this.closest("u-tabs");
	}
	get tabs(): NodeListOf<UHTMLTabElement> {
		const css = `u-tab[${ARIA_CONTROLS}="${this.id}"]`;
		return getRoot(this).querySelectorAll<UHTMLTabElement>(css);
	}
}

// Return children of tagName, but not if nested inside new u-tabpanel
const queryWithoutNested = <TagName extends keyof HTMLElementTagNameMap>(
	tag: TagName,
	self: Element,
): NodeListOf<HTMLElementTagNameMap[TagName]> =>
	self.querySelectorAll(`${tag}:not(:scope u-tabpanel ${tag})`);

// Uses nodeName (not instanceof) since UHTMLTabPanelElement might not be initialized yet
const getPanel = (tab: UHTMLTabElement, panel?: UHTMLTabPanelElement) => {
	const id = attr(tab, ARIA_CONTROLS) || useId(panel);
	const el = getRoot(tab).getElementById(id);
	return el?.nodeName === "U-TABPANEL" ? (el as UHTMLTabPanelElement) : null;
};

// Is separate functions since UHTMLTabsElement and UHTMLTabElement instances might not be created yet
const getSelectedIndex = (tabs: Iterable<UHTMLTabElement>) =>
	[...tabs].findIndex((tab) => attr(tab, ARIA_SELECTED) === "true");

const setSelected = (tab: UHTMLTabElement) =>
	tab && attr(tab, "aria-selected", "true");

const isFocusable = (el?: Node | null) =>
	el instanceof Element &&
	!el.matches(':disabled,[tabindex^="-"]') &&
	el.matches(
		`[contenteditable],[controls],[href],[tabindex],input:not([type="hidden"]),select,textarea,button,summary,iframe`,
	);

customElements.define("u-tabs", UHTMLTabsElement);
customElements.define("u-tablist", UHTMLTabListElement);
customElements.define("u-tab", UHTMLTabElement);
customElements.define("u-tabpanel", UHTMLTabPanelElement);
