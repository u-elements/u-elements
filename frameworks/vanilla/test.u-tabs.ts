// Vanilla harness page for the shared u-tabs suite (packages/u-tabs/u-tabs.suite.ts),
// see ./harness.ts for how the DOM is patched in place like a framework would.
import "../../packages/u-tabs/u-tabs";
import {
	DEFAULTS,
	type HarnessConfig,
	handleClick,
	panelAttrs,
	type Tab,
	tabAttrs,
	visiblePanels,
} from "../../packages/u-tabs/u-tabs.harness";
import {
	create,
	type Instance,
	mountHarness,
	reconcile,
	setAttr,
} from "./harness";

type State = {
	tabs: HTMLElement | null;
	tablist: HTMLElement | null;
	patch: (patch: Partial<HarnessConfig>) => void;
};
type Inst = Instance<HarnessConfig, State>;

const keys = new WeakMap<Element, string>();

const nested = () => {
	const tabs = create("u-tabs");
	const tablist = create("u-tablist");
	tablist.append(
		create("u-tab", {}, "Nested 1"),
		create("u-tab", {}, "Nested 2"),
	);
	tabs.append(
		tablist,
		create("u-tabpanel", {}, "Nested panel 1"),
		create("u-tabpanel", {}, "Nested panel 2"),
	);
	return tabs;
};

const syncTabs = (inst: Inst) => {
	const { cfg, tablist } = inst;
	if (!tablist) return;
	const existing = new Map(
		[...tablist.children].map((el) => [keys.get(el) || "", el]),
	);
	reconcile(
		tablist,
		existing,
		cfg.tabs,
		(tab) => tab.key,
		(tab, el) => {
			const tabEl = el || create("u-tab");
			if (!el) {
				keys.set(tabEl, tab.key);
				tabEl.addEventListener("click", (event) =>
					handleClick(
						event,
						inst.cfg.tabs.find((t) => t.key === tab.key) as Tab,
						inst.cfg,
						(selected) => inst.patch({ selected }),
					),
				);
			}
			const attrs = tabAttrs(tab, cfg);
			setAttr(tabEl, "id", attrs.id);
			setAttr(tabEl, "aria-controls", attrs["aria-controls"] ?? null);
			setAttr(tabEl, "aria-disabled", attrs["aria-disabled"] ?? null);
			setAttr(tabEl, "aria-selected", attrs["aria-selected"]); // Left alone when uncontrolled, like a framework that never renders it
			if (tabEl.textContent !== tab.label) tabEl.textContent = tab.label;
			return tabEl;
		},
	);
};

const syncPanels = (inst: Inst) => {
	const { cfg, tabs, tablist } = inst;
	if (!tabs || !tablist) return;
	const parent = cfg.panelsOutside ? (tabs.parentElement as Element) : tabs;
	const existing = new Map(
		[...parent.querySelectorAll(":scope > u-tabpanel")].map((el) => [
			keys.get(el) || "",
			el,
		]),
	);
	reconcile(
		parent,
		existing,
		visiblePanels(cfg),
		(panel) => panel.key,
		(panel, el) => {
			const panelEl = el || create("u-tabpanel");
			if (!el) {
				keys.set(panelEl, panel.key);
				panelEl.append(panel.text);
				if (cfg.nested && panel.key === cfg.panels[0].key)
					panelEl.append(nested());
			}
			setAttr(panelEl, "id", panelAttrs(panel, cfg).id);
			return panelEl;
		},
	);
};

const syncProps = ({ cfg, tabs }: Inst) => {
	if (!tabs) return;
	for (const [name, value] of Object.entries(cfg.attrs))
		setAttr(tabs, name, value);
	setAttr(tabs, "data-rewrite", `${cfg.rewrite}`);
	if (cfg.selectedIndex !== null)
		(tabs as HTMLElement & { selectedIndex: number }).selectedIndex =
			cfg.selectedIndex;
};

mountHarness<HarnessConfig, State>(DEFAULTS, {
	structural: ["nested", "panelsOutside"],
	init: () => ({ tabs: null, tablist: null, patch: () => {} }),
	unmount: (inst) => {
		inst.tabs = inst.tablist = null;
	},
	mount: (inst, patch) => {
		const tabs = create("u-tabs");
		const tablist = create("u-tablist");
		tabs.append(tablist);
		inst.tabs = tabs;
		inst.tablist = tablist;
		inst.patch = patch;
		syncTabs(inst);
		if (!inst.cfg.panelsOutside) syncPanels(inst);
		syncProps(inst);
		if (!inst.cfg.panelsOutside) return [tabs];
		const wrapper = create("div");
		wrapper.append(tabs);
		inst.tabs = tabs;
		syncPanels(inst); // Panels are placed after <u-tabs> inside the wrapper
		return [wrapper];
	},
	update: (inst, patch) => {
		const has = (...keys: string[]) => keys.some((key) => key in patch);
		if (has("tabs", "ids", "controlled", "selected", "rewrite")) syncTabs(inst);
		if (has("panels", "ids", "selected", "onlySelectedPanel", "rewrite"))
			syncPanels(inst);
		if (has("attrs", "selectedIndex", "rewrite")) syncProps(inst);
	},
});
