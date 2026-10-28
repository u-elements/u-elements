// Qwik harness page for the shared u-tabs suite (packages/u-tabs/u-tabs.suite.ts).
// Tabs and panels are rendered from a keyed store, aria-selected is rendered from state in controlled mode,
// and click is bound with onClick$, see ./harness.tsx for the dispatch order
import { $, component$ } from "@qwik.dev/core";
import "../../packages/u-tabs/u-tabs";
import {
	DEFAULTS,
	type HarnessConfig,
	handleClick,
	panelAttrs,
	type Tab,
	tabAttrs,
	tabsProps,
	visiblePanels,
} from "../../packages/u-tabs/u-tabs.harness";
import {
	customElement,
	type HarnessProps,
	mountHarness,
	resolve,
} from "./harness";

const UTabs = customElement("u-tabs");
const UTablist = customElement("u-tablist");
const UTab = customElement("u-tab");
const UTabpanel = customElement("u-tabpanel");

const Nested = () => (
	<UTabs>
		<UTablist>
			<UTab>Nested 1</UTab>
			<UTab>Nested 2</UTab>
		</UTablist>
		<UTabpanel>Nested panel 1</UTabpanel>
		<UTabpanel>Nested panel 2</UTabpanel>
	</UTabs>
);

const Tabs = component$(({ cfg }: HarnessProps<HarnessConfig>) => {
	const onClick = $((event: Event, el: HTMLElement) => {
		const tab = cfg.tabs.find((tab) => tab.key === el.dataset.key) as Tab;
		handleClick(event, tab, cfg, (selected) => {
			cfg.selected = selected;
		});
	});
	resolve(onClick);

	if (!cfg.mounted) return null;
	const panels = visiblePanels(cfg).map((panel) => (
		<UTabpanel key={panel.key} {...panelAttrs(panel, cfg)}>
			{panel.text}
			{cfg.nested && panel.key === cfg.panels[0].key && <Nested />}
		</UTabpanel>
	));

	return (
		<>
			<UTabs {...cfg.attrs} {...tabsProps(cfg)} data-rewrite={cfg.rewrite}>
				<UTablist>
					{cfg.tabs.map((tab) => (
						<UTab
							key={tab.key}
							data-key={tab.key}
							{...tabAttrs(tab, cfg)}
							onClick$={onClick}
						>
							{tab.label}
						</UTab>
					))}
				</UTablist>
				{!cfg.panelsOutside && panels}
			</UTabs>
			{cfg.panelsOutside && panels}
		</>
	);
});

mountHarness(DEFAULTS, Tabs);
