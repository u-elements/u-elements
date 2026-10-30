/**
 * Harness config for the u-tabs framework test pages (frameworks/<name>/test.html?component=u-tabs).
 *
 * Each framework page renders <u-tabs> from a HarnessConfig using its own idioms (tabs and panels
 * keyed from state, aria-selected bound from state in controlled mode, framework click handlers),
 * see packages/harness.ts for the window.harness contract the shared suite (u-tabs.suite.ts) drives.
 *
 * Top level must stay free of DOM access, as the suite imports the presets in Node.
 */

import { defined, log } from "../harness";

export type Tab = {
	key: string;
	label: string;
	disabled?: boolean;
	controls?: string; // Key of the panel the tab controls when ids are rendered, defaults to the tab key
};
export type Panel = { key: string; text: string };

export type HarnessConfig = {
	tabs: Tab[];
	panels: Panel[];
	ids: boolean; // Render id="tab-<key>" and id="panel-<key>" with aria-controls on the tabs. Off: index based association with component generated ids
	controlled: boolean; // aria-selected is rendered from `selected`, and the click handler writes state
	selected: string | null; // Key of the selected tab in controlled mode
	selectedIndex: number | null; // Written to the selectedIndex property of <u-tabs> when set
	onlySelectedPanel: boolean; // Render only the panel of the selected tab, as consumers often do
	panelsOutside: boolean; // Render the panels after </u-tabs>
	nested: boolean; // Render a nested <u-tabs> inside the first panel
	preventClick: boolean; // The click handler calls preventDefault
	rewrite: number; // Bump to re-render with unchanged values
	attrs: Record<string, string>; // Extra attributes on <u-tabs>
	mounted: boolean;
};
export type HarnessPatch = Partial<HarnessConfig>;

export const TABS: Tab[] = [
	{ key: "a", label: "Tab A" },
	{ key: "b", label: "Tab B" },
	{ key: "c", label: "Tab C" },
];

export const PANELS: Panel[] = [
	{ key: "a", text: "Panel A" },
	{ key: "b", text: "Panel B" },
	{ key: "c", text: "Panel C" },
];

export const DEFAULTS: HarnessConfig = {
	tabs: TABS,
	panels: PANELS,
	ids: false,
	controlled: false,
	selected: null,
	selectedIndex: null,
	onlySelectedPanel: false,
	panelsOutside: false,
	nested: false,
	preventClick: false,
	rewrite: 0,
	attrs: {},
	mounted: false,
};

export const tabId = (tab: Tab) => `tab-${tab.key}`;
export const panelId = (key: string) => `panel-${key}`;

export type TabAttrs = {
	id?: string;
	"aria-controls"?: string;
	"aria-disabled"?: "true";
	"aria-selected"?: "true" | "false";
};

// Attributes for <u-tab>. aria-selected is only rendered in controlled mode, as strings so every framework writes the attribute
export const tabAttrs = (tab: Tab, cfg: HarnessConfig) =>
	defined<TabAttrs>({
		id: cfg.ids ? tabId(tab) : undefined,
		"aria-controls": cfg.ids ? panelId(tab.controls ?? tab.key) : undefined,
		"aria-disabled": tab.disabled ? "true" : undefined,
		"aria-selected": cfg.controlled ? `${cfg.selected === tab.key}` : undefined,
	});

export const panelAttrs = (panel: Panel, cfg: HarnessConfig) =>
	defined({ id: cfg.ids ? panelId(panel.key) : undefined });

// Properties for <u-tabs>, only present when set so frameworks do not write null (i.e. Vue writes 0 for a null number property)
export const tabsProps = (cfg: HarnessConfig) =>
	defined({ selectedIndex: cfg.selectedIndex ?? undefined });

// Panels to render: all, or only the selected one
export const visiblePanels = (cfg: HarnessConfig) =>
	cfg.panels.filter(
		(panel) => !cfg.onlySelectedPanel || panel.key === cfg.selected,
	);

export const handleClick = (
	event: Event,
	tab: Tab,
	cfg: HarnessConfig,
	setSelected: (key: string) => void,
) => {
	log("click", event);
	if (cfg.preventClick) event.preventDefault();
	if (cfg.controlled) setSelected(tab.key);
};
