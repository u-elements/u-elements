// Without a datalist: free text, so nothing is matched or synced and Enter only creates. Part of the shared u-combobox suite, see ../u-combobox.suite.ts.
// Runs once, as the behaviour does not depend on the list tag
import type { Page } from "@playwright/test";
import { logged, resetLog, settled } from "../../suite";
import { expect, test } from "../../test";
import type { HarnessPatch } from "../u-combobox.harness";
import { BERGEN, renderHarness } from "./context";

export const withoutDatalistTests = (defaults: HarnessPatch) => {
	test.describe("without datalist", () => {
		const render = (page: Page, cfg: HarnessPatch) =>
			renderHarness(page, cfg, defaults);

		test("hides toggle and removes list attribute", async ({ page }) => {
			await render(page, { options: null, toggle: true });
			const input = page.locator("#input");
			const toggle = page.locator("button[aria-expanded]");

			await expect(input).not.toHaveAttribute("list");
			await expect(toggle).toHaveAttribute("hidden", "");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await input.fill("Hello");
			await expect(toggle).toHaveAttribute("hidden", ""); // Still hidden, nothing to toggle
		});

		for (const multiple of [false, true]) {
			test(`does not create item on Enter in ${multiple ? "multiple" : "single"} mode when not creatable`, async ({
				page,
			}) => {
				await render(page, { multiple, options: null, items: [BERGEN] });
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");

				await input.fill("Hello");
				await input.press("Enter");
				await expect(items).toHaveText(["Bergen"]); // Unchanged
				await expect(input).toHaveValue("Hello");
			});
		}

		test("creates item on Enter in multiple mode when creatable", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				creatable: true,
				options: null,
				items: [BERGEN],
			});
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.fill("Oslo");
			await input.press("Enter");
			await expect(items).toHaveText(["Bergen", "Oslo"]);
			await expect(input).toHaveValue("Oslo");
		});

		test("Enter on empty text keeps the item in single mode when creatable, as Enter only creates", async ({
			page,
		}) => {
			await render(page, {
				creatable: true,
				options: null,
				items: [BERGEN],
				clear: true,
			});
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await expect(input).toHaveValue(""); // Never synced to the item without a datalist
			await input.focus();
			await input.press("Enter");
			await expect(items).toHaveText(["Bergen"]); // Not removed
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);

			await input.fill("Hello");
			await page.locator('button[type="reset"]').click(); // The clear button is the way to remove the item
			await expect(items).toHaveCount(0);
			await expect(input).toHaveValue("");
		});

		for (const creatable of [false, true]) {
			test(`blur on empty text keeps the item in single mode when ${creatable ? "creatable" : "not creatable"}`, async ({
				page,
			}) => {
				await render(page, { creatable, options: null, items: [BERGEN] });
				await resetLog(page, "comboboxbeforeselect");
				await resetLog(page, "comboboxbeforematch");
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");

				await input.focus();
				await expect(input).toHaveValue("");
				await input.blur();
				await settled(page); // Blur commit is deferred one tick

				await expect(items).toHaveText(["Bergen"]); // Blur does nothing without a datalist
				expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
				expect(await logged(page, "comboboxbeforematch")).toEqual([]);
			});
		}
	});
};
