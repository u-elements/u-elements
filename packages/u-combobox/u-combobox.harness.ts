/**
 * Shared browser-side harness for the framework test pages (frameworks/<name>/test.u-combobox.html).
 *
 * Each framework page renders <u-combobox> from a HarnessConfig using its own idioms
 * (controlled items from state, bound input value, framework event handlers) and exposes
 * `window.harness` so the shared Playwright suite (u-combobox.suite.ts) can drive it.
 *
 * Top level must stay free of DOM access, as the suite imports the presets in Node.
 */

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
	clear: boolean | "del";
	toggle: boolean;
	select: string | null; // name of a mirrored <select>
	form: boolean | "outside"; // true wraps in <form id="form">, "outside" renders the form before the combobox and sets form="form" on the input
	inputAttrs: Record<string, string>; // type, readonly, disabled
	attrs: Record<string, string>; // Extra attributes on <u-combobox>, i.e. data-sr-*
	listKey: number; // Change to force the framework to re-create the datalist element
	replaceOptionsOnInput: Option[] | null; // Consumer pattern: replace options from an input handler
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
	mounted: false,
};

export type Harness = {
	render(cfg: HarnessPatch | HarnessPatch[]): Promise<void>;
	update(patch: HarnessPatch, index?: number): Promise<void>;
	resetLog(type: string): void;
	resetDocLog(): void;
};

declare global {
	interface Window {
		__log?: Record<string, string[]>;
		__doclog?: Record<string, string[]>;
		harness: Harness;
	}
}

export const listId = (cfg: HarnessConfig) => `${cfg.id}-list`;
export const optionTag = (cfg: HarnessConfig) =>
	cfg.listTag === "u-datalist" ? "u-option" : "option";
export const optionKey = (option: Option) =>
	option.id ?? option.value ?? option.text;

// Strip undefined keys, as frameworks differ in how they treat undefined on custom element properties (i.e. id = "undefined")
export const defined = <T extends Record<string, unknown>>(obj: T) =>
	Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined),
	) as Partial<T>;

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

// Log an event under its type, storing the target value at the time of the event (like a consumer would read it)
export const log = (type: string, event: Event) => {
	const target = event.target as HTMLInputElement | null;
	const value = typeof target?.value === "string" ? target.value : "";
	window.__log = window.__log || {};
	const logs = window.__log;
	logs[type] = logs[type] || [];
	logs[type].push(value);
};

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

const DOC_EVENTS = ["input", "change", "comboboxprogrammaticinput"];

/**
 * Wire window.harness. The framework supplies render and update, which must apply the
 * configs to its state and flush so the DOM is updated when the returned promise resolves.
 */
export const createHarness = (impl: {
	render(cfgs: HarnessConfig[]): void | Promise<void>;
	update(patch: HarnessPatch, index: number): void | Promise<void>;
}) => {
	// Document level log installed before anything renders, to catch events dispatched during mount
	window.__doclog = Object.fromEntries(DOC_EVENTS.map((type) => [type, []]));
	for (const type of DOC_EVENTS)
		document.addEventListener(type, (event) => {
			const target = event.target as HTMLElement;
			const input = (target.querySelector?.("input") ||
				target) as HTMLInputElement;
			if (input.id === "input") window.__doclog?.[type].push(input.value);
		});

	window.harness = {
		async render(cfg) {
			const cfgs = (Array.isArray(cfg) ? cfg : [cfg]).map((c) => ({
				...DEFAULTS,
				mounted: true,
				...c,
			}));
			await impl.render(cfgs);
		},
		async update(patch, index = 0) {
			await impl.update(patch, index);
		},
		resetLog(type) {
			window.__log = { ...window.__log, [type]: [] };
		},
		resetDocLog() {
			window.__doclog = Object.fromEntries(
				DOC_EVENTS.map((type) => [type, []]),
			);
		},
	};
};
