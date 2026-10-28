// Preact adapter for the harness pages (see packages/harness.ts): configs live in component state.
// Preact re-renders in a microtask after a state change, so a macrotask is enough to see the DOM updated
import { type HTMLAttributes, render, type VNode } from "preact";
import { useState } from "preact/hooks";
import { createHarness, type Mountable } from "../../packages/harness";

export type Patch<C> = (patch: Partial<C>) => void;
export type HarnessProps<C> = { cfg: C; patch: Patch<C> };
export type CustomElementProps = HTMLAttributes<HTMLElement> &
	Record<string, unknown>;

// Typed as a component to allow any attribute without the generated typings, Preact still renders the string as a custom element
export const customElement = (tag: string) =>
	tag as unknown as (props: CustomElementProps) => VNode;

const rendered = () => new Promise((resolve) => setTimeout(resolve));

export const mountHarness = <C extends Mountable>(
	defaults: C,
	Component: (props: HarnessProps<C>) => VNode | null, // Narrower than ComponentType, whose children type is not a JSX element
) => {
	let setConfigs: (cfgs: C[]) => void = () => {};
	let patchConfig: (patch: Partial<C>, index: number) => void = () => {};

	function App() {
		const [cfgs, setCfgs] = useState<C[]>([]);
		setConfigs = setCfgs;
		patchConfig = (patch, index) =>
			setCfgs((prev) =>
				prev.map((cfg, i) => (i === index ? { ...cfg, ...patch } : cfg)),
			);

		return (
			<>
				{cfgs.map((cfg, index) => (
					<Component
						// biome-ignore lint/suspicious/noArrayIndexKey: Instances are positional
						key={index}
						cfg={cfg}
						patch={(patch) => patchConfig(patch, index)}
					/>
				))}
			</>
		);
	}

	render(<App />, document.getElementById("root") as HTMLElement);

	createHarness(defaults, {
		render: async (cfgs) => {
			setConfigs(cfgs);
			await rendered();
		},
		update: async (patch, index) => {
			patchConfig(patch, index);
			await rendered();
		},
	});
};
