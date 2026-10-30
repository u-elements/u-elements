// Solid adapter for the harness pages (see packages/harness.ts): configs live in a store,
// and store writes update the DOM synchronously, so nothing needs flushing
import { type Component, For, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { Dynamic, render } from "solid-js/web";
import { createHarness, type Mountable } from "../../packages/harness";

export type Patch<C> = (patch: Partial<C>) => void;
export type HarnessProps<C> = { cfg: C; patch: Patch<C> };

// Solid sets spread props on custom elements as properties, so prefix with attr: to write attributes (null removes)
export const attrs = (obj: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(obj).map(([k, v]) => [`attr:${k}`, v]));

// Solid lowercases unknown prop names on custom elements, so prefix with prop: to write camelCase properties
export const props = (obj: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(obj).map(([k, v]) => [`prop:${k}`, v]));

export type CustomElementProps = JSX.HTMLAttributes<HTMLElement> &
	Record<string, unknown>;

// A component rendering the tag through Dynamic, to allow any attribute without the generated typings
export const customElement =
	(tag: string): Component<CustomElementProps> =>
	(props) => <Dynamic component={tag} {...props} />;

export const mountHarness = <C extends Mountable>(
	defaults: C,
	Instance: Component<HarnessProps<C>>,
) => {
	const [state, setState] = createStore<{ cfgs: C[] }>({ cfgs: [] });
	const patch = (patch: Partial<C>, index: number) =>
		setState("cfgs", index, patch as C);

	render(
		() => (
			<For each={state.cfgs}>
				{(cfg, index) => (
					<Instance cfg={cfg} patch={(next) => patch(next, index())} />
				)}
			</For>
		),
		document.getElementById("root") as HTMLElement,
	);

	createHarness(defaults, {
		render: (cfgs) => setState("cfgs", cfgs),
		update: patch,
	});
};
