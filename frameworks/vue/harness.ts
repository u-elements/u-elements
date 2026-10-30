// Vue adapter for the harness pages (see packages/harness.ts): configs live in reactive state,
// mutated in place and awaited with nextTick
import { nextTick, reactive } from "vue";
import { createHarness, type Mountable } from "../../packages/harness";

export const harnessState = <C extends Mountable>(defaults: C) => {
	const state = reactive({ cfgs: [] }) as unknown as { cfgs: C[] }; // Reactive typing unwraps refs, which the configs never hold

	createHarness(defaults, {
		render: async (cfgs) => {
			state.cfgs = cfgs;
			await nextTick();
		},
		update: async (patch, index) => {
			Object.assign(state.cfgs[index], patch);
			await nextTick();
		},
	});

	return state;
};
