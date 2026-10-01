<script lang="ts">
// Svelte harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Items are rendered from $state (controlled), the input uses bind:value,
// and all combobox events are bound with Svelte event attributes.
import { flushSync } from "svelte";
import "../../packages/u-datalist/u-datalist";
import "../../packages/u-combobox/u-combobox";
import {
	comboboxAttrs,
	createHarness,
	type HarnessConfig,
	handleBeforeSelect,
	handleInput,
	handleSubmit,
	listId,
	log,
	optionAttrs,
	optionKey,
	optionTag,
} from "../../packages/u-combobox/u-combobox.harness";

let cfgs = $state<HarnessConfig[]>([]);

createHarness({
	render: (next) => {
		cfgs = next;
		flushSync();
	},
	update: (patch, index) => {
		Object.assign(cfgs[index], patch);
		flushSync();
	},
});
</script>

{#each cfgs as cfg, index (index)}
	{#if cfg.mounted}
		{#if cfg.label}<label for={cfg.id}>Label</label>{/if}
		{#if cfg.form === "outside"}
			<form id="form" onsubmit={handleSubmit}>
				<input id="other" name="other" value="keep" />
				<button type="submit">Send</button>
			</form>
		{/if}
		<svelte:element
			this={cfg.form === true ? "form" : "div"}
			id={cfg.form === true ? "form" : undefined}
			onsubmit={handleSubmit}
		>
			<u-combobox
				{...comboboxAttrs(cfg)}
				oncomboboxbeforeselect={(event: Event) => handleBeforeSelect(event, cfg, (items) => (cfg.items = items))}
				oncomboboxafterselect={(event: Event) => log("comboboxafterselect", event)}
				oncomboboxbeforematch={(event: Event) => log("comboboxbeforematch", event)}
				oncomboboxprogrammaticinput={(event: Event) => log("comboboxprogrammaticinput", event)}
				oninput={(event: Event) => handleInput(event, cfg, (options) => (cfg.options = options))}
				onchange={(event: Event) => log("change", event)}
			>
				{#if cfg.select}<select name={cfg.select} hidden></select>{/if}
				{#each cfg.items as item (item.value)}
					<data value={item.value}>{item.label}</data>
				{/each}
				<!-- bind:value requires a static type, so email is a separate input -->
				{#if cfg.inputAttrs.type === "email"}
					<input
						type="email"
						id={cfg.id}
						list={listId(cfg)}
						form={cfg.form === "outside" ? "form" : undefined}
						readonly={cfg.inputAttrs.readonly !== undefined}
						disabled={cfg.inputAttrs.disabled !== undefined}
						bind:value={cfg.value}
					/>
				{:else}
					<input
						type="text"
						id={cfg.id}
						list={listId(cfg)}
						form={cfg.form === "outside" ? "form" : undefined}
						readonly={cfg.inputAttrs.readonly !== undefined}
						disabled={cfg.inputAttrs.disabled !== undefined}
						bind:value={cfg.value}
					/>
				{/if}
				{#if cfg.toggle}<button type="button" aria-expanded="false">Toggle</button>{/if}
				{#if cfg.clear === "del"}<del></del>{:else if cfg.clear}<button type="reset">Clear</button>{/if}
				{#if cfg.options}
					{#key cfg.listKey}
						<svelte:element
							this={cfg.listTag}
							id={listId(cfg)}
							data-nofilter={cfg.nofilter ? "" : undefined}
						>
							{#each cfg.options as option (optionKey(option))}
								<svelte:element this={optionTag(cfg)} {...optionAttrs(option)}>{option.text}</svelte:element>
							{/each}
						</svelte:element>
					{/key}
				{/if}
			</u-combobox>
			{#if cfg.form === true}
				<input id="other" name="other" value="keep" />
				<button type="submit">Send</button>
			{/if}
		</svelte:element>
	{/if}
{/each}
