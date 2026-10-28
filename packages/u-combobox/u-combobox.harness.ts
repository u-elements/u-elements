/**
 * Harness config for the u-combobox framework test pages (frameworks/<name>/test.html?component=u-combobox).
 *
 * Each framework page renders <u-combobox> from a HarnessConfig using its own idioms
 * (controlled items from state, bound input value, framework event handlers), see packages/harness.ts
 * for the window.harness contract the shared Playwright suite (u-combobox.suite.ts) drives.
 *
 * Top level must stay free of DOM access, as the suite imports the presets in Node.
 */

import { defined, log } from "../harness";

export type ListTag = "u-datalist" | "datalist";
export type Item = { value: string; label: string };
export type Option = {
	value?: string;
	label?: string;
	text: string;
	id?: string;
	hidden?: boolean;
};

export type HarnessConfig = {
	id: string; // Input id, list id becomes `${id}-list`
	listTag: ListTag;
	multiple: boolean;
	creatable: boolean;
	controlled: boolean | "manual"; // true: items driven by state through comboboxbeforeselect. "manual": only preventDefault, state is changed by the test
	value: string; // Bound input value
	items: Item[];
	options: Option[] | null; // null renders no datalist
	nofilter: boolean;
	label: boolean;
	clear: boolean;
	toggle: boolean;
	select: string | null; // name of a mirrored <select>
	form: boolean | "outside"; // true wraps in <form id="form">, "outside" renders the form before the combobox and sets form="form" on the input
	inputAttrs: Record<string, string>; // type, readonly, disabled, value (vanilla only, as an HTML attribute)
	attrs: Record<string, string>; // Extra attributes on <u-combobox>, i.e. data-multiple="false"
	listKey: number; // Change to force the framework to re-create the datalist element
	replaceOptionsOnInput: Option[] | null; // Consumer pattern: replace options from an input handler
	renderCost: number; // Milliseconds of synchronous work per render, to test commits against a slow framework render (React harness only)
	transition: boolean; // Apply controlled item updates in a transition, so a slow render yields to the scheduler (React harness only)
	mounted: boolean;
};
export type HarnessPatch = Partial<HarnessConfig>;

export const OPTIONS: Option[] = [
	{ value: "oslo-id", label: "Oslo", text: "Oslo" },
	{ text: "Bergen" },
	{ value: "Trondheim", text: "Trondheim" },
];

export const ITEMS: Item[] = [
	{ value: "oslo-id", label: "Oslo" },
	{ value: "Bergen", label: "Bergen" },
	{ value: "Trondheim", label: "Trondheim" },
];

export const DEFAULTS: HarnessConfig = {
	id: "input",
	listTag: "u-datalist",
	multiple: false,
	creatable: false,
	controlled: true,
	value: "",
	items: [],
	options: OPTIONS,
	nofilter: true, // Option visibility must not depend on typed text unless a test asks for it
	label: true,
	clear: false,
	toggle: false,
	select: null,
	form: false,
	inputAttrs: {},
	attrs: {},
	listKey: 0,
	replaceOptionsOnInput: null,
	renderCost: 0,
	transition: false,
	mounted: false,
};

export const listId = (cfg: HarnessConfig) => `${cfg.id}-list`;
export const optionTag = (cfg: HarnessConfig) =>
	cfg.listTag === "u-datalist" ? "u-option" : "option";
export const optionKey = (option: Option) =>
	option.id ?? option.value ?? option.text;

// Attributes for <u-option> and <option>. hidden is boolean so React and Svelte set the property correctly on <u-option>
export const optionAttrs = (option: Option) =>
	defined({
		id: option.id,
		value: option.value,
		label: option.label,
		hidden: option.hidden || undefined,
	});

// Attributes for <u-combobox>. null removes the attribute in every framework
export const comboboxAttrs = (cfg: HarnessConfig) => ({
	"data-multiple": cfg.multiple ? "" : null,
	"data-creatable": cfg.creatable ? "" : null,
	...cfg.attrs,
});

// Controlled mode, as recommended in the docs: prevent the component and derive the next items from the event
export const nextItems = (
	items: Item[],
	detail: HTMLDataElement,
	multiple: boolean,
): Item[] => {
	const item = {
		value: detail.value,
		label: detail.textContent?.trim() || detail.value,
	};
	const remove = detail.isConnected; // Connected means the component wants to remove it
	if (!multiple) return remove ? [] : [item];
	return remove
		? items.filter((i) => i.value !== item.value)
		: [...items, item];
};

export const handleBeforeSelect = (
	event: Event,
	cfg: HarnessConfig,
	setItems: (items: Item[]) => void,
) => {
	log("comboboxbeforeselect", event);
	if (!cfg.controlled) return;
	event.preventDefault();
	if (cfg.controlled === "manual") return; // Test confirms or rejects by updating items itself
	const { detail } = event as CustomEvent<HTMLDataElement>;
	setItems(nextItems(cfg.items, detail, cfg.multiple));
};

export const handleInput = (
	event: Event,
	cfg: HarnessConfig,
	setOptions: (options: Option[]) => void,
) => {
	log("input", event);
	if (cfg.replaceOptionsOnInput) setOptions(cfg.replaceOptionsOnInput);
};

export const handleSubmit = (event: Event) => {
	event.preventDefault();
	log("submit", event);
};
