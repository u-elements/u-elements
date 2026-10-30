// Setup: attributes, buttons and several instances on one page. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { expect, test } from "../../test";
import type { UHTMLComboboxElement } from "../u-combobox";
import { ITEMS } from "../u-combobox.harness";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const setupTests = ({
	LIST_TAG,
	OPT_TAG,
	IS_NATIVE,
	name,
	render,
	selectOption,
}: SuiteContext) => {
	test.describe(name("setup"), () => {
		test("is defined and exposes control, list, items and values", async ({
			page,
		}) => {
			await render(page, { multiple: true, items: ITEMS });
			expect(
				await page
					.locator("u-combobox")
					.evaluate((el: UHTMLComboboxElement) => {
						const items = el.querySelectorAll("data");
						return (
							el instanceof (customElements.get("u-combobox") as never) &&
							el.control === el.querySelector("input") &&
							el.list === el.querySelector("datalist,u-datalist") &&
							el.items.length === items.length &&
							[...el.items].every((item, index) => item === items[index]) &&
							el.values.join() === "oslo-id,Bergen,Trondheim"
						);
					}),
			).toBe(true);
		});

		test("sets up attributes on input, items and options", async ({ page }) => {
			const { name } = test.info().project;
			const IS_ANDROID = name === "Mobile Chrome";
			await render(page, { multiple: true, items: [OSLO, BERGEN] });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const opts = page.locator(OPT_TAG);

			await expect(input).toHaveAttribute(
				"aria-description",
				"Navigate left to find 2 selected",
			);
			await expect(input).toHaveAttribute("list", "input-list");
			await expect(page.locator(LIST_TAG)).toHaveAttribute(
				`${IS_ANDROID ? "data" : "aria"}-multiselectable`,
				"true",
			);
			await expect(opts.nth(0)).toHaveAttribute("selected");
			await expect(opts.nth(1)).toHaveAttribute("selected");
			await expect(opts.nth(2)).not.toHaveAttribute("selected");
			await expect(items.nth(0)).toHaveAttribute("value", "oslo-id");
			await expect(items.nth(1)).toHaveAttribute("value", "Bergen");

			for (const [index] of ["Oslo", "Bergen"].entries()) {
				const item = items.nth(index);
				await expect(item).toHaveAttribute("role", "option");
				await expect(item).toHaveAttribute("tabindex", "-1");
				await expect(item).toHaveAttribute("slot", "items");
			}
		});

		test("sets up attributes on clear and toggle buttons added dynamically", async ({
			page,
		}) => {
			const { name } = test.info().project;
			const ariaHidden = `${name === "Mobile Safari" || name === "Mobile Chrome"}`;
			await render(page);
			const clear = page.locator('button[type="reset"]');
			const toggle = page.locator("button[aria-expanded]");

			await update(page, { clear: true, toggle: true }); // Rendered by the framework after mount

			await expect(clear).toHaveAttribute("aria-hidden", ariaHidden);
			await expect(clear).toHaveAttribute("hidden", "");
			await expect(clear).toHaveAttribute("tabindex", "-1");

			await expect(toggle).toHaveAttribute("aria-hidden", ariaHidden);
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await expect(toggle).toHaveAttribute("tabindex", "-1");
			await expect(toggle).toHaveAttribute("type", "button");
			if (IS_NATIVE) await expect(toggle).toHaveAttribute("hidden", "");
			else await expect(toggle).not.toHaveAttribute("hidden");
		});

		test("shows and hides clear button when bound value changes", async ({
			page,
		}) => {
			await render(page, { clear: true });
			const input = page.locator("#input");
			const clear = page.locator('button[type="reset"]');

			await expect(clear).toHaveAttribute("hidden", "");
			await update(page, { value: "Programmatic" }); // Framework writes input.value
			await expect(input).toHaveValue("Programmatic");
			await expect(clear).not.toHaveAttribute("hidden");

			await update(page, { value: "" });
			await expect(input).toHaveValue("");
			await expect(clear).toHaveAttribute("hidden", "");
		});

		test("handles multiple u-combobox on same page", async ({ page }) => {
			await render(page, [
				{ multiple: true, items: [BERGEN] },
				{
					id: "second",
					clear: true,
					options: [{ text: "Second 1" }, { text: "Second 2" }],
				},
			]);
			await update(
				page,
				{ items: [{ value: "Second 1", label: "Second 1" }] },
				1,
			);
			const firstInput = page.locator("#input");
			const secondInput = page.locator("#second");
			const firstData = page.locator("u-combobox:has(#input) data");
			const secondData = page.locator("u-combobox:has(#second) data");

			await expect(secondInput).toHaveValue("Second 1");
			await secondInput.focus();
			await page
				.locator('u-combobox:has(#second) button[type="reset"]')
				.click();
			await expect(secondData).toHaveCount(0);
			await expect(secondInput).toHaveValue("");
			await expect(firstData).toHaveText(["Bergen"]); // Other instance untouched

			await firstInput.focus();
			await expect(firstInput).toBeFocused();
		});

		test("keeps typed text and picks isolated between u-combobox on same page", async ({
			page,
		}) => {
			await render(page, [
				{ multiple: true },
				{
					id: "second",
					multiple: true,
					options: [{ text: "Second 1" }, { text: "Second 2" }],
				},
			]);
			const first = page.locator("#input");
			const second = page.locator("#second");
			const firstData = page.locator("u-combobox:has(#input) data");
			const secondData = page.locator("u-combobox:has(#second) data");
			const firstOpts = page.locator(`u-combobox:has(#input) ${OPT_TAG}`);
			const secondOpts = page.locator(`u-combobox:has(#second) ${OPT_TAG}`);

			await first.click();
			await first.fill("Ber");
			await first.blur(); // Close the list before moving on, as <u-datalist> does not open on a click that moves focus straight from another open list
			await second.click();
			await second.fill("Sec");
			await selectOption(second, secondOpts.filter({ hasText: "Second 1" }));
			await expect(secondData).toHaveText(["Second 1"]);
			await expect(second).toHaveValue("Sec"); // Reverted to its own typed text
			await expect(firstData).toHaveCount(0); // Other instance untouched by the pick
			await expect(first).toHaveValue("Ber"); // Other instance untouched by the typing

			await second.blur();
			await first.click();
			await selectOption(first, firstOpts.filter({ hasText: "Bergen" }));
			await expect(firstData).toHaveText(["Bergen"]);
			await expect(first).toHaveValue("Ber"); // Reverted to its own cached text, not to text typed in the other instance
			await expect(secondData).toHaveText(["Second 1"]);
			await expect(second).toHaveValue("Sec");
		});

		test("focuses input when clicking host or label", async ({ page }) => {
			await render(page, { multiple: true }); // No items, as a chip at the click point would receive the click instead
			const input = page.locator("#input");

			await page.locator("u-combobox").click();
			await expect(input).toBeFocused();
			await input.blur();
			await page.locator('label[for="input"]').click();
			await expect(input).toBeFocused();
		});
	});
};
