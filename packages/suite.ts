/**
 * Node-side helpers for the shared Playwright suites (packages/<tag>/<tag>.suite.ts), driving the
 * `window.harness` exposed by the harness pages, see packages/harness.ts.
 */
import type { Page } from "@playwright/test";
import type { Mountable } from "./harness";

// Open a harness page and wait for the framework to expose window.harness
export const gotoHarness = async (page: Page, url: string) => {
	await page.goto(url);
	await page.waitForFunction(() => !!window.harness);
};

// render and update typed for one component config
export const harnessHelpers = <C extends Mountable>() => ({
	// Render one or more instances, with defaults applied to each config
	render: (
		page: Page,
		cfg: Partial<C> | Partial<C>[] = {},
		defaults: Partial<C> = {},
	) =>
		page.evaluate(
			(cfg) =>
				window.harness.render(cfg as Partial<Mountable> | Partial<Mountable>[]),
			Array.isArray(cfg)
				? cfg.map((c) => ({ ...defaults, ...c }))
				: { ...defaults, ...cfg },
		),
	update: (page: Page, patch: Partial<C>, index = 0) =>
		page.evaluate(
			([patch, index]) =>
				window.harness.update(patch as Partial<Mountable>, index),
			[patch, index] as const,
		),
});

export const resetLog = (page: Page, type: string) =>
	page.evaluate((type) => window.harness.resetLog(type), type);

export const logged = (page: Page, type: string) =>
	page.evaluate((type) => window.__log?.[type] || [], type);

export const resetDocLog = (page: Page) =>
	page.evaluate(() => window.harness.resetDocLog());

export const docLogged = (page: Page, type: string) =>
	page.evaluate((type) => window.__doclog?.[type] || [], type);

// Count calls to a method on a custom element's prototype, to assert that a sync settles instead of scheduling itself again.
// Install before mounting, as earlier calls are not counted. Resolves to a function reading the count
export const countCalls = async (page: Page, tag: string, method: string) => {
	const key = `${tag}.${method}`;
	await page.evaluate(
		([tag, method, key]) => {
			window.__calls = window.__calls || {};
			const calls = window.__calls;
			if (key in calls) return; // Already wrapped on this page
			calls[key] = 0;
			const proto = customElements.get(tag)?.prototype as unknown as Record<
				string,
				(...args: unknown[]) => unknown
			>;
			const original = proto[method];
			proto[method] = function (this: unknown, ...args: unknown[]) {
				calls[key]++;
				return original.apply(this, args);
			};
		},
		[tag, method, key] as const,
	);
	return () => page.evaluate((key) => window.__calls?.[key] || 0, key);
};

// Resolves after the component's afterRender callbacks have run (microtask, then MessageChannel).
// Needed as Playwright evaluates run before pending MessageChannel tasks, so the next step would otherwise race them
export const afterRendered = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				const { port1, port2 } = new MessageChannel();
				port1.onmessage = () => resolve(port1.close());
				Promise.resolve().then(() => port2.postMessage(0));
			}),
	);

// Resolves once every channel the components and frameworks schedule through has had a turn: afterRendered for the
// microtask and MessageChannel renders, then an animation frame and a macrotask, as zoneless Angular renders in a race
// between requestAnimationFrame and setTimeout, and the components defer blur and announcements with setTimeout.
// For negative assertions, where a wrongly triggered sync, select or render must have had its chance to land, instead of an arbitrary timeout
export const settled = async (page: Page) => {
	await afterRendered(page);
	await page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => setTimeout(resolve)),
			),
	);
};
