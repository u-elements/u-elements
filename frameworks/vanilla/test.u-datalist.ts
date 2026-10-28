// Vanilla harness page for the shared u-datalist suite (packages/u-datalist/u-datalist.suite.ts),
// see ./harness.ts for how the DOM is patched in place like a framework would.
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
import {
	create,
	type Instance,
	mountHarness,
	reconcile,
	setAttr,
} from "./harness";

type State = {
	root: HTMLElement | null;
	inputKey: number;
	patch: (patch: Partial<HarnessConfig>) => void;
};
type Inst = Instance<HarnessConfig, State>;

const keys = new WeakMap<Element, string>();

const syncInputs = (inst: Inst) => {
	const { cfg, root } = inst;
	if (!root) return;
	const existing = new Map(
		[...root.querySelectorAll(":scope > input")].map((el) => [el.id, el]),
	);
	if (inst.inputKey !== cfg.inputKey) {
		for (const el of existing.values()) el.remove(); // Re-created like a keyed input
		existing.clear();
		inst.inputKey = cfg.inputKey;
	}
	const list = root.querySelector(":scope > u-datalist");
	reconcile(
		root,
		existing,
		inputIds(cfg),
		(id) => id,
		(id, el) => {
			const input = (el || create("input", { id })) as HTMLInputElement;
			if (!el && id === cfg.id) {
				input.addEventListener("input", (event) => {
					log("input", event);
					inst.patch({ value: input.value });
				});
			}
			setAttr(input, "list", listAttr(cfg));
			setAttr(input, "readonly", cfg.inputAttrs.readonly ?? null);
			setAttr(input, "disabled", cfg.inputAttrs.disabled ?? null);
			if (id === cfg.id && input.value !== cfg.value) input.value = cfg.value;
			return input;
		},
		list,
	);
	const labels = new Map(
		[...root.querySelectorAll(":scope > label")].map((el) => [
			el.getAttribute("for") || "",
			el,
		]),
	);
	reconcile(
		root,
		labels,
		inputIds(cfg),
		(id) => id,
		(id, el) => el || create("label", { for: id }, `Label ${id}`),
		root.querySelector(":scope > input"),
	);
};

const syncList = (
	inst: Inst,
	id: string,
	options: Option[] | null,
	slot: string,
) => {
	const { cfg, root } = inst;
	if (!root) return;
	let list = root.querySelector(`:scope > u-datalist[data-slot="${slot}"]`);
	if (!options) return list?.remove();
	if (!list) {
		list = create("u-datalist", { "data-slot": slot });
		root.append(list);
	}
	for (const [name, value] of Object.entries(datalistAttrs(cfg, id)))
		setAttr(list, name, value);
	const existing = new Map(
		[...list.children].map((el) => [keys.get(el) || "", el]),
	);
	reconcile(
		list,
		existing,
		options,
		(option) => option.key,
		(option, el) => {
			const opt = (el || create("u-option")) as HTMLOptionElement;
			keys.set(opt, option.key);
			const attrs = optionAttrs(option);
			setAttr(opt, "value", attrs.value ?? null);
			setAttr(opt, "label", attrs.label ?? null);
			setAttr(opt, "aria-posinset", attrs["aria-posinset"]?.toString() ?? null);
			setAttr(opt, "aria-setsize", attrs["aria-setsize"]?.toString() ?? null);
			for (const prop of ["hidden", "disabled", "selected"] as const)
				if (opt[prop] !== !!attrs[prop]) opt[prop] = !!attrs[prop]; // Properties, like frameworks write booleans
			if (opt.textContent !== option.text) opt.textContent = option.text;
			return opt;
		},
	);
};

const syncLists = (inst: Inst) => {
	syncList(inst, inst.cfg.listId, inst.cfg.options, "first");
	syncList(inst, `${inst.cfg.listId}-2`, inst.cfg.options2, "second");
};

mountHarness<HarnessConfig, State>(DEFAULTS, {
	structural: ["id"],
	init: (cfg) => ({ root: null, inputKey: cfg.inputKey, patch: () => {} }),
	unmount: (inst) => {
		inst.root = null;
	},
	mount: (inst, patch) => {
		const root = create("div");
		inst.root = root;
		inst.patch = patch;
		inst.inputKey = inst.cfg.inputKey;
		syncInputs(inst);
		syncLists(inst);
		return [root];
	},
	update: (inst, patch) => {
		const has = (...keys: string[]) => keys.some((key) => key in patch);
		if (has("options", "options2", "listId", "nofilter", "attrs"))
			syncLists(inst);
		if (has("inputs", "inputKey", "list", "listId", "inputAttrs", "value"))
			syncInputs(inst);
	},
});
