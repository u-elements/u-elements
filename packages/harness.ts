/**
 * Browser-side core for the framework harness pages (frameworks/<name>/test.html?component=<tag>).
 *
 * A component harness (packages/<tag>/<tag>.harness.ts) defines a config type with defaults. Each framework
 * renders that config with its own idioms through the framework adapter (frameworks/<name>/harness.*), which
 * calls createHarness to expose `window.harness` so the shared Playwright suite (packages/<tag>/<tag>.suite.ts,
 * driven through packages/suite.ts) can render, patch and read logs.
 *
 * Top level must stay free of DOM access, as the suites import the component harness modules in Node.
 */

export type Log = Record<string, string[]>;
export type Mountable = { mounted: boolean };

export type Harness<C extends Mountable = Mountable> = {
	render(cfg: Partial<C> | Partial<C>[]): Promise<void>;
	update(patch: Partial<C>, index?: number): Promise<void>;
	resetLog(type: string): void;
	resetDocLog(): void;
};

export type HarnessImpl<C extends Mountable> = {
	render(cfgs: C[]): void | Promise<void>;
	update(patch: Partial<C>, index: number): void | Promise<void>;
};

export type HarnessOptions = {
	docEvents?: string[]; // Event types logged at document level, see docLogged in packages/suite.ts
	docTarget?: string; // Id of the element whose value is logged, or of the element inside the event target
};

declare global {
	interface Window {
		__log?: Log;
		__doclog?: Log;
		__calls?: Record<string, number>; // Prototype method call counts, see countCalls in packages/suite.ts
		harness: Harness;
	}
}

// Strip undefined keys, as frameworks differ in how they treat undefined on custom element properties (i.e. id = "undefined")
export const defined = <T extends Record<string, unknown>>(obj: T) =>
	Object.fromEntries(
		Object.entries(obj).filter(([, value]) => value !== undefined),
	) as Partial<T>;

// Log an event under its type, storing the target value at the time of the event (like a consumer would read it)
export const log = (type: string, event: Event) => {
	const target = event.target as HTMLInputElement | null;
	const value = typeof target?.value === "string" ? target.value : "";
	window.__log = window.__log || {};
	const logs = window.__log;
	logs[type] = logs[type] || [];
	logs[type].push(value);
};

/**
 * Wire window.harness. The framework adapter supplies render and update, which must apply the
 * configs to its state and flush so the DOM is updated when the returned promise resolves.
 */
export const createHarness = <C extends Mountable>(
	defaults: C,
	impl: HarnessImpl<C>,
	{ docEvents = ["input", "change"], docTarget = "input" }: HarnessOptions = {},
) => {
	const resetDocLog = () => {
		window.__doclog = Object.fromEntries(docEvents.map((type) => [type, []]));
	};

	// Document level log installed before anything renders, to catch events dispatched during mount
	resetDocLog();
	for (const type of docEvents)
		document.addEventListener(type, (event) => {
			const target = event.target as HTMLElement;
			const el = (target.querySelector?.("input") ||
				target) as HTMLInputElement;
			if (el.id === docTarget) window.__doclog?.[type].push(el.value ?? "");
		});

	const harness: Harness<C> = {
		async render(cfg) {
			const cfgs = (Array.isArray(cfg) ? cfg : [cfg]).map((c) => ({
				...defaults,
				mounted: true,
				...c,
			}));
			await impl.render(cfgs);
		},
		async update(patch, index = 0) {
			await impl.update(patch, index);
		},
		resetLog(type) {
			window.__log = { ...window.__log, [type]: [] };
		},
		resetDocLog,
	};
	window.harness = harness as Harness;
};
