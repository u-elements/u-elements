// React adapter for the harness pages (see packages/harness.ts): configs live in React state,
// rendered inside StrictMode, and every harness call is flushed synchronously
import { StrictMode, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { createHarness, type Mountable } from "../../packages/harness";

export type Patch<C> = (patch: Partial<C>) => void;
export type HarnessProps<C> = { cfg: C; patch: Patch<C> };
export type CustomElementProps = React.HTMLAttributes<HTMLElement> &
	Record<string, unknown>;

// Typed as a component to allow custom event props and attributes, React still renders the string as a custom element
export const customElement = (tag: string) =>
	tag as unknown as React.ComponentType<CustomElementProps>;

export const mountHarness = <C extends Mountable>(
	defaults: C,
	Component: React.ComponentType<HarnessProps<C>>,
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

		return cfgs.map((cfg, index) => (
			<Component
				// biome-ignore lint/suspicious/noArrayIndexKey: Instances are positional
				key={index}
				cfg={cfg}
				patch={(patch) => patchConfig(patch, index)}
			/>
		));
	}

	const root = createRoot(document.getElementById("root") as HTMLElement);
	flushSync(() =>
		root.render(
			<StrictMode>
				<App />
			</StrictMode>,
		),
	);

	createHarness(defaults, {
		render: (cfgs) => flushSync(() => setConfigs(cfgs)),
		update: (patch, index) => flushSync(() => patchConfig(patch, index)),
	});
};
