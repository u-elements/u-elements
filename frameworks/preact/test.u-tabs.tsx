// Preact harness page for the shared u-tabs suite (packages/u-tabs/u-tabs.suite.ts).
// Tabs and panels are rendered from keyed state, aria-selected is rendered from state in controlled mode,
// and click is bound with onClick, which Preact attaches directly to the element
import "../../packages/u-tabs/u-tabs";
import {
	DEFAULTS,
	type HarnessConfig,
	handleClick,
	panelAttrs,
	tabAttrs,
	tabsProps,
	visiblePanels,
} from "../../packages/u-tabs/u-tabs.harness";
import { customElement, type HarnessProps, mountHarness } from "./harness";

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

function Tabs({ cfg, patch }: HarnessProps<HarnessConfig>) {
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
							{...tabAttrs(tab, cfg)}
							onClick={(event: Event) =>
								handleClick(event, tab, cfg, (selected) => patch({ selected }))
							}
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
}

mountHarness(DEFAULTS, Tabs);
