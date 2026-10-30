import { defineConfig, devices } from "@playwright/test";
import type { Framework, TestOptions } from "./packages/test";

// Harness pages, each served by its own Vite dev server (see frameworks/<name>/test.html).
// Ports are outside the Vite default range, so a server started by hand with `npm run dev` (which keeps
// watching and reloads the page on save, see frameworks/vite.shared.ts) is never reused by a test run
const VANILLA = 5273;
const FRAMEWORKS: Record<Exclude<Framework, "vanilla">, number> = {
	react: 5274,
	vue: 5275,
	svelte: 5276,
	angular: 5277,
	solid: 5278,
	qwik: 5279,
	preact: 5280,
};
const FRAMEWORK_SPECS = /\.frameworks\.spec\.ts$/; // Shared suites run against every framework page, see packages/test.ts
const reuseExistingServer = !process.env.CI;
const env = { PLAYWRIGHT: "1" }; // Tells the Vite configs to disable file watching, see frameworks/vite.shared.ts

export default defineConfig<TestOptions>({
	testDir: "./packages",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: `http://127.0.0.1:${VANILLA}`,
		framework: "vanilla",
		trace: "on-first-retry", // See https://playwright.dev/docs/trace-viewer
		timezoneId: "Europe/Berlin", // Avoid any time-zone shift when testing Zulu dates
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "Chromium",
			testIgnore: FRAMEWORK_SPECS,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "Firefox",
			testIgnore: FRAMEWORK_SPECS,
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "Webkit",
			testIgnore: FRAMEWORK_SPECS,
			use: { ...devices["Desktop Safari"] },
		},
		{
			name: "Microsoft Edge",
			testIgnore: FRAMEWORK_SPECS,
			use: { ...devices["Desktop Edge"], channel: "msedge" },
		},

		// Mobile viewport
		{
			name: "Mobile Chrome",
			testIgnore: FRAMEWORK_SPECS,
			use: { ...devices["Pixel 5"] },
		},
		{
			name: "Mobile Safari",
			testIgnore: FRAMEWORK_SPECS,
			use: { ...devices["iPhone 12"] },
		},

		// Framework harness pages, Chromium only as browser differences are covered above
		...Object.entries(FRAMEWORKS).map(([name, port]) => ({
			name: name[0].toUpperCase() + name.slice(1),
			testMatch: FRAMEWORK_SPECS,
			use: {
				...devices["Desktop Chrome"],
				baseURL: `http://127.0.0.1:${port}`,
				framework: name as Framework,
			},
		})),
	],
	webServer: [
		{
			command: `npm run dev -- --host --port ${VANILLA} --strictPort`,
			url: `http://127.0.0.1:${VANILLA}`,
			reuseExistingServer,
			env,
		},
		...Object.entries(FRAMEWORKS).map(([name, port]) => ({
			command: `npx vite --config=frameworks/${name}/vite.config.ts --host --port ${port} --strictPort`,
			url: `http://127.0.0.1:${port}/test.html`,
			reuseExistingServer,
			env,
		})),
	],
});
