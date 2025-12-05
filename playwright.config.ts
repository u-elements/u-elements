import { defineConfig, devices } from "@playwright/test";

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
		{ name: "Chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "Firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "Webkit", use: { ...devices["Desktop Safari"] } },
		{
			name: "Microsoft Edge",
			use: { ...devices["Desktop Edge"], channel: "msedge" },
		},

		// Mobile viewport
		{ name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
		{ name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
	],
	webServer: {
		command: "npm run start -- --host",
		url: "http://127.0.0.1:5173",
		reuseExistingServer: !process.env.CI,
	},
});
