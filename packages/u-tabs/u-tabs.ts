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
	':host(:not([hidden])) { display: inline-block; cursor: pointer }:host([aria-disabled="true"]) { cursor: default }';

export const UHTMLTabsShadowRoot = declarativeShadowRoot(UHTMLTabsStyle);
export const UHTMLTabListShadowRoot = declarativeShadowRoot(UHTMLTabListStyle);
export const UHTMLTabShadowRoot = declarativeShadowRoot(UHTMLTabStyle);
export const UHTMLTabPanelShadowRoot =
	declarativeShadowRoot(UHTMLTabPanelStyle);

const ARIA_CONTROLS = "aria-controls";
const ARIA_SELECTED = "aria-selected";
const ATTR_TABS = "data-utabs";

/**
 * The `<u-tabs>` HTML element is used to group a `<u-tablist>` and several `<u-tabpanel>` elements.
 * No MDN reference available.
 */
export class UHTMLTabsElement extends UHTMLElement {
	constructor() {
		super();
		attachStyle(this, UHTMLTabsStyle);
	}
	connectedCallback() {
		attr(this, ATTR_TABS, ""); // Used to identify tabs container without relying on tagName
	}
	get tabList(): UHTMLTabListElement | null {
		return queryWithoutNested<UHTMLTabListElement>("tablist", this)[0] || null;
	}
	get selectedIndex(): number {
		return getSelectedIndex(this.tabs);
	}
	set selectedIndex(index: number) {
		setSelected(this.tabs[index]);
	}
	get tabs(): NodeListOf<UHTMLTabElement> {
		return queryWithoutNested<UHTMLTabElement>("tab", this);
	}
	get panels(): NodeListOf<UHTMLTabPanelElement> {
		return queryWithoutNested<UHTMLTabPanelElement>("tabpanel", this);
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
		requestAnimationFrame(() => this.handleEvent()); // Trigger initial "mutation" when children is mounted
	}
	disconnectedCallback() {
		off(this, "click,keydown", this);
		mutationObserver(this, false);
	}
	handleEvent(event?: Event) {
		if (!event || event.type === "mutation") {
			const tab = this.tabs[Math.max(this.selectedIndex, 0)]; // Fallback to first tab if non is select
			return tab?.setAttribute(ARIA_SELECTED, "true"); // Using setAttribute to always trigger attributeChangedCallback
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
				attr(tabs[prev], "tabindex", "-1");
				attr(tabs[next], "tabindex", "0");
			});

			if (key !== "Tab") {
				event.preventDefault(); // Prevent scroll
				(tabs[next] as HTMLElement).focus?.();
			}
		}
	}
	get tabsElement(): HTMLElement | null {
		return getTabsElement(this);
	}
	get tabs(): NodeListOf<UHTMLTabElement> {
		return getTabs(this);
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
let SKIP_ATTR_CHANGE_TAB = false;
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
		attr(this, "tabindex", this.selected ? "0" : "-1");
	}
	attributeChangedCallback() {
		if (!SKIP_ATTR_CHANGE_TAB && this.selected && this.tabList) {
			SKIP_ATTR_CHANGE_TAB = true;
			const tabs = this.tabList ? getTabs(this.tabList) : [];
			const panels = queryWithoutNested("tabpanel", this.tabsElement || this);
			const nextPanel = getPanel(this, panels[[...tabs].indexOf(this)]);
			if (nextPanel) attr(nextPanel, SAFE_LABELLEDBY, useId(this));

			let i = 0;
			for (const tab of tabs) {
				const panel = getPanel(tab, panels[i++]);

				attr(tab, "tabindex", tab === this ? "0" : "-1");
				attr(tab, ARIA_SELECTED, `${tab === this}`);
				if (panel?.id) attr(tab, ARIA_CONTROLS, panel.id); // Leave aria-controls intact if set manually
				if (panel) panel.hidden = panel !== nextPanel;
			}
			SKIP_ATTR_CHANGE_TAB = false;
		}
	}
	get tabsElement(): UHTMLTabsElement | null {
		return getTabsElement(this);
	}
	get tabList(): UHTMLTabListElement | null {
		const tablist = this.parentElement as UHTMLTabListElement;
		return tablist?.getAttribute("role") === "tablist" ? tablist : null;
	}
	get selected(): boolean {
		return attr(this, ARIA_SELECTED) === "true";
	}
	set selected(value: boolean) {
		attr(this, ARIA_SELECTED, `${!!value}`);
	}
	/** Retrieves the ordinal position of an tab in a tablist. */
	get index(): number {
		const tablist = this.tabList;
		return tablist ? [...getTabs(tablist)].indexOf(this) : 0; // Fallback to 0 complies with HTMLOptionElement specification
	}
	get panel(): HTMLElement | null {
		return getPanel(this);
	}
}

/**
 * The `<u-tabpanel>` HTML element is a container for the resources of layered content associated with a `<u-tab>`.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tabpanel_role)
 */
let SKIP_ATTR_CHANGE_PANEL = false;
export class UHTMLTabPanelElement extends UHTMLElement {
	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["id", "hidden"];
	}
	constructor() {
		super();
		attachStyle(this, UHTMLTabPanelStyle);
	}
	connectedCallback() {
		attr(this, "role", "tabpanel");
		this.tabsElement?.tabList?.handleEvent(); // Ensure proper setup when added to DOM
		this.attributeChangedCallback(); // Initial setup
	}
	attributeChangedCallback() {
		if (SKIP_ATTR_CHANGE_PANEL) return;
		SKIP_ATTR_CHANGE_PANEL = true; // Prevent loop when setting hidden attribute
		const hasFocusable = isFocusable(this.firstChild);
		this.hidden = getSelectedIndex(this.tabs) === -1; // Setup initial tabindex when mounted and attributes are set
		attr(this, "aria-hidden", `${this.hidden}`); // Safari 18.6 has a bug where hidden alone is not enough to prevent screen readers focus
		attr(this, "tabindex", this.hidden || hasFocusable ? null : "0"); // Set tabIndex=0 only if firstChild is not interactive
		SKIP_ATTR_CHANGE_PANEL = false;
	}
	get tabsElement(): UHTMLTabsElement | null {
		return getTabsElement(this);
	}
	get tabs(): NodeListOf<UHTMLTabElement> {
		return getRoot(this).querySelectorAll(
			`[role="tab"][${ARIA_CONTROLS}="${this.id}"]`,
		);
	}
}

// Return children of tagName, but not if nested inside new u-tabpanel
const queryWithoutNested = <Type extends Element>(
	role: string,
	self: Element,
) =>
	self.querySelectorAll<Type>(
		`[role="${role}"]:not(:scope [role="tabpanel"] [role="${role}"])`,
	);

// Uses attributes to avoid dependence on tag names or CustomElement instance initialization
const getPanel = (tab: Element, panel?: Element) =>
	getRoot(tab).getElementById(attr(tab, ARIA_CONTROLS) || useId(panel));

// Uses attributes to avoid dependence on tag names or CustomElement instance initialization
const getSelectedIndex = (tabs: Iterable<Element>) =>
	[...tabs].findIndex((tab) => attr(tab, ARIA_SELECTED) === "true");

const getTabsElement = (self: Element) =>
	self.closest<UHTMLTabsElement>(`[${ATTR_TABS}]`);

const getTabs = (self: Element) =>
	self.querySelectorAll<UHTMLTabElement>(`:scope > [role="tab"]`); // Only direct children of tablist is valid tabs

const setSelected = (tab?: Element | null) =>
	tab &&
	attr(tab, "aria-disabled") !== "true" &&
	attr(tab, "aria-selected", "true");

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
