// Vanilla harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts),
// see ./harness.ts for how the DOM is patched in place like a framework would.
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
import {
	create,
	type Instance,
	mountHarness,
	reconcile,
	setAttr,
} from "./harness";

type State = {
	combobox: HTMLElement | null;
	input: HTMLInputElement | null;
	listKey: number;
};
type Inst = Instance<HarnessConfig, State>;

const optionKeys = new WeakMap<Element, string>(); // Options may lack id and value, so keys can not be read back from the DOM

const formFields = () => [
	create("input", { id: "other", name: "other", value: "keep" }),
	create("button", { type: "submit" }, "Send"),
];

const syncValue = ({ cfg, input }: Inst) => {
	if (input && input.value !== cfg.value) input.value = cfg.value;
};

const syncAttrs = ({ cfg, combobox }: Inst) => {
	if (!combobox) return;
	for (const [name, value] of Object.entries(comboboxAttrs(cfg)))
		setAttr(combobox, name, value);
};

// Items are keyed by value, so existing <data> elements (also those added by the component in uncontrolled mode) are reused
const syncItems = ({ cfg, combobox, input }: Inst) => {
	if (!combobox || !input) return;
	const existing = new Map(
		[...combobox.querySelectorAll(":scope > data")].map((el) => [
			el.getAttribute("value") || "",
			el,
		]),
	);
	reconcile(
		combobox,
		existing,
		cfg.items,
		(item) => item.value,
		(item, el = create("data", { value: item.value })) => {
			if (el.textContent !== item.label) el.textContent = item.label;
			return el;
		},
		input,
	);
};

const syncControls = ({ cfg, combobox, input }: Inst) => {
	if (!combobox || !input) return;
	const select = combobox.querySelector(":scope > select");
	if (cfg.select && !select)
		combobox.prepend(create("select", { name: cfg.select, hidden: "" }));
	else if (!cfg.select) select?.remove();
	else if (select) setAttr(select, "name", cfg.select);

	let toggle = combobox.querySelector(':scope > button[type="button"]');
	if (cfg.toggle && !toggle) {
		toggle = create(
			"button",
			{ type: "button", "aria-expanded": "false" },
			"Toggle",
		);
		input.after(toggle);
	} else if (!cfg.toggle && toggle) {
		toggle.remove();
		toggle = null;
	}

	const clear = combobox.querySelector(':scope > button[type="reset"]');
	if (cfg.clear && !clear)
		(toggle || input).after(create("button", { type: "reset" }, "Clear"));
	else if (!cfg.clear) clear?.remove();
};

// The list is re-created when listKey changes, options are keyed like the frameworks key them
const syncList = (inst: Inst) => {
	const { cfg, combobox } = inst;
	if (!combobox) return;
	let list = combobox.querySelector(":scope > datalist, :scope > u-datalist");
	if (!cfg.options) {
		list?.remove();
		return;
	}
	if (!list || inst.listKey !== cfg.listKey || list.localName !== cfg.listTag) {
		const next = create(cfg.listTag);
		if (list) list.replaceWith(next);
		else combobox.append(next);
		list = next;
		inst.listKey = cfg.listKey;
	}
	setAttr(list, "id", listId(cfg));
	setAttr(list, "data-nofilter", cfg.nofilter ? "" : null);

	const existing = new Map(
		[...list.children].map((el) => [optionKeys.get(el) || "", el]),
	);
	reconcile(list, existing, cfg.options, optionKey, (option, el) => {
		const opt = (el || create(optionTag(cfg))) as HTMLElement;
		optionKeys.set(opt, optionKey(option));
		const attrs = optionAttrs(option);
		setAttr(opt, "id", attrs.id);
		setAttr(opt, "value", attrs.value ?? null);
		setAttr(opt, "label", attrs.label ?? null);
		if (opt.hidden !== !!attrs.hidden) opt.hidden = !!attrs.hidden;
		if (opt.textContent !== option.text) opt.textContent = option.text;
		return opt;
	});
};

mountHarness<HarnessConfig, State>(DEFAULTS, {
	structural: ["id", "label", "form", "inputAttrs", "listTag"],
	init: (cfg) => ({ combobox: null, input: null, listKey: cfg.listKey }),
	unmount: (inst) => {
		inst.combobox = inst.input = null;
	},
	mount: (inst, patch) => {
		const { cfg } = inst;
		const combobox = create("u-combobox");
		const input = create("input", {
			id: cfg.id,
			list: listId(cfg),
			form: cfg.form === "outside" ? "form" : undefined,
			type: cfg.inputAttrs.type,
			readonly: cfg.inputAttrs.readonly,
			disabled: cfg.inputAttrs.disabled,
			value: cfg.inputAttrs.value, // HTML attribute, as opposed to cfg.value which is written through the property
		}) as HTMLInputElement;

		combobox.addEventListener("comboboxbeforeselect", (event) =>
			handleBeforeSelect(event, inst.cfg, (items) => patch({ items })),
		);
		combobox.addEventListener("comboboxafterselect", (event) =>
			log("comboboxafterselect", event),
		);
		combobox.addEventListener("comboboxbeforematch", (event) =>
			log("comboboxbeforematch", event),
		);
		combobox.addEventListener("input", (event) =>
			handleInput(event, inst.cfg, (options) => patch({ options })),
		);
		combobox.addEventListener("change", (event) => log("change", event));
		combobox.append(input);

		inst.combobox = combobox;
		inst.input = input;
		inst.listKey = cfg.listKey;
		syncAttrs(inst);
		syncItems(inst);
		syncControls(inst);
		syncList(inst);
		syncValue(inst);

		const wrapper = create(cfg.form === true ? "form" : "div", {
			id: cfg.form === true ? "form" : undefined,
		});
		wrapper.addEventListener("submit", handleSubmit);
		wrapper.append(combobox, ...(cfg.form === true ? formFields() : []));

		const nodes: Element[] = [];
		if (cfg.label) nodes.push(create("label", { for: cfg.id }, "Label"));
		if (cfg.form === "outside") {
			const form = create("form", { id: "form" });
			form.addEventListener("submit", handleSubmit);
			form.append(...formFields());
			nodes.push(form);
		}
		nodes.push(wrapper);
		return nodes;
	},
	update: (inst, patch) => {
		const has = (...keys: string[]) => keys.some((key) => key in patch);
		if (has("multiple", "creatable", "attrs")) syncAttrs(inst);
		if (has("items")) syncItems(inst);
		if (has("select", "toggle", "clear")) syncControls(inst);
		if (has("options", "listKey", "nofilter")) syncList(inst);
		if (has("value")) syncValue(inst);
	},
});
