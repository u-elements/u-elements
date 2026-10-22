// Runs the shared suite against the React harness page (frameworks/react/test.u-combobox.html)
import { expect, type Page, test } from "@playwright/test";
import type { HarnessPatch } from "./u-combobox.harness";
import { comboboxSuite } from "./u-combobox.suite";

comboboxSuite("React");

const render = (page: Page, cfg: HarnessPatch) =>
	page.evaluate((cfg) => window.harness.render(cfg), cfg);
const resetDocLog = (page: Page) =>
	page.evaluate(() => window.harness.resetDocLog());
const docLogged = (page: Page, type: string) =>
	page.evaluate((type) => window.__doclog?.[type] || [], type);

// A user commit expires after the render opportunity (one microtask, then one MessageChannel task), see afterRender in utils.ts.
// These pin the React scheduler behaviour that deadline relies on, so a React upgrade that reorders its scheduling is caught here
test.describe("React scheduling", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("test.u-combobox.html");
		await page.waitForFunction(() => !!window.harness);
	});

	test("dispatches change when a slow controlled render follows a pick", async ({
		page,
	}) => {
		await render(page, { renderCost: 30 }); // Longer than the 5ms scheduler slice. A default lane render still runs to completion in one task, so the item change consumes the commit in time
		await resetDocLog(page);
		const input = page.locator("#input");

		await input.click();
		await page.locator("u-option").nth(0).click();
		await expect(input).toHaveValue("Oslo");
		await expect.poll(() => docLogged(page, "change")).toEqual(["Oslo"]);
	});

	test("treats a slow render inside startTransition as a programmatic item change", async ({
		page,
	}) => {
		await render(page, { renderCost: 30, transition: true }); // A transition is time sliced, so the render yields past the render opportunity and the commit expires
		await resetDocLog(page);
		const input = page.locator("#input");

		await input.click();
		await page.locator("u-option").nth(0).click();
		await expect(input).toHaveValue("Oslo"); // Still synced to the item
		await page.waitForTimeout(100);
		expect(await docLogged(page, "input")).toEqual(["Oslo"]);
		expect(await docLogged(page, "change")).toEqual([]); // Documented limitation: input, but no change
	});
});
