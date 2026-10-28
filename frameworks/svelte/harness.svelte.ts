// Svelte adapter for the harness pages (see packages/harness.ts): configs live in $state,
// mutated in place and flushed synchronously
import { flushSync } from "svelte";
import { createHarness, type Mountable } from "../../packages/harness";

export const harnessState = <C extends Mountable>(defaults: C) => {
	let cfgs = $state<C[]>([]);

	createHarness(defaults, {
		render: (next) => {
			cfgs = next;
			flushSync();
		},
		update: (patch, index) => {
			Object.assign(cfgs[index], patch);
			flushSync();
		},
	});

	return {
		get cfgs() {
			return cfgs;
		},
	};
};
