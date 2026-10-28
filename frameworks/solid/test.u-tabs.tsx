// Solid harness page for the shared u-tabs suite (packages/u-tabs/u-tabs.suite.ts).
// Tabs and panels are rendered from a store keyed by their key, aria-selected is rendered from state in controlled mode,
// and click is bound with onClick, which Solid delegates to the document
import { For, Show } from "solid-js";
import "../../packages/u-tabs/u-tabs";
import {
	DEFAULTS,
	type HarnessConfig,
	handleClick,
	type Panel,
	panelAttrs,
	type Tab,
	tabAttrs,
	tabsProps,
	visiblePanels,
} from "../../packages/u-tabs/u-tabs.harness";
import {
	attrs,
	customElement,
	type HarnessProps,
	mountHarness,
	props as properties,
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

// <For> keys by identity, so iterate the keys to reuse elements across updates that carry new objects
const keys = (items: { key: string }[]) => items.map((item) => item.key);

function Tabs(props: HarnessProps<HarnessConfig>) {
	const tab = (key: string) =>
		props.cfg.tabs.find((tab) => tab.key === key) as Tab;
	const panel = (key: string) =>
		props.cfg.panels.find((panel) => panel.key === key) as Panel;

	const Panels = () => (
		<For each={keys(visiblePanels(props.cfg))}>
			{(key) => (
				<UTabpanel {...attrs(panelAttrs(panel(key), props.cfg))}>
					{panel(key).text}
					<Show when={props.cfg.nested && key === props.cfg.panels[0].key}>
						<Nested />
					</Show>
				</UTabpanel>
			)}
		</For>
	);

	return (
		<Show when={props.cfg.mounted}>
			<UTabs
				{...attrs(props.cfg.attrs)}
				{...properties(tabsProps(props.cfg))}
				attr:data-rewrite={props.cfg.rewrite}
			>
				<UTablist>
					<For each={keys(props.cfg.tabs)}>
						{(key) => (
							<UTab
								{...attrs(tabAttrs(tab(key), props.cfg))}
								onClick={(event: Event) =>
									handleClick(event, tab(key), props.cfg, (selected) =>
										props.patch({ selected }),
									)
								}
							>
								{tab(key).label}
							</UTab>
						)}
					</For>
				</UTablist>
				<Show when={!props.cfg.panelsOutside}>
					<Panels />
				</Show>
			</UTabs>
			<Show when={props.cfg.panelsOutside}>
				<Panels />
			</Show>
		</Show>
	);
}

mountHarness(DEFAULTS, Tabs);
