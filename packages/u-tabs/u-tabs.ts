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
const SELECTOR_SELECTED = `:scope > [${ARIA_SELECTED}="true"]`;
const TABINDEX = "tabindex";

/**
 * The `<u-tabs>` HTML element is used to group a `<u-tablist>` and several `<u-tabpanel>` elements.
 * No MDN reference available.
 */
export class UHTMLTabsElement extends UHTMLElement {
	_unmutate?: ReturnType<typeof onMutation>; // Using underscore instead of private fields for backwards compatibility

	constructor() {
		super();
		attachStyle(this, UHTMLTabsStyle);
	}
	connectedCallback() {
		this._unmutate = onMutation(this, onMutations, {
			childList: true,
			subtree: true,
		});
	}
	disconnectedCallback() {
		this._unmutate?.();
		this._unmutate = undefined;
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
	get tabs(): NodeListOf<Element> {
		return queryWithoutNested("tab", this);
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
	_unmutate?: ReturnType<typeof onMutation>; // Using underscore instead of private fields for backwards compatibility

	constructor() {
		super();
		attachStyle(this, UHTMLTabListStyle);
	}
	connectedCallback() {
		attr(this, "role", "tablist");
		on(this, "click keydown", this); // Listen for tab events on tablist to minimize amount of listeners
		this._unmutate = onMutation(this, onMutations, {
			attributeFilter: ["id", ARIA_CONTROLS, ARIA_SELECTED], // Need to listen for attributes here, so mutation run after all custom elements are connected
			attributes: true,
			childList: true,
			subtree: true, // Needed to catch changes of attributes in children
		});
	}
	disconnectedCallback() {
		off(this, "click keydown", this);
		this._unmutate?.();
		this._unmutate = undefined;
	}
	handleEvent(event: Partial<KeyboardEvent>) {
		const { key, type, target } = event;
		const tabs = [...this.tabs];
		const prev = tabs.findIndex((tab) => tab.contains(target as Node));
		let next = prev;

		if (event.defaultPrevented || prev === -1) return; // Event prevented or not a tab
		if (type === "click") setSelected(tabs[prev]);
		if (type === "keydown") {
			if (key === " " || key === "Enter") {
				event.preventDefault?.(); // Prevent scroll
				const click = { bubbles: true, cancelable: true, composed: true }; // Forward to real click
				return tabs[prev].dispatchEvent(new MouseEvent("click", click));
			}
			if (key === "ArrowDown" || key === "ArrowRight")
				next = (prev + 1) % tabs.length;
			else if (key === "ArrowUp" || key === "ArrowLeft")
				next = (prev || tabs.length) - 1;
			else if (key === "End") next = tabs.length - 1;
			else if (key === "Home") next = 0;
			else if (key === "Tab" && attr(tabs[prev], ARIA_SELECTED) !== "true") {
				const selected = tabs[getSelectedIndex(tabs)];
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
		return queryWithoutNested("tab", this); // Only direct children of tablist is valid tabs
	}
	get selectedIndex(): number {
		return getSelectedIndex(this.tabs);
	}
	set selectedIndex(index: number) {
		setSelected(this.tabs[index]);
	}
}

const onMutations = (
	self: UHTMLTabsElement | UHTMLTabListElement,
	records?: MutationRecord[],
) => {
	if (!records) return; // Skip initial callback since <u-tab> will always trigger ARIA_SELECTED
	const root = (self as UHTMLTabListElement).tabsElement || self;
	const tabs = [...queryWithoutNested("tab", root)];

	let nextTab: Element = tabs[getSelectedIndex(tabs)]; // Get existing selected tab before mutations
	for (const { target: el } of records) {
		const isTab = el instanceof Element && attr(el, "role") === "tab";
		if (isTab && attr(el, ARIA_SELECTED) === "true") nextTab = el; // Pluck the newly selected tab from mutations
	}

	const panels = queryWithoutNested("tabpanel", root);
	const nextPanel = nextTab && getPanel(nextTab, panels[tabs.indexOf(nextTab)]);
	if (nextPanel) attr(nextPanel, SAFE_LABELLEDBY, useId(nextTab));

	tabs.forEach((tab, index) => {
		const panel = getPanel(tab, panels[index]);
		const panelHidden = panel !== nextPanel;
		attr(tab, TABINDEX, tab === nextTab ? "0" : "-1");
		attr(tab, ARIA_SELECTED, `${tab === nextTab}`);
		if (panel?.id) attr(tab, ARIA_CONTROLS, panel.id); // Leave aria-controls intact if set manually
		if (panel) {
			attr(panel, "aria-hidden", `${panelHidden}`); // Safari 18.6 has a bug where hidden alone is not enough to prevent screen readers focus
			attr(panel, "hidden", panelHidden ? "" : null);
			attr(panel, TABINDEX, panelHidden ? null : "0");
		}
	});

	self._unmutate?.takeRecords(); // Prevent infinite loop that would be caused by updating aria-selected
};

/**
 * The `<u-tab>` HTML element is an interactive element inside a `<u-tablist>` that, when activated, displays its associated `<u-tabpanel>`.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tab_role)
 */
// Skip attributeChangedCallback caused by attributeChangedCallback
export class UHTMLTabElement extends UHTMLElement {
	constructor() {
		super();
		attachStyle(this, UHTMLTabStyle);
	}
	connectedCallback() {
		attr(this, "role", "tab");
		const { selected, tabList: list } = this;
		if (selected) this.setAttribute(ARIA_SELECTED, "true"); // Using setAttribute to intentionally trigger MutationObserver in <u-tablist>
		if (list?.tabs[0] === this && !list.querySelector(SELECTOR_SELECTED))
			this.selected = true; // Auto-select if first and tablist has no selected elements
	}
	get tabsElement(): UHTMLTabsElement | null {
		return getTabsElement(this.tabList); // Using tabList since getTabsElement uses assignedSlot.getRootNode().host to find UHTMLTabsElement
	}
	get tabList(): UHTMLTabListElement | null {
		const tablist = this.parentElement as UHTMLTabListElement | null;
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
		const tabs = this.tabList?.tabs;
		return tabs ? [...tabs].indexOf(this) : 0; // Fallback to 0 complies with HTMLOptionElement specification
	}
	get panel(): HTMLElement | null {
		return getPanel(this);
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
		attr(this, "role", "tabpanel");
		attr(this, "hidden", ""); // Hide panels by default to prevent flash of unstyled content and ensure proper setup when added to DOM before tabs
	}
	get tabsElement(): UHTMLTabsElement | null {
		return getTabsElement(this);
	}
	get tabs(): NodeListOf<Element> {
		return getRoot(this).querySelectorAll(`[${ARIA_CONTROLS}="${this.id}"]`);
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
const getPanel = (tab: Element, panel?: Element) => {
	const id = attr(tab, ARIA_CONTROLS) || useId(panel);
	return id ? getRoot(tab).getElementById(id) : null;
};

// Uses attributes to avoid dependence on tag names or CustomElement instance initialization
const getSelectedIndex = (tabs: Iterable<Element>) =>
	[...tabs].findIndex((tab) => attr(tab, ARIA_SELECTED) === "true");

const getTabsElement = (self: Element | null) => {
	const root = self?.assignedSlot?.getRootNode() as ShadowRoot | null;
	return root?.host instanceof UHTMLTabsElement ? root.host : null;
};

const setSelected = (tab?: Element | null) =>
	tab &&
	attr(tab, "aria-disabled") !== "true" &&
	attr(tab, "aria-selected", "true");

customElements.define("u-tabs", UHTMLTabsElement);
customElements.define("u-tablist", UHTMLTabListElement);
customElements.define("u-tab", UHTMLTabElement);
customElements.define("u-tabpanel", UHTMLTabPanelElement);
