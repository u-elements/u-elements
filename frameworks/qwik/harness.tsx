// Qwik adapter for the harness pages (see packages/harness.ts): configs live in a store, which the
// component mutates directly as Qwik stores are deep. Qwik dispatches on*$ handlers from a document
// level listener in the capture phase, so handlers run before the element's own listeners.
import "@qwik.dev/core/qwikloader.js";
import {
	type Component,
	component$,
	type JSXOutput,
	type QRL,
	type QwikIntrinsicElements,
	render,
	useStore,
	useVisibleTask$,
} from "@qwik.dev/core";
import { _getDomContainer, _waitUntilRendered } from "@qwik.dev/core/internal"; // Internal, but the only way to await a scheduled render
import { createHarness, type Mountable } from "../../packages/harness";

export type HarnessProps<C> = { cfg: C };
export type CustomElementProps = QwikIntrinsicElements["div"] &
	Record<string, unknown>;

// Typed as a component to allow any attribute without the generated typings, Qwik still renders the string as a custom element
export const customElement = (tag: string) =>
	tag as unknown as (props: CustomElementProps) => JSXOutput;

// Qwik loads a handler on its first dispatch, which runs it asynchronously and too late to preventDefault.
// Every handler is resolved up front and awaited by the harness, so dispatch is synchronous from the first event
export const resolved: Promise<unknown>[] = [];
export const resolve = (...qrls: QRL<unknown>[]) =>
	resolved.push(...qrls.map((qrl) => qrl.resolve()));

export const mountHarness = <C extends Mountable>(
	defaults: C,
	Instance: Component<HarnessProps<C>>,
) => {
	const App = component$(() => {
		const state = useStore<{ cfgs: C[] }>({ cfgs: [] });

		// Store writes schedule a render, so wait for the container to settle and the handlers to resolve
		useVisibleTask$(() => {
			const root = document.getElementById("root") as HTMLElement;
			const rendered = async () => {
				await _waitUntilRendered(_getDomContainer(root));
				await Promise.all(resolved);
			};
			createHarness(defaults, {
				render: async (cfgs) => {
					state.cfgs = cfgs;
					await rendered();
				},
				update: async (patch, index) => {
					Object.assign(state.cfgs[index], patch);
					await rendered();
				},
			});
		});

		return (
			<div>
				{state.cfgs.map((cfg, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: Instances are positional
					<Instance key={index} cfg={cfg} />
				))}
			</div>
		);
	});

	render(document.getElementById("root") as HTMLElement, <App />);
};
