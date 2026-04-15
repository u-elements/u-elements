import {
	attachStyle,
	attr,
	customElements,
	DISPLAY_BLOCK,
	declarativeShadowRoot,
	getRoot,
	off,
	on,
	onMutation,
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

const ARIA_CONTROLS = "aria-controls";
const ARIA_DISABLED = "aria-disabled";
const ARIA_SELECTED = "aria-selected";
const TABINDEX = "tabindex";

export const UHTMLTabsStyle = DISPLAY_BLOCK;
export const UHTMLTabPanelStyle = DISPLAY_BLOCK;
export const UHTMLTabStyle = ""; // Kept for backwards compatibility
export const UHTMLTabListStyle = `${DISPLAY_BLOCK}
::slotted([role="tab"]:not([hidden])) { display: inline-block; cursor: pointer }
::slotted([role="tab"][${ARIA_DISABLED}="true"]) { cursor: default }`;

export const UHTMLTabsShadowRoot = declarativeShadowRoot(UHTMLTabsStyle);
export const UHTMLTabListShadowRoot = declarativeShadowRoot(UHTMLTabListStyle);
export const UHTMLTabShadowRoot = ""; // Kept for backwards compatibility
export const UHTMLTabPanelShadowRoot =
	declarativeShadowRoot(UHTMLTabPanelStyle);

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
		return this.querySelector(
			'[role="tablist"]:not(:scope [role="tabpanel"] [role="tablist"])',
		);
	}
	get selectedIndex(): number {
		const tabs = [...this.tabs];
		return tabs.indexOf(getSelected(tabs) as Element);
	}
	set selectedIndex(index: number) {
		setSelected(this.tabs[index]);
	}
	get tabs(): NodeListOf<Element> {
		return this.querySelectorAll(
			'[role="tab"]:not(:scope [role="tabpanel"] [role="tab"])',
		);
	}
	get panels(): NodeListOf<UHTMLTabPanelElement> {
		return this.querySelectorAll(
			`[role="tabpanel"]:not(:scope [role="tabpanel"] [role="tabpanel"])`,
		);
	}
}

/**
 * The `<u-tablist>` HTML element serves as the container for a set of `<u-tab>` elements. The `<u-tab>` content are referred to as `<u-tabpanel>` elements.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tablist_role)
 */
export class UHTMLTabListElement extends UHTMLElement {
	_umutate?: ReturnType<typeof onMutation>; // Using underscore instead of private fields for backwards compatibility

	constructor() {
		super();
		attachStyle(this, UHTMLTabListStyle);
	}
	connectedCallback() {
		attr(this, "role", "tablist");
		on(this, "click keydown", this); // Listen for tab events on tablist to minimize amount of listeners
		this._umutate = onMutation(this, onMutations, {
			attributeFilter: ["id", "role", ARIA_CONTROLS, ARIA_SELECTED], // Needed if role="tab|tabpanel" and not u-tab|u-tabpanel is used
			attributes: true,
			childList: true,
			subtree: true, // Needed to catch changes of attributes in children
		});
	}
	disconnectedCallback() {
		off(this, "click keydown", this);
		this._umutate?.();
		this._umutate = undefined;
	}
	handleEvent(event: Partial<KeyboardEvent>) {
		const { key, type, target } = event;
		const tabs = getTabs(this);
		const prev = tabs.findIndex((tab) => tab.contains(target as Node));
		const isKeyClick = key === " " || key === "Enter";
		let next = prev;

		if (event.defaultPrevented || prev === -1) return; // Event prevented or not a tab
		if (type === "click") setSelected(tabs[prev]);
		if (type === "keydown") {
			if (isKeyClick) {
				event.preventDefault?.(); // Prevent scroll
				const click = { bubbles: true, cancelable: true, composed: true }; // Forward to real click
				return tabs[prev].dispatchEvent(new MouseEvent("click", click)); // Using .dispatchEvent, not .click if tab is not HTMLElement (i.e. SVG)
			}
			if (key === "ArrowDown" || key === "ArrowRight")
				next = (prev + 1) % tabs.length;
			else if (key === "ArrowUp" || key === "ArrowLeft")
				next = (prev || tabs.length) - 1;
			else if (key === "End") next = tabs.length - 1;
			else if (key === "Home") next = 0;
			else if (key === "Tab" && !isSelected(tabs[prev])) {
				const selected = getSelected(tabs);
				if (selected) attr(selected, TABINDEX, "-1"); // Prevent Tab-key moving to the selected tab
				return selected && setTimeout(() => attr(selected, TABINDEX, "0")); // Restore tabindex after focus has moved to allow tabbing back to selected tab
			} else return; // Do not hijack other keys

			event.preventDefault?.(); // Prevent scroll
			(tabs[next] as HTMLElement).focus?.();
		}
	}
	get tabsElement(): HTMLElement | null {
		return getTabsElement(this);
	}
	get tabs(): NodeListOf<Element> {
		return this.querySelectorAll(':scope > [role="tab"]'); // Using querySelectorAll for backwards compatibility
	}
	get selectedIndex(): number {
		const tabs = getTabs(this);
		return tabs.indexOf(getSelected(tabs) as Element);
	}
	set selectedIndex(index: number) {
		setSelected(this.tabs[index]);
	}
}

/**
 * The `<u-tab>` HTML element is an interactive element inside a `<u-tablist>` that, when activated, displays its associated `<u-tabpanel>`.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tab_role)
 */
let SKIP_TAB_ATTR_CHANGE_CALLBACK = false;
export class UHTMLTabElement extends UHTMLElement {
	static get observedAttributes() {
		return ["id", ARIA_SELECTED, ARIA_CONTROLS]; // Using ES2015 syntax for backwards compatibility
	}
	connectedCallback() {
		attr(this, "role", "tab");
		attr(this, ARIA_SELECTED, `${this.selected}`); // Setup attributes on connectedCallback since initial onMutation has already run
		attr(this, TABINDEX, this.selected ? "0" : "-1");
		if (!getSelected(this.parentElement?.children)) setSelected(this); // Ensure at least one tab is selected
	}
	attributeChangedCallback() {
		if (!SKIP_TAB_ATTR_CHANGE_CALLBACK && this.selected) setSelected(this);
	}
	get tabsElement(): UHTMLTabsElement | null {
		return getTabsElement(this);
	}
	get tabList(): UHTMLTabListElement | null {
		const list = this.parentElement;
		return list instanceof UHTMLTabListElement ? list : null;
	}
	get selected(): boolean {
		return isSelected(this);
	}
	set selected(value: boolean) {
		if (value) setSelected(this);
	}
	/** Retrieves the ordinal position of an tab in a tablist. */
	get index(): number {
		return Math.max(getTabs(this.parentElement).indexOf(this), 0); // Fallback to 0 complies with HTMLOptionElement specification
	}
	get panel(): UHTMLTabPanelElement | null {
		const panels = getTabsElement(this)?.panels;
		const index = getTabs(this.parentElement).indexOf(this);
		return getPanel(this, panels?.[index]);
	}
}

/**
 * The `<u-tabpanel>` HTML element is a container for the resources of layered content associated with a `<u-tab>`.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tabpanel_role)
 */
export class UHTMLTabPanelElement extends UHTMLElement {
	constructor() {
		super();
		attachStyle(this, UHTMLTabPanelStyle);
	}
	connectedCallback() {
		SKIP_TAB_ATTR_CHANGE_CALLBACK = true;
		attr(this, "role", "tabpanel"); // Must register role before checking hidden state
		const root = getTabsElement(this);
		let tab = root?.tabs[[...root.panels].indexOf(this)];
		const panel = tab && getPanel(tab, this); // Try finding associated panel based on index, respecting existing aria-controls
		if (panel !== this) tab = getSelected(this.tabs) || this.tabs[0]; // Fallback to search for elements with aria-controls matching panel id
		syncPanel(this, tab, !!tab && isSelected(tab)); // Sync panel with tab to set initial visibility
		(tab?.parentElement as UHTMLTabListElement)?._umutate?.takeRecords(); // Prevent infinite mutation loop that can be caused syncPanel
		SKIP_TAB_ATTR_CHANGE_CALLBACK = false;
	}
	get tabsElement(): UHTMLTabsElement | null {
		return getTabsElement(this);
	}
	get tabs(): NodeListOf<Element> {
		return getRoot(this).querySelectorAll(`[${ARIA_CONTROLS}="${this.id}"]`);
	}
}

const onMutations = (self: Element, records: MutationRecord[] = []) => {
	let selected: Element | undefined;
	for (const { target: el } of records) {
		const tab = el instanceof Element && attr(el, "role") === "tab";
		if (tab && isSelected(el)) selected = el; // Pluck the newly selected tab from mutations
	}
	if (!selected && !getSelected(self.children))
		selected = getSelected(getTabs(self).filter(isEnabled)); // Fallback to first enabled tab if no selected element exists
	setSelected(selected);
};
const syncPanel = (panel: Element, tab?: Element, show = false) => {
	attr(panel, "aria-hidden", `${!show}`); // Safari 18.6 has a bug where hidden alone is not enough to prevent screen readers focus
	attr(panel, "hidden", show ? null : "");
	attr(panel, TABINDEX, show ? "0" : null);
	if (tab) attr(tab, ARIA_CONTROLS, useId(panel));
	if (tab && show && isSelected(tab)) attr(panel, SAFE_LABELLEDBY, useId(tab));
};

const isEnabled = (el: Element) => attr(el, ARIA_DISABLED) !== "true";
const isSelected = (el: Element) => attr(el, ARIA_SELECTED) === "true";
const getSelected = (elems: Iterable<Element> = []) => {
	for (const el of elems) if (isSelected(el)) return el;
};

const getTabs = (tablist?: Element | null): Element[] => {
	const tabs = [];
	for (const el of tablist?.children || [])
		if (el.getAttribute("role") === "tab") tabs.push(el);
	return tabs;
};

const getPanel = (tab: Element, panel: Element | null = null) => {
	const id = attr(tab, ARIA_CONTROLS);
	const el = id ? getRoot(tab).getElementById(id) : panel;
	return el as UHTMLTabPanelElement | null;
};

const getTabsElement = (self: Node | null): UHTMLTabsElement | null => {
	for (let el = self; el; el = el.parentNode || (el as ShadowRoot).host)
		if (el instanceof UHTMLTabsElement) return el;
	return null;
};

const setSelected = (selected?: Element | null) => {
	if (!selected || !isEnabled(selected)) return;
	SKIP_TAB_ATTR_CHANGE_CALLBACK = true;
	const tabs = getTabs(selected.parentElement);
	const panels = getTabsElement(selected)?.panels || [];
	const nextPanel = getPanel(selected, panels?.[tabs.indexOf(selected)]);

	let idx = 0;
	for (const tab of tabs) {
		const panel = getPanel(tab, panels?.[idx++]);
		attr(tab, ARIA_SELECTED, `${tab === selected}`);
		attr(tab, TABINDEX, tab === selected ? "0" : "-1");
		if (panel) syncPanel(panel, tab, panel === nextPanel);
	}
	(selected.parentElement as UHTMLTabListElement)?._umutate?.takeRecords(); // Prevent infinite mutation loop that would be caused by updating aria-selected
	SKIP_TAB_ATTR_CHANGE_CALLBACK = false;
};

customElements.define("u-tabs", UHTMLTabsElement);
customElements.define("u-tablist", UHTMLTabListElement);
customElements.define("u-tab", UHTMLTabElement);
customElements.define("u-tabpanel", UHTMLTabPanelElement);
