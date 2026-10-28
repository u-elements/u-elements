// Solid harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Items are rendered from a store (controlled), the input value is bound to the store,
// and all combobox events are bound with Solid native event listeners (on:*).
import { For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
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
	optionTag,
} from "../../packages/u-combobox/u-combobox.harness";
import { attrs, type HarnessProps, mountHarness } from "./harness";

const FormFields = () => (
	<>
		<input id="other" name="other" value="keep" />
		<button type="submit">Send</button>
	</>
);

function Combobox(props: HarnessProps<HarnessConfig>) {
	const list = () => listId(props.cfg);

	return (
		<Show when={props.cfg.mounted}>
			<Show when={props.cfg.label}>
				<label for={props.cfg.id}>Label</label>
			</Show>
			<Show when={props.cfg.form === "outside"}>
				<form id="form" on:submit={handleSubmit}>
					<FormFields />
				</form>
			</Show>
			<Dynamic
				component={props.cfg.form === true ? "form" : "div"}
				id={props.cfg.form === true ? "form" : undefined}
				on:submit={handleSubmit}
			>
				<u-combobox
					{...attrs(comboboxAttrs(props.cfg))}
					on:comboboxbeforeselect={(event: CustomEvent<HTMLDataElement>) =>
						handleBeforeSelect(event, props.cfg, (items) =>
							props.patch({ items }),
						)
					}
					on:comboboxafterselect={(event: CustomEvent<HTMLDataElement>) =>
						log("comboboxafterselect", event)
					}
					on:comboboxbeforematch={(
						event: CustomEvent<HTMLOptionElement | undefined>,
					) => log("comboboxbeforematch", event)}
					on:input={(event: Event) =>
						handleInput(event, props.cfg, (options) => props.patch({ options }))
					}
					on:change={(event: Event) => log("change", event)}
				>
					<Show when={props.cfg.select}>
						<select name={props.cfg.select as string} hidden />
					</Show>
					<For each={props.cfg.items}>
						{(item) => <data value={item.value}>{item.label}</data>}
					</For>
					<input
						id={props.cfg.id}
						list={list()}
						form={props.cfg.form === "outside" ? "form" : undefined}
						type={props.cfg.inputAttrs.type}
						readonly={props.cfg.inputAttrs.readonly !== undefined}
						disabled={props.cfg.inputAttrs.disabled !== undefined}
						value={props.cfg.value}
						onInput={(event) =>
							props.patch({ value: event.currentTarget.value })
						}
					/>
					<Show when={props.cfg.toggle}>
						<button type="button" aria-expanded="false">
							Toggle
						</button>
					</Show>
					<Show when={props.cfg.clear}>
						<button type="reset">Clear</button>
					</Show>
					<Show when={props.cfg.options}>
						{(options) => (
							<For each={[props.cfg.listKey]}>
								{/* Re-created when listKey changes, like key= in React */}
								{() => (
									<Dynamic
										component={props.cfg.listTag}
										id={list()}
										attr:data-nofilter={props.cfg.nofilter ? "" : undefined}
									>
										<For each={options()}>
											{(option) => (
												<Dynamic
													component={optionTag(props.cfg)}
													{...optionAttrs(option)}
												>
													{option.text}
												</Dynamic>
											)}
										</For>
									</Dynamic>
								)}
							</For>
						)}
					</Show>
				</u-combobox>
				<Show when={props.cfg.form === true}>
					<FormFields />
				</Show>
			</Dynamic>
		</Show>
	);
}

mountHarness(DEFAULTS, Combobox);
