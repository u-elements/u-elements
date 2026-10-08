// Qwik harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Items are rendered from a store (controlled), the input value is bound to the store,
// and all combobox events are bound with Qwik on*$ event props. Qwik dispatches those from a
// document level listener in the capture phase, so handlers run before the element's own listeners.
import "@qwik.dev/core/qwikloader.js";
import {
	$,
	component$,
	Fragment,
	type QRL,
	render,
	useStore,
	useVisibleTask$,
} from "@qwik.dev/core";
import { _getDomContainer, _waitUntilRendered } from "@qwik.dev/core/internal"; // Internal, but the only way to await a scheduled render
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

// Qwik loads a handler on its first dispatch, which runs it asynchronously and too late to preventDefault.
// Every handler is resolved up front and awaited by the harness, so dispatch is synchronous from the first event
export const resolved: Promise<unknown>[] = [];
const resolve = (...qrls: QRL<unknown>[]) =>
	resolved.push(...qrls.map((qrl) => qrl.resolve()));

const FormFields = () => (
	<>
		<input id="other" name="other" value="keep" />
		<button type="submit">Send</button>
	</>
);

const Combobox = component$(({ cfg }: { cfg: HarnessConfig }) => {
	const onBeforeSelect = $((event: Event) =>
		handleBeforeSelect(event, cfg, (items) => {
			cfg.items = items;
		}),
	);
	const onAfterSelect = $((event: Event) => log("comboboxafterselect", event));
	const onBeforeMatch = $((event: Event) => log("comboboxbeforematch", event));
	const onInput = $((event: Event) =>
		handleInput(event, cfg, (options) => {
			cfg.options = options;
		}),
	);
	const onChange = $((event: Event) => log("change", event));
	const onValue = $((_: Event, el: HTMLInputElement) => {
		cfg.value = el.value;
	});
	const onSubmit = $((event: Event) => handleSubmit(event));
	resolve(
		onBeforeSelect,
		onAfterSelect,
		onBeforeMatch,
		onInput,
		onChange,
		onValue,
		onSubmit,
	);

	if (!cfg.mounted) return null;
	const ListTag = cfg.listTag as "datalist";
	const OptTag = optionTag(cfg) as "option";
	const list = listId(cfg);

	// Static tags, as Qwik writes on*$ props on a dynamic tag as plain attributes instead of binding them
	const content = (
		<>
			<u-combobox
				{...comboboxAttrs(cfg)}
				onComboboxbeforeselect$={onBeforeSelect}
				onComboboxafterselect$={onAfterSelect}
				onComboboxbeforematch$={onBeforeMatch}
				onInput$={onInput}
				onChange$={onChange}
			>
				{cfg.select && <select name={cfg.select} hidden />}
				{/* Keyed fragment, as an array child going from or to empty makes Qwik re-create the following siblings */}
				<Fragment key="items">
					{cfg.items.map((item) => (
						<data key={item.value} value={item.value}>
							{item.label}
						</data>
					))}
				</Fragment>
				<input
					id={cfg.id}
					// @ts-expect-error list is missing from Qwik's input typings
					list={list}
					form={cfg.form === "outside" ? "form" : undefined}
					type={cfg.inputAttrs.type}
					readOnly={cfg.inputAttrs.readonly !== undefined}
					disabled={cfg.inputAttrs.disabled !== undefined}
					value={cfg.value}
					onInput$={onValue}
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
			</u-combobox>
			{cfg.form === true && <FormFields />}
		</>
	);

	return (
		<>
			{cfg.label && <label for={cfg.id}>Label</label>}
			{cfg.form === "outside" && (
				<form id="form" onSubmit$={onSubmit}>
					<FormFields />
				</form>
			)}
			{cfg.form === true ? (
				<form id="form" onSubmit$={onSubmit}>
					{content}
				</form>
			) : (
				<div>{content}</div>
			)}
		</>
	);
});

const App = component$(() => {
	const state = useStore<{ cfgs: HarnessConfig[] }>({ cfgs: [] });

	// Store writes schedule a render, so wait for the container to settle and the handlers to resolve
	useVisibleTask$(() => {
		const root = document.getElementById("root") as HTMLElement;
		const rendered = async () => {
			await _waitUntilRendered(_getDomContainer(root));
			await Promise.all(resolved);
		};
		createHarness({
			render: async (cfgs) => {
				state.cfgs = cfgs;
				await rendered();
			},
			update: async (patch, index) => {
				Object.assign(state.cfgs[index], patch);
				await rendered();
			},
		});
	});

	return (
		<div>
			{state.cfgs.map((cfg, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: Instances are positional
				<Combobox key={index} cfg={cfg} />
			))}
		</div>
	);
});

render(document.getElementById("root") as HTMLElement, <App />);
