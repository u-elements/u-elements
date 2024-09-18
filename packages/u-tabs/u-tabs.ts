import {
	DISPLAY_BLOCK,
	SAFE_LABELLEDBY,
	UHTMLElement,
	asButton,
	attachStyle,
	attr,
	customElements,
	getRoot,
	off,
	on,
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

const ARIA_CONTROLS = "aria-controls";

/**
 * The `<u-tabs>` HTML element is used to group a `<u-tablist>` and several `<u-tabpanel>` elements.
 * No MDN reference available.
 */
export class UHTMLTabsElement extends UHTMLElement {
	constructor() {
		super();
		attachStyle(this, DISPLAY_BLOCK);
	}
	get tabList(): UHTMLTabListElement | null {
		return queryWithoutNested("u-tablist", this)[0] || null;
	}
	get selectedIndex(): number {
		return getSelectedIndex(this.tabs);
	}
	set selectedIndex(index: number) {
		if (this.tabs[index]) attr(this.tabs[index], "aria-selected", "true");
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
		attachStyle(this, DISPLAY_BLOCK);
	}
	connectedCallback() {
		attr(this, "role", "tablist");
		on(this, "click,keydown", this); // Listen for tab events on tablist to minimize amount of listeners
	}
	disconnectedCallback() {
		off(this, "click,keydown", this);
	}
	handleEvent(event: Event) {
		const { key } = event as KeyboardEvent;
		const tabs = [...this.getElementsByTagName("u-tab")];
		const prev = tabs.findIndex((tab) => tab.contains(event.target as Node));
		let next = prev;

		if (event.defaultPrevented || prev === -1) return; // Event prevented or not a tab
		if (event.type === "click") tabs[prev].selected = true;
		if (event.type === "keydown" && !asButton(event)) {
			if (key === "ArrowDown" || key === "ArrowRight")
				next = (prev + 1) % tabs.length;
			else if (key === "ArrowUp" || key === "ArrowLeft")
				next = (prev || tabs.length) - 1;
			else if (key === "End") next = tabs.length - 1;
			else if (key === "Home") next = 0;
			else if (key === "Tab") next = getSelectedIndex(tabs);
			else return; // Do not hijack other keys

			setTimeout(() => {
				tabs[prev].tabIndex = -1;
				tabs[next].tabIndex = 0;
			}); // Change tabIndex after event has run to make sure Tab works as expected

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
		return queryWithoutNested("u-tab", this);
	}
	get selectedIndex(): number {
		return getSelectedIndex(this.tabs);
	}
	set selectedIndex(index: number) {
		if (this.tabs[index]) attr(this.tabs[index], "aria-selected", "true");
	}
}

/**
 * The `<u-tab>` HTML element is an interactive element inside a `<u-tablist>` that, when activated, displays its associated `<u-tabpanel>`.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tab_role)
 */
export class UHTMLTabElement extends UHTMLElement {
	static observedAttributes = ["id", "aria-selected", ARIA_CONTROLS];
	constructor() {
		super();
		attachStyle(
			this,
			":host(:not([hidden])) { cursor: pointer; display: inline-block }",
		);
	}
	connectedCallback() {
		const panelId = !attr(this, ARIA_CONTROLS) && useId(getPanel(this));
		const selected =
			this.selected ||
			![...queryWithoutNested("u-tab", this.tabList || this)].some(isSelected); // If no tabs are selected, select this one

		attr(this, "aria-selected", `${selected}`);
		attr(this, "role", "tab");
		this.tabIndex = selected ? 0 : -1;

		if (panelId) attr(this, ARIA_CONTROLS, panelId);
	}
	attributeChangedCallback(name: string, prev: string) {
		if (!this.selected) return; // Speed up by only updating attributes if selected
		const nextPanel = getPanel(this);
		const nextPanelId = useId(nextPanel);

		// Unselect previous tab if changing aria-selected
		if (name === "aria-selected" && this.tabList)
			for (const tab of queryWithoutNested("u-tab", this.tabList)) {
				if (tab !== this && isSelected(tab)) {
					attr(getPanel(tab), "hidden", "");
					attr(tab, "aria-selected", "false");
					tab.tabIndex = -1;
				}
			}

		// Hide previous panel if changing aria-controls
		if (name === ARIA_CONTROLS && prev)
			attr(getPanel(this, prev), "hidden", "");

		// Only set aria-controls if needed to prevent infinite loop
		if (nextPanelId && attr(this, ARIA_CONTROLS) !== nextPanelId)
			attr(this, ARIA_CONTROLS, nextPanelId);

		this.tabIndex = 0;
		attr(nextPanel, SAFE_LABELLEDBY, useId(this));
		attr(nextPanel, "hidden", null);
	}
	get tabsElement(): UHTMLTabsElement | null {
		return this.closest("u-tabs");
	}
	get tabList(): UHTMLTabListElement | null {
		return this.closest("u-tablist");
	}
	get selected(): boolean {
		return isSelected(this);
	}
	set selected(value: boolean) {
		attr(this, "aria-selected", `${!!value}`);
	}
	/** Retrieves the ordinal position of an tab in a tablist. */
	get index(): number {
		const tabList = this.tabList;
		return tabList
			? [...queryWithoutNested("u-tab", tabList)].indexOf(this)
			: 0; // Fallback to 0 complies with HTMLOptionElement specification
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
	static observedAttributes = ["hidden"];
	constructor() {
		super();
		attachStyle(this, DISPLAY_BLOCK);
	}
	connectedCallback() {
		attr(this, "role", "tabpanel");
		this.hidden = getSelectedIndex(this.tabs) === -1;
		this.attributeChangedCallback(); // Setup initial tabindex
	}
	attributeChangedCallback() {
		// Set tabIndex=0 only if firstElementChild is not interactive
		// Follows https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
		if (this.hidden || isFocusable(this.firstChild))
			attr(this, "tabindex", null);
		else this.tabIndex = 0;
	}
	get tabsElement(): UHTMLTabsElement | null {
		return this.closest("u-tabs");
	}
	get tabs(): NodeListOf<UHTMLTabElement> {
		const css = `u-tab[${ARIA_CONTROLS}="${this.id}"]`;
		const root = getRoot(this).querySelectorAll<UHTMLTabElement>(css);
		return root.length ? root : document.querySelectorAll<UHTMLTabElement>(css);
	}
}

// Return children of tagName, but not if nested inside element with same tagName as container
const queryWithoutNested = <TagName extends keyof HTMLElementTagNameMap>(
	tag: TagName,
	self: Element,
): NodeListOf<HTMLElementTagNameMap[TagName]> =>
	self.querySelectorAll(
		`${tag}:not(:scope ${self.nodeName}:not(:scope) ${tag})`,
	);

// Is separate functions since UHTMLTabsElement and UHTMLTabElement instances might not be created yet
const isSelected = (tab: UHTMLTabElement) =>
	attr(tab, "aria-selected") === "true";

const getSelectedIndex = (tabs: Iterable<UHTMLTabElement>) =>
	[...tabs].findIndex(isSelected);

const isFocusable = (el?: Node | null) =>
	el instanceof Element &&
	!el.matches(':disabled,[tabindex^="-"]') &&
	el.matches(
		`[contenteditable],[controls],[href],[tabindex],input:not([type="hidden"]),select,textarea,button,summary,iframe`,
	);

const getPanel = (
	tab: UHTMLTabElement,
	id?: string,
): UHTMLTabPanelElement | null => {
	const panelId = id || attr(tab, ARIA_CONTROLS);
	const panelSelector = `u-tabpanel[id="${panelId}"]`;
	const tabsElement = tab.closest("u-tabs");

	// If no panels was found, but we have a tabsElement, lets find relevant panel based on index
	return (
		(panelId && getRoot(tab).querySelector(panelSelector)) ||
		(panelId && getRoot(tab).querySelector(panelSelector)) ||
		(tabsElement &&
			queryWithoutNested("u-tabpanel", tabsElement)[
				[...queryWithoutNested("u-tab", tabsElement)].indexOf(tab)
			]) ||
		null
	);
};

customElements.define("u-tabs", UHTMLTabsElement);
customElements.define("u-tablist", UHTMLTabListElement);
customElements.define("u-tab", UHTMLTabElement);
customElements.define("u-tabpanel", UHTMLTabPanelElement);
