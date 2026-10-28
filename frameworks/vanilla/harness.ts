// Vanilla adapter for the harness pages (see packages/harness.ts): renders a config with plain DOM APIs
// and patches the DOM in place on update, like a framework would (keyed children, attribute writes only
// when changed), so the component is never remounted unless `mounted` or a structural key changes.
// Unlike the frameworks, state changes made from event handlers are applied synchronously, as a plain DOM consumer would do.
// Served by the root Vite dev server: frameworks/vanilla/test.html?component=<tag>
import { createHarness, type Mountable } from "../../packages/harness";

export type Instance<C, S = object> = S & {
	cfg: C;
	anchor: Comment; // Keeps the position of the instance in the root between unmount and mount
	nodes: Element[]; // Top level nodes of the instance
};

export type Patch<C> = (patch: Partial<C>) => void;

export type VanillaImpl<C extends Mountable, S extends object> = {
	structural: (keyof C)[]; // Keys that only change the initial markup; patching them re-creates the instance
	init(cfg: C): S; // Extra per-instance state
	mount(inst: Instance<C, S>, patch: Patch<C>): Element[]; // Returns the top level nodes
	unmount?(inst: Instance<C, S>): void;
	update(inst: Instance<C, S>, patch: Partial<C>): void;
};

// Set or remove an attribute only when it changes, like frameworks do. undefined leaves the attribute alone
export const setAttr = (el: Element, name: string, value?: string | null) => {
	if (value === undefined) return;
	if (value === null) {
		if (el.hasAttribute(name)) el.removeAttribute(name);
	} else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

export const create = (
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
export const order = (parent: Node, nodes: Element[], end: Node | null) => {
	let ref = end;
	for (let i = nodes.length - 1; i >= 0; i--) {
		if (nodes[i].parentNode !== parent || nodes[i].nextSibling !== ref)
			parent.insertBefore(nodes[i], ref);
		ref = nodes[i];
	}
};

// Keyed children: reuse the existing element for a key, remove the leftovers and order the rest before `end`
export const reconcile = <T>(
	parent: Element,
	existing: Map<string, Element>,
	items: T[],
	key: (item: T) => string,
	render: (item: T, el?: Element) => Element,
	end: Node | null = null,
) => {
	const next = items.map((item) => {
		const k = key(item);
		const el = render(item, existing.get(k));
		existing.delete(k);
		return el;
	});
	for (const el of existing.values()) el.remove();
	order(parent, next, end);
	return next;
};

export const mountHarness = <C extends Mountable, S extends object>(
	defaults: C,
	impl: VanillaImpl<C, S>,
) => {
	const root = document.getElementById("app") as HTMLElement;
	let instances: Instance<C, S>[] = [];

	const unmount = (inst: Instance<C, S>) => {
		for (const node of inst.nodes) node.remove();
		inst.nodes = [];
		impl.unmount?.(inst);
	};

	const mount = (inst: Instance<C, S>) => {
		inst.nodes = impl.mount(inst, (patch) => update(inst, patch));
		const fragment = document.createDocumentFragment();
		fragment.append(...inst.nodes); // Insert as one tree, like frameworks commit a render
		root.insertBefore(fragment, inst.anchor);
	};

	const update = (inst: Instance<C, S>, patch: Partial<C>) => {
		Object.assign(inst.cfg, patch);
		const has = (...keys: (keyof C)[]) => keys.some((key) => key in patch);
		if (has("mounted", ...impl.structural)) {
			unmount(inst);
			if (inst.cfg.mounted) mount(inst);
			return;
		}
		impl.update(inst, patch);
	};

	createHarness(defaults, {
		render: (cfgs) => {
			root.replaceChildren();
			instances = cfgs.map((cfg) => {
				const anchor = document.createComment("instance");
				root.append(anchor);
				const inst = { ...impl.init(cfg), cfg, anchor, nodes: [] };
				if (cfg.mounted) mount(inst);
				return inst;
			});
		},
		update: (patch, index) => update(instances[index], patch),
	});
};
