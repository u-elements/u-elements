// Form: submit prevention on Enter, the mirrored <select>, form reset and the clear button. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { logged, resetLog } from "../../suite";
import { expect, test } from "../../test";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const formTests = ({
	LIST_TAG,
	IS_NATIVE,
	name,
	render,
}: SuiteContext) => {
	test.describe(name("form"), () => {
		test("Enter does not submit when datalist exists and restores form attribute", async ({
			page,
		}) => {
			await render(page, { multiple: true, form: true });
			const input = page.locator("#input");

			await input.fill("Bergen");
			await input.press("Enter");
			await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
			await input.fill("Nope");
			await input.press("Enter");
			await expect(input).not.toHaveAttribute("form", "#");
			expect(await logged(page, "submit")).toEqual([]);
		});

		test("Enter restores explicit form attribute", async ({ page }) => {
			await render(page, { multiple: true, form: "outside" });
			const input = page.locator("#input");

			await input.fill("Bergen");
			await input.press("Enter");
			await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
			await expect(input).toHaveAttribute("form", "form");
			expect(await logged(page, "submit")).toEqual([]);
		});

		test("Enter submits when no datalist and not creatable", async ({
			page,
		}) => {
			await render(page, { form: true, options: null, label: false });
			const input = page.locator("#input");

			await input.fill("Hello");
			await input.press("Enter");
			await expect.poll(() => logged(page, "submit")).toHaveLength(1);
		});

		test("ArrowDown and Enter selects active option once without submit", async ({
			page,
		}) => {
			test.skip(IS_NATIVE, "Native datalist popup can not be driven");
			await render(page, { multiple: true, form: true });
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");

			await input.click();
			await input.press("ArrowDown");
			await input.press("Enter");
			await expect(page.locator("u-combobox data")).toHaveText(["Oslo"]);
			await expect(input).toHaveValue("");
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);
			expect(await logged(page, "submit")).toEqual([]);
		});

		test("ArrowDown and held Enter selects the active option once without submit", async ({
			page,
		}) => {
			test.skip(IS_NATIVE, "Native datalist popup can not be driven");
			// <u-datalist> stays open with the option active in multiple mode, so a repeat would toggle the item on every keydown
			await render(page, { multiple: true, form: true });
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");

			await input.click();
			await input.press("ArrowDown");
			await page.keyboard.down("Enter");
			await page.keyboard.down("Enter"); // repeat: true
			await page.keyboard.down("Enter");
			await page.keyboard.up("Enter");
			await expect(page.locator("u-combobox data")).toHaveText(["Oslo"]);
			await expect(page.locator(LIST_TAG)).toBeVisible(); // Still open, as repeats are swallowed without picking
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);
			expect(await logged(page, "submit")).toEqual([]);
		});

		test("mirrors items into select for FormData", async ({ page }) => {
			await render(page, {
				multiple: true,
				form: true,
				select: "tags",
				items: [BERGEN, OSLO],
			});
			const options = page.locator("select option");
			const getAll = () =>
				page.evaluate(() =>
					new FormData(
						document.getElementById("form") as HTMLFormElement,
					).getAll("tags"),
				);

			await expect(page.locator("select")).toHaveAttribute("multiple", "");
			await expect(options).toHaveCount(2);
			await expect(options.nth(0)).toHaveText("Bergen");
			await expect(options.nth(1)).toHaveText("Oslo");
			await expect(options.nth(1)).toHaveAttribute("value", "oslo-id");
			await expect.poll(getAll).toEqual(["Bergen", "oslo-id"]);

			await page.locator("u-combobox data").nth(1).focus();
			await page.locator("u-combobox data").nth(1).press("Backspace");
			await expect(options).toHaveCount(1);
			await expect.poll(getAll).toEqual(["Bergen"]);
		});

		test("mirrors single item into select", async ({ page }) => {
			await render(page, { form: true, select: "tag" });
			await update(page, { items: [OSLO] });
			const input = page.locator("#input");
			const getAll = () =>
				page.evaluate(() =>
					new FormData(
						document.getElementById("form") as HTMLFormElement,
					).getAll("tag"),
				);

			await expect(page.locator("select")).not.toHaveAttribute("multiple");
			await expect.poll(getAll).toEqual(["oslo-id"]);

			await input.fill("Bergen");
			await input.press("Enter");
			await expect(page.locator("select option")).toHaveCount(1);
			await expect.poll(getAll).toEqual(["Bergen"]);
		});

		test("hides clear button after form reset in multiple mode", async ({
			page,
			framework,
		}) => {
			test.skip(
				framework === "react",
				"React keeps the value attribute of a controlled input in sync, so form.reset() restores the current value and there is nothing to sync",
			);
			await render(page, {
				multiple: true,
				form: true,
				items: [BERGEN],
				clear: true,
			});
			const input = page.locator("#input");
			const clear = page.locator('button[type="reset"]');

			await input.fill("abc");
			await expect(clear).not.toHaveAttribute("hidden");
			await page.evaluate(() =>
				(document.getElementById("form") as HTMLFormElement).reset(),
			);
			await expect(input).toHaveValue("");
			await expect(clear).toHaveAttribute("hidden", ""); // Reset neither calls the value setter nor dispatches input, so the component listens for reset
			await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]); // Items are not form controls
		});

		test("syncs single mode input after form reset", async ({ page }) => {
			await render(page, {
				form: true,
				clear: true,
				toggle: true,
				items: [BERGEN],
			});
			const input = page.locator("#input");
			const clear = page.locator('button[type="reset"]');
			const toggle = page.locator("button[aria-expanded]");

			await input.click();
			await input.fill("Tro");
			await page.evaluate(() =>
				(document.getElementById("form") as HTMLFormElement).reset(),
			);
			await expect(input).toHaveValue("Bergen"); // Re-synced from the item
			await expect(clear).not.toHaveAttribute("hidden");
			if (!IS_NATIVE) await expect(toggle).toHaveAttribute("hidden", "");
		});

		test("clear button does not reset the form", async ({ page }) => {
			await render(page, {
				multiple: true,
				form: true,
				items: [BERGEN],
				clear: true,
			});
			const input = page.locator("#input");
			const other = page.locator("#other");
			const clear = page.locator('button[type="reset"]');
			const list = page.locator(LIST_TAG);

			await other.fill("changed");
			await expect(clear).toHaveAttribute("hidden", "");
			await input.click();
			await input.fill("abc");
			await expect(clear).not.toHaveAttribute("hidden");
			await clear.click();
			await expect(input).toHaveValue("");
			await expect(input).toBeFocused();
			await expect(other).toHaveValue("changed"); // Form was not reset
			await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]); // Items untouched in multiple mode
			if (!IS_NATIVE) await expect(list).not.toHaveAttribute("hidden"); // Reopened as it was open before clear
		});
	});
};
