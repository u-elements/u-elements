// React harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Items are rendered from state (controlled), the input value is a controlled input,
// and all combobox events are bound with React 19 custom element event props.
import { startTransition } from "react";
import "../../packages/u-datalist/u-datalist";
import "../../packages/u-combobox/u-combobox";
import { log } from "../../packages/harness";
import {
	comboboxAttrs,
	DEFAULTS,
	type HarnessConfig,
	handleBeforeSelect,
	handleInput,
	handleSubmit,
	listId,
	optionAttrs,
	optionKey,
	optionTag,
} from "../../packages/u-combobox/u-combobox.harness";
import { customElement, type HarnessProps, mountHarness } from "./harness";

const UCombobox = customElement("u-combobox");

const onSubmit = (event: React.SubmitEvent<Element>) =>
	handleSubmit(event.nativeEvent);

const FormFields = () => (
	<>
		<input id="other" name="other" defaultValue="keep" />
		<button type="submit">Send</button>
	</>
);

function Combobox({ cfg, patch }: HarnessProps<HarnessConfig>) {
	if (!cfg.mounted) return null;
	if (cfg.renderCost) {
		const end = performance.now() + cfg.renderCost; // Simulate a slow render, longer than the scheduler's 5ms slice
		while (performance.now() < end);
	}
	const setItems = (items: HarnessConfig["items"]) =>
		cfg.transition
			? startTransition(() => patch({ items })) // Time sliced, so a slow render yields past the render opportunity
			: patch({ items });
	const ListTag = cfg.listTag as "datalist";
	const OptTag = optionTag(cfg) as "option";
	const Wrapper = cfg.form === true ? "form" : "div";
	const list = listId(cfg);

	return (
		<>
			{cfg.label && <label htmlFor={cfg.id}>Label</label>}
			{cfg.form === "outside" && (
				<form id="form" onSubmit={onSubmit}>
					<FormFields />
				</form>
			)}
			<Wrapper
				id={cfg.form === true ? "form" : undefined}
				onSubmit={cfg.form === true ? onSubmit : undefined}
			>
				<UCombobox
					{...comboboxAttrs(cfg)}
					oncomboboxbeforeselect={(event: Event) =>
						handleBeforeSelect(event, cfg, setItems)
					}
					oncomboboxafterselect={(event: Event) =>
						log("comboboxafterselect", event)
					}
					oncomboboxbeforematch={(event: Event) =>
						log("comboboxbeforematch", event)
					}
					oninput={(event: Event) =>
						handleInput(event, cfg, (options) => patch({ options }))
					}
					onchange={(event: Event) => log("change", event)}
				>
					{cfg.select && <select name={cfg.select} hidden />}
					{cfg.items.map((item) => (
						<data key={item.value} value={item.value}>
							{item.label}
						</data>
					))}
					<input
						id={cfg.id}
						list={list}
						form={cfg.form === "outside" ? "form" : undefined}
						type={cfg.inputAttrs.type}
						readOnly={cfg.inputAttrs.readonly !== undefined}
						disabled={cfg.inputAttrs.disabled !== undefined}
						value={cfg.value}
						onChange={(event) => patch({ value: event.currentTarget.value })}
					/>
					{cfg.toggle && (
						<button type="button" aria-expanded="false">
							Toggle
						</button>
					)}
					{cfg.clear && <button type="reset">Clear</button>}
					{cfg.options && (
						<ListTag
							key={cfg.listKey}
							id={list}
							data-nofilter={cfg.nofilter ? "" : undefined}
						>
							{cfg.options.map((option) => (
								<OptTag key={optionKey(option)} {...optionAttrs(option)}>
									{option.text}
								</OptTag>
							))}
						</ListTag>
					)}
				</UCombobox>
				{cfg.form === true && <FormFields />}
			</Wrapper>
		</>
	);
}

mountHarness(DEFAULTS, Combobox);
