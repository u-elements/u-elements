<svelte:options runes={true} />
<!-- Runes mode, as the component itself uses no rune and would otherwise compile in legacy mode, where every state write re-renders the whole block -->
<script lang="ts">
// Svelte harness page for the shared u-tabs suite (packages/u-tabs/u-tabs.suite.ts).
// Tabs and panels are rendered from keyed $state, aria-selected is rendered from state in controlled mode,
// and click is bound with onclick, which Svelte delegates to its root
import "../../packages/u-tabs/u-tabs";
import {
	DEFAULTS,
	handleClick,
	panelAttrs,
	tabAttrs,
	visiblePanels,
} from "../../packages/u-tabs/u-tabs.harness";
import { harnessState } from "./harness.svelte";

const harness = harnessState(DEFAULTS);
</script>

{#snippet panels(cfg: typeof DEFAULTS)}
	{#each visiblePanels(cfg) as panel (panel.key)}
		<u-tabpanel {...panelAttrs(panel, cfg)}>
			{panel.text}
			{#if cfg.nested && panel.key === cfg.panels[0].key}
				<u-tabs>
					<u-tablist>
						<u-tab>Nested 1</u-tab>
						<u-tab>Nested 2</u-tab>
					</u-tablist>
					<u-tabpanel>Nested panel 1</u-tabpanel>
					<u-tabpanel>Nested panel 2</u-tabpanel>
				</u-tabs>
			{/if}
		</u-tabpanel>
	{/each}
{/snippet}

{#each harness.cfgs as cfg, index (index)}
	{#if cfg.mounted}
		<!-- No spread on the element, as Svelte then lowercases every attribute name and selectedIndex would not reach the property -->
		<u-tabs selectedIndex={cfg.selectedIndex ?? undefined} data-rewrite={cfg.rewrite}>
			<u-tablist>
				{#each cfg.tabs as tab (tab.key)}
					<u-tab
						{...tabAttrs(tab, cfg)}
						onclick={(event: Event) => handleClick(event, tab, cfg, (selected) => (cfg.selected = selected))}
					>{tab.label}</u-tab>
				{/each}
			</u-tablist>
			{#if !cfg.panelsOutside}{@render panels(cfg)}{/if}
		</u-tabs>
		{#if cfg.panelsOutside}{@render panels(cfg)}{/if}
	{/if}
{/each}
