<svelte:options runes={true} />
<!-- Runes mode, as the component itself uses no rune and would otherwise compile in legacy mode, where every state write re-renders the whole block -->
<script lang="ts">
// Svelte harness page for the shared u-progress suite (packages/u-progress/u-progress.suite.ts).
// value and max are bound as props, which Svelte writes as properties on the custom element
import "../../packages/u-progress/u-progress";
import {
	DEFAULTS,
	labelId,
	progressAttrs,
} from "../../packages/u-progress/u-progress.harness";
import { harnessState } from "./harness.svelte";

const harness = harnessState(DEFAULTS);
</script>

{#snippet progress(cfg: typeof DEFAULTS)}
	<u-progress {...progressAttrs(cfg)} value={cfg.value} max={cfg.max} hidden={cfg.hidden}></u-progress>
{/snippet}

{#each harness.cfgs as cfg, index (index)}
	{#if cfg.mounted}
		{#if cfg.label === "for"}<label for={cfg.id}>{cfg.text}</label>{/if}
		{#if cfg.label === "aria-labelledby"}<span id={labelId(cfg)}>{cfg.text}</span>{/if}
		{#if cfg.label === "wrap"}
			<label>{cfg.text} {@render progress(cfg)}</label>
		{:else}
			{@render progress(cfg)}
		{/if}
	{/if}
{/each}
