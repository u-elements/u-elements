// Mode changes: data-multiple and data-creatable toggled at runtime. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { expect, test } from "../../test";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const modeChangesTests = ({
	LIST_TAG,
	OPT_TAG,
	name,
	render,
}: SuiteContext) => {
	test.describe(name("mode changes"), () => {
		test("reacts to data-multiple toggled at runtime", async ({ page }) => {
			const IS_ANDROID = test.info().project.name === "Mobile Chrome";
			const multiselectable = `${IS_ANDROID ? "data" : "aria"}-multiselectable`;
			await render(page, { select: "tags" });
			await update(page, { items: [BERGEN] });
			const item = page.locator("u-combobox data");
			const select = page.locator("select");
			const list = page.locator(LIST_TAG);

			await expect(item).toHaveAttribute("hidden", "");
			await expect(select).not.toHaveAttribute("multiple");
			await expect(list).toHaveAttribute(multiselectable, "false");

			await update(page, { multiple: true }); // Framework toggles the attribute
			await expect(item).not.toHaveAttribute("hidden");
			await expect(select).toHaveAttribute("multiple", "");
			await expect(list).toHaveAttribute(multiselectable, "true");

			await update(page, { multiple: false });
			await expect(item).toHaveAttribute("hidden", "");
			await expect(select).not.toHaveAttribute("multiple");
		});

		test("mirrors only the first item in single mode, keeping the rest for multiple mode", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				form: true,
				select: "tags",
				items: [OSLO, BERGEN],
			});
			const input = page.locator("#input");
			const options = page.locator(`${LIST_TAG} ${OPT_TAG}`); // Scoped, as the mirrored <select> also holds <option>
			const getAll = () =>
				page.evaluate(() =>
					new FormData(
						document.getElementById("form") as HTMLFormElement,
					).getAll("tags"),
				);

			await expect.poll(getAll).toEqual(["oslo-id", "Bergen"]);
			await expect(options.nth(1)).toHaveAttribute("selected");

			await update(page, { multiple: false });
			await expect(input).toHaveValue("Oslo"); // Input mirrors the first item
			await expect.poll(getAll).toEqual(["oslo-id"]); // So must the form value
			await expect(page.locator("select option")).toHaveCount(1);
			await expect(options.nth(0)).toHaveAttribute("selected");
			await expect(options.nth(1)).not.toHaveAttribute("selected"); // Single select can only have one selected option
			await expect(page.locator("u-combobox data")).toHaveCount(2); // Items are kept

			await update(page, { multiple: true });
			await expect.poll(getAll).toEqual(["oslo-id", "Bergen"]); // Switching back is lossless
			await expect(options.nth(1)).toHaveAttribute("selected");

			await update(page, { multiple: false });
			await input.fill("Bergen"); // Bergen is a kept <data> from multiple mode, but not the mirrored item
			await input.press("Enter");
			await expect(page.locator("u-combobox data").first()).toHaveText(
				"Bergen",
			); // Replaces the item instead of being ignored as already selected. Single mode drops every <data> before adding, so uncontrolled mode now holds one Bergen like controlled mode renders from state
			await expect(page.locator("u-combobox data")).toHaveCount(1);
			await expect(input).toHaveValue("Bergen");
			await expect.poll(getAll).toEqual(["Bergen"]); // Form value mirrors the first item only
		});

		test("leaves no item when removing after switching from multiple to single mode", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				select: "tags",
				clear: true,
				items: [OSLO, BERGEN],
			});
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const options = page.locator("select option");

			await update(page, { multiple: false });
			await expect(input).toHaveValue("Oslo");
			await input.click();
			await page.locator('button[type="reset"]').click();
			await expect(items).toHaveCount(0); // Bergen must not become the item
			await expect(input).toHaveValue("");
			await expect(options).toHaveCount(0);

			await update(page, { multiple: true, items: [OSLO, BERGEN] });
			await update(page, { multiple: false });
			await input.fill("");
			await input.press("Enter"); // Empty commit removes the item
			await expect(items).toHaveCount(0);
			await expect(input).toHaveValue("");

			await update(page, { multiple: true, items: [OSLO, BERGEN] });
			await update(page, { multiple: false });
			await input.fill("");
			await input.blur(); // Empty blur removes the item
			await expect(items).toHaveCount(0);
			await expect(input).toHaveValue("");
		});

		test("restores item text in input when switching from multiple to single mode", async ({
			page,
		}) => {
			await render(page, { items: [BERGEN] });
			const input = page.locator("input");
			await expect(input).toHaveValue("Bergen");

			await update(page, { multiple: true });
			await input.fill("ber"); // Filter text is kept in multiple mode
			await expect(input).toHaveValue("ber");

			await update(page, { multiple: false }); // Item text is unchanged, but input must still sync
			await expect(input).toHaveValue("Bergen");
		});

		test("keeps typed text when data-creatable is toggled in single mode", async ({
			page,
		}) => {
			await render(page, { items: [BERGEN] });
			const input = page.locator("input");
			const item = page.locator("u-combobox data");
			await expect(input).toHaveValue("Bergen");

			await input.click();
			await input.fill("ber"); // Typed query must survive a mode change that does not affect single/multiple
			await update(page, { creatable: true });
			await expect(input).toHaveValue("ber");
			await expect(item).toHaveText("Bergen");

			await update(page, { creatable: false });
			await expect(input).toHaveValue("ber");

			await update(page, { items: [] }); // No item must not clear the typed query either
			await input.fill("tro");
			await update(page, { creatable: true });
			await expect(input).toHaveValue("tro");
		});
	});
};
