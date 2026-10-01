// Vanilla harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Renders the HarnessConfig with plain DOM APIs and patches the DOM in place on update, like a
// framework would (keyed items and options, attribute writes only when changed), so the component
// is never remounted unless `mounted` changes. Unlike the frameworks, state changes made from event
// handlers are applied synchronously, as a plain DOM consumer would do.
// Served by the root Vite dev server: frameworks/vanilla/test.u-combobox.html
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

type Instance = {
	cfg: HarnessConfig;
	anchor: Comment; // Keeps the position of the instance in the root between unmount and mount
	nodes: Element[]; // Top level nodes of the instance
	combobox: HTMLElement | null;
	input: HTMLInputElement | null;
	listKey: number;
};

// Keys that only change the initial markup; patching them re-creates the instance
const STRUCTURAL = ["id", "label", "form", "inputAttrs", "listTag"];
const optionKeys = new WeakMap<Element, string>(); // Options may lack id and value, so keys can not be read back from the DOM

const root = document.getElementById("app") as HTMLElement;
let instances: Instance[] = [];

// Set or remove an attribute only when it changes, like frameworks do. undefined leaves the attribute alone
const setAttr = (el: Element, name: string, value?: string | null) => {
	if (value === undefined) return;
	if (value === null) {
		if (el.hasAttribute(name)) el.removeAttribute(name);
	} else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

const create = (
	tag: string,
	attrs: Record<string, string | null | undefined> = {},
	text?: string,
) => {
	const el = document.createElement(tag);
	for (const [name, value] of Object.entries(attrs)) setAttr(el, name, value);
	if (text !== undefined) el.textContent = text;
	return el;
};

// Place nodes in order before `end`, moving only the nodes that are out of place
const order = (parent: Node, nodes: Element[], end: Node | null) => {
	let ref = end;
	for (let i = nodes.length - 1; i >= 0; i--) {
		if (nodes[i].parentNode !== parent || nodes[i].nextSibling !== ref)
			parent.insertBefore(nodes[i], ref);
		ref = nodes[i];
	}
};

const formFields = () => [
	create("input", { id: "other", name: "other", value: "keep" }),
	create("button", { type: "submit" }, "Send"),
];

const syncValue = ({ cfg, input }: Instance) => {
	if (input && input.value !== cfg.value) input.value = cfg.value;
};

const syncAttrs = ({ cfg, combobox }: Instance) => {
	if (!combobox) return;
	for (const [name, value] of Object.entries(comboboxAttrs(cfg)))
		setAttr(combobox, name, value);
};

// Items are keyed by value, so existing <data> elements (also those added by the component in uncontrolled mode) are reused
const syncItems = ({ cfg, combobox, input }: Instance) => {
	if (!combobox || !input) return;
	const existing = new Map(
		[...combobox.querySelectorAll(":scope > data")].map((el) => [
			el.getAttribute("value"),
			el,
		]),
	);
	const items = cfg.items.map((item) => {
		const el =
			existing.get(item.value) || create("data", { value: item.value });
		existing.delete(item.value);
		if (el.textContent !== item.label) el.textContent = item.label;
		return el;
	});
	for (const el of existing.values()) el.remove();
	order(combobox, items, input);
};

const syncControls = ({ cfg, combobox, input }: Instance) => {
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

	let clear = combobox.querySelector(
		':scope > button[type="reset"], :scope > del',
	);
	const wanted = cfg.clear === "del" ? "del" : cfg.clear ? "button" : null;
	if (clear && clear.localName !== wanted) {
		clear.remove();
		clear = null;
	}
	if (wanted && !clear) {
		clear =
			wanted === "del"
				? create("del")
				: create("button", { type: "reset" }, "Clear");
		(toggle || input).after(clear);
	}
};

// The list is re-created when listKey changes, options are keyed like the frameworks key them
const syncList = (inst: Instance) => {
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
		[...list.children].map((el) => [optionKeys.get(el), el]),
	);
	const options = cfg.options.map((option) => {
		const key = optionKey(option);
		const el = (existing.get(key) || create(optionTag(cfg))) as HTMLElement;
		existing.delete(key);
		optionKeys.set(el, key);
		const attrs = optionAttrs(option);
		setAttr(el, "id", attrs.id);
		setAttr(el, "value", attrs.value);
		setAttr(el, "label", attrs.label);
		if (el.hidden !== !!attrs.hidden) el.hidden = !!attrs.hidden;
		if (el.textContent !== option.text) el.textContent = option.text;
		return el;
	});
	for (const el of existing.values()) el.remove();
	order(list, options, null);
};

const unmount = (inst: Instance) => {
	for (const node of inst.nodes) node.remove();
	inst.nodes = [];
	inst.combobox = inst.input = null;
};

const mount = (inst: Instance) => {
	const { cfg } = inst;
	const patch = (patch: HarnessPatch) => update(inst, patch);
	const combobox = create("u-combobox");
	const input = create("input", {
		id: cfg.id,
		list: listId(cfg),
		form: cfg.form === "outside" ? "form" : undefined,
		type: cfg.inputAttrs.type,
		readonly: cfg.inputAttrs.readonly,
		disabled: cfg.inputAttrs.disabled,
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
	combobox.addEventListener("comboboxprogrammaticinput", (event) =>
		log("comboboxprogrammaticinput", event),
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
	inst.nodes = nodes;
	const fragment = document.createDocumentFragment();
	fragment.append(...nodes); // Insert as one tree, like frameworks commit a render
	root.insertBefore(fragment, inst.anchor);
};

const update = (inst: Instance, patch: HarnessPatch) => {
	Object.assign(inst.cfg, patch);
	const has = (...keys: string[]) => keys.some((key) => key in patch);
	if (has("mounted", ...STRUCTURAL)) {
		unmount(inst);
		if (inst.cfg.mounted) mount(inst);
		return;
	}
	if (has("multiple", "creatable", "attrs")) syncAttrs(inst);
	if (has("items")) syncItems(inst);
	if (has("select", "toggle", "clear")) syncControls(inst);
	if (has("options", "listKey", "nofilter")) syncList(inst);
	if (has("value")) syncValue(inst);
};

createHarness({
	render: (cfgs) => {
		root.replaceChildren();
		instances = cfgs.map((cfg) => {
			const anchor = document.createComment("u-combobox");
			root.append(anchor);
			const inst: Instance = {
				cfg,
				anchor,
				nodes: [],
				combobox: null,
				input: null,
				listKey: cfg.listKey,
			};
			if (cfg.mounted) mount(inst);
			return inst;
		});
	},
	update: (patch, index) => update(instances[index], patch),
});
