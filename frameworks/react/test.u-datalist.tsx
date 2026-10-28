// React harness page for the shared u-datalist suite (packages/u-datalist/u-datalist.suite.ts).
// Options are rendered from keyed state, the input is a controlled input,
// and input is bound with onChange, which React dispatches for native input events
import { Fragment } from "react";
import "../../packages/u-datalist/u-datalist";
import { log } from "../../packages/harness";
import {
	DEFAULTS,
	datalistAttrs,
	type HarnessConfig,
	inputIds,
	listAttr,
	type Option,
	optionAttrs,
} from "../../packages/u-datalist/u-datalist.harness";
import { customElement, type HarnessProps, mountHarness } from "./harness";

const UDatalist = customElement("u-datalist");
const UOption = customElement("u-option");

function Datalist({ cfg, patch }: HarnessProps<HarnessConfig>) {
	if (!cfg.mounted) return null;
	const list = (id: string, options: Option[]) => (
		<UDatalist {...datalistAttrs(cfg, id)}>
			{options.map((option) => (
				<UOption key={option.key} {...optionAttrs(option)}>
					{option.text}
				</UOption>
			))}
		</UDatalist>
	);

	return (
		<>
			{inputIds(cfg).map((id, index) => (
				<Fragment key={id}>
					<label htmlFor={id}>Label {id}</label>
					<input
						key={cfg.inputKey}
						id={id}
						list={listAttr(cfg)}
						readOnly={cfg.inputAttrs.readonly !== undefined}
						disabled={cfg.inputAttrs.disabled !== undefined}
						value={index ? undefined : cfg.value}
						onChange={
							index
								? undefined
								: (event) => {
										log("input", event.nativeEvent);
										patch({ value: event.currentTarget.value });
									}
						}
					/>
				</Fragment>
			))}
			{cfg.options && list(cfg.listId, cfg.options)}
			{cfg.options2 && list(`${cfg.listId}-2`, cfg.options2)}
		</>
	);
}

mountHarness(DEFAULTS, Datalist);
