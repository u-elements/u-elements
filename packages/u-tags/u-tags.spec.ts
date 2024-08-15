import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("index.html");
	await page.evaluate(() => {
		document.body.innerHTML = "<u-tags></u-tags>";
	});
});

test.describe("u-tags", () => {
	test("matches snapshot", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = "<u-tags></u-tags>";
		});
		expect(await page.locator("body").innerHTML()).toMatchSnapshot("u-tags");
	});

	test("is is defined", async ({ page }) => {
		const uTags = page.locator("u-tags");
		const instance = await uTags.evaluate(
			(el) => el instanceof (customElements.get("u-tags") as never),
		);

		expect(instance).toBeTruthy();
		await expect(uTags).toBeAttached();
	});
});
