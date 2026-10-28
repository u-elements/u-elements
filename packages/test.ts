/**
 * Playwright `test` with a `framework` option, set per project in playwright.config.ts.
 * The browser projects run the vanilla harness pages and the raw DOM specs, while each framework
 * project runs the *.frameworks.spec.ts files against its own harness page (frameworks/<name>/test.html).
 */
import { test as base } from "@playwright/test";

export const FRAMEWORKS = [
	"vanilla",
	"react",
	"vue",
	"svelte",
	"angular",
	"solid",
	"qwik",
	"preact",
] as const;

export type Framework = (typeof FRAMEWORKS)[number];
export type TestOptions = { framework: Framework };

export const test = base.extend<TestOptions>({
	framework: ["vanilla", { option: true }],
});

export { expect } from "@playwright/test";
