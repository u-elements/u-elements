/**
 * Harness config for the u-datalist framework test pages (frameworks/<name>/test.html?component=u-datalist).
 *
 * Each framework page renders an input bound to state and a <u-datalist> with options keyed from state,
 * see packages/harness.ts for the window.harness contract the shared suite (u-datalist.suite.ts) drives.
 *
 * Top level must stay free of DOM access, as the suite imports the presets in Node.
 */

import { defined } from "../harness";

export type Option = {
	key: string;
	text: string;
	value?: string;
	label?: string;
	hidden?: boolean;
	disabled?: boolean;
	selected?: boolean;
	posinset?: number;
	setsize?: number;
};

export type HarnessConfig = {
	id: string; // Input id, a second input gets `${id}-2`
	listId: string; // Id of the datalist, a second datalist gets `${listId}-2`
	list: string | null; // The list attribute of the inputs, null uses listId
	value: string; // Bound value of the first input
	options: Option[] | null; // null renders no datalist
	options2: Option[] | null; // Options of a second datalist
	nofilter: boolean;
	inputs: 1 | 2; // Inputs bound to the list
	inputKey: number; // Change to force the framework to re-create the input
	inputAttrs: Record<string, string>; // readonly, disabled
	attrs: Record<string, string>; // Extra attributes on <u-datalist>, i.e. aria-multiselectable
	mounted: boolean;
};
export type HarnessPatch = Partial<HarnessConfig>;

export const OPTIONS: Option[] = [
	{ key: "1", text: "Option 1" },
	{ key: "2", text: "Option 2" },
	{ key: "3", text: "Option 3" },
];

export const DEFAULTS: HarnessConfig = {
	id: "input",
	listId: "list",
	list: null,
	value: "",
	options: OPTIONS,
	options2: null,
	nofilter: true, // Option visibility must not depend on typed text unless a test asks for it
	inputs: 1,
	inputKey: 0,
	inputAttrs: {},
	attrs: {},
	mounted: false,
};

export type OptionAttrs = {
	value?: string;
	label?: string;
	hidden?: boolean;
	disabled?: boolean;
	selected?: boolean;
	"aria-posinset"?: number;
	"aria-setsize"?: number;
};

export const listAttr = (cfg: HarnessConfig) => cfg.list ?? cfg.listId;
export const inputIds = (cfg: HarnessConfig) =>
	cfg.inputs === 2 ? [cfg.id, `${cfg.id}-2`] : [cfg.id];

// Attributes for <u-option>. Booleans so frameworks set the properties, which <u-option> reflects
export const optionAttrs = (option: Option) =>
	defined<OptionAttrs>({
		value: option.value,
		label: option.label,
		hidden: option.hidden || undefined,
		disabled: option.disabled || undefined,
		selected: option.selected || undefined,
		"aria-posinset": option.posinset,
		"aria-setsize": option.setsize,
	});

// Attributes for <u-datalist>. null removes the attribute in every framework
export const datalistAttrs = (cfg: HarnessConfig, id = cfg.listId) => ({
	id,
	"data-nofilter": cfg.nofilter ? "" : null,
	...cfg.attrs,
});
