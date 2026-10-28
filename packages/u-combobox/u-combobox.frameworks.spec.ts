// Runs the shared suite against the framework harness pages (frameworks/<name>/test.html?component=u-combobox),
// once per framework project, see playwright.config.ts
import { docLogged, gotoHarness, harnessHelpers, resetDocLog } from "../suite";
import { expect, test } from "../test";
import type { HarnessConfig } from "./u-combobox.harness";
import { comboboxSuite } from "./u-combobox.suite";

const { render, update } = harnessHelpers<HarnessConfig>();

comboboxSuite();

// A user commit expires after the render opportunity (one microtask, then one MessageChannel task), see afterRender in utils.ts.
// These pin the React scheduler behaviour that deadline relies on, so a React upgrade that reorders its scheduling is caught here
test.describe("React scheduling", () => {
	test.skip(({ framework }) => framework !== "react", "React only");
	test.beforeEach(({ page }) =>
		gotoHarness(page, "test.html?component=u-combobox"),
	);

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

	test("dispatches change when a slow render inside startTransition renders the picked item late", async ({
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
		expect(await docLogged(page, "change")).toEqual(["Oslo"]); // The late render is of the picked item, so it is still the user's commit
	});

	test("dispatches change when a slow render inside startTransition renders a blur match late", async ({
		page,
	}) => {
		await render(page, {
			renderCost: 30,
			transition: true,
			items: [{ value: "oslo-id", label: "Oslo" }],
		});
		await expect(page.locator("#input")).toHaveValue("Oslo");
		await resetDocLog(page);
		const input = page.locator("#input");

		await input.fill("Bergen");
		await input.blur(); // Match, prevented and rendered late
		await expect(input).toHaveValue("Bergen");
		await page.waitForTimeout(100);
		expect((await docLogged(page, "change")).slice(-1)).toEqual(["Bergen"]); // The last change carries the final text, after the fallback reverted to Oslo
		expect(await docLogged(page, "input")).toEqual([
			"Bergen",
			"Oslo",
			"Bergen",
		]); // Typed, reverted by the expired fallback, then synced by the late render

		await resetDocLog(page);
		await update(page, { items: [{ value: "Trondheim", label: "Trondheim" }] }); // Unrelated programmatic item change
		await expect(input).toHaveValue("Trondheim");
		expect(await docLogged(page, "change")).toEqual([]); // The expired commit was resolved by its own render
	});
});
