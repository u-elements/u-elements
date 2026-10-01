// React harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Items are rendered from state (controlled), the input value is a controlled input,
// and all combobox events are bound with React 19 custom element event props.
import { StrictMode, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "../../packages/u-datalist/u-datalist";
import "../../packages/u-combobox/u-combobox";
import {
	comboboxAttrs,
	createHarness,
	type HarnessConfig,
	type HarnessPatch,
	handleBeforeSelect,
	handleInput,
	handleSubmit,
	listId,
	log,
	optionAttrs,
	optionKey,
	optionTag,
} from "../../packages/u-combobox/u-combobox.harness";

type CustomElementProps = React.HTMLAttributes<HTMLElement> &
	Record<string, unknown>;

// Typed as a component to allow custom event props, React still renders the string as a custom element
const UCombobox =
	"u-combobox" as unknown as React.ComponentType<CustomElementProps>;

const onSubmit = (event: React.SubmitEvent<Element>) =>
	handleSubmit(event.nativeEvent);

let setConfigs: (cfgs: HarnessConfig[]) => void = () => {};
let patchConfig: (patch: HarnessPatch, index: number) => void = () => {};

const FormFields = () => (
	<>
		<input id="other" name="other" defaultValue="keep" />
		<button type="submit">Send</button>
	</>
);

function Combobox({
	cfg,
	patch,
}: {
	cfg: HarnessConfig;
	patch: (patch: HarnessPatch) => void;
}) {
	if (!cfg.mounted) return null;
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
						handleBeforeSelect(event, cfg, (items) => patch({ items }))
					}
					oncomboboxafterselect={(event: Event) =>
						log("comboboxafterselect", event)
					}
					oncomboboxbeforematch={(event: Event) =>
						log("comboboxbeforematch", event)
					}
					oncomboboxprogrammaticinput={(event: Event) =>
						log("comboboxprogrammaticinput", event)
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
					{cfg.clear === "del" ? (
						<del />
					) : (
						cfg.clear && <button type="reset">Clear</button>
					)}
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

function App() {
	const [cfgs, setCfgs] = useState<HarnessConfig[]>([]);
	setConfigs = setCfgs;
	patchConfig = (patch, index) =>
		setCfgs((prev) =>
			prev.map((cfg, i) => (i === index ? { ...cfg, ...patch } : cfg)),
		);

	return cfgs.map((cfg, index) => (
		<Combobox
			// biome-ignore lint/suspicious/noArrayIndexKey: Instances are positional
			key={index}
			cfg={cfg}
			patch={(patch) => patchConfig(patch, index)}
		/>
	));
}

const root = createRoot(document.getElementById("root") as HTMLElement);
flushSync(() =>
	root.render(
		<StrictMode>
			<App />
		</StrictMode>,
	),
);

createHarness({
	render: (cfgs) => flushSync(() => setConfigs(cfgs)),
	update: (patch, index) => flushSync(() => patchConfig(patch, index)),
});
