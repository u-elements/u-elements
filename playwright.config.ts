import { defineConfig, devices } from "@playwright/test";

// Framework harness pages, each served by its own Vite dev server (see frameworks/<name>/test.u-combobox.html)
const FRAMEWORKS = { react: 5174, vue: 5175, svelte: 5176, angular: 5177 };
const FRAMEWORK_SPECS = /\.(react|vue|svelte|angular)\.spec\.ts$/;
const reuseExistingServer = !process.env.CI;

export default defineConfig({
	testDir: "./packages",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://127.0.0.1:5173",
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
			testMatch: new RegExp(`\\.${name}\\.spec\\.ts$`),
			use: {
				...devices["Desktop Chrome"],
				baseURL: `http://127.0.0.1:${port}`,
			},
		})),
	],
	webServer: [
		{
			command: "npm run dev -- --host",
			url: "http://127.0.0.1:5173",
			reuseExistingServer,
		},
		...Object.entries(FRAMEWORKS).map(([name, port]) => ({
			command: `npx vite --config=frameworks/${name}/vite.config.ts --host --port ${port} --strictPort`,
			url: `http://127.0.0.1:${port}/test.u-combobox.html`,
			reuseExistingServer,
		})),
	],
});
