<svelte:options runes={true} />
<!-- Runes mode, as the component itself uses no rune and would otherwise compile in legacy mode, where every state write re-renders the whole block -->
<script lang="ts">
// Svelte harness page for the shared u-datalist suite (packages/u-datalist/u-datalist.suite.ts).
// Options are rendered from keyed $state, the input uses bind:value, and input is bound with oninput
import "../../packages/u-datalist/u-datalist";
import { log } from "../../packages/harness";
import {
	DEFAULTS,
	datalistAttrs,
	inputIds,
	listAttr,
	optionAttrs,
} from "../../packages/u-datalist/u-datalist.harness";
import { harnessState } from "./harness.svelte";

const harness = harnessState(DEFAULTS);
</script>

{#each harness.cfgs as cfg, index (index)}
	{#if cfg.mounted}
		{#each inputIds(cfg) as id, i (id)}
			<label for={id}>Label {id}</label>
			{#if i === 0}
				{#key cfg.inputKey}
					<input
						{id}
						list={listAttr(cfg)}
						readonly={cfg.inputAttrs.readonly !== undefined}
						disabled={cfg.inputAttrs.disabled !== undefined}
						bind:value={cfg.value}
						oninput={(event: Event) => log("input", event)}
					/>
				{/key}
			{:else}
				<input
					{id}
					list={listAttr(cfg)}
					readonly={cfg.inputAttrs.readonly !== undefined}
					disabled={cfg.inputAttrs.disabled !== undefined}
				/>
			{/if}
		{/each}
		{#if cfg.options}
			<u-datalist {...datalistAttrs(cfg)}>
				{#each cfg.options as option (option.key)}
					<u-option {...optionAttrs(option)}>{option.text}</u-option>
				{/each}
			</u-datalist>
		{/if}
		{#if cfg.options2}
			<u-datalist {...datalistAttrs(cfg, `${cfg.listId}-2`)}>
				{#each cfg.options2 as option (option.key)}
					<u-option {...optionAttrs(option)}>{option.text}</u-option>
				{/each}
			</u-datalist>
		{/if}
	{/if}
{/each}
