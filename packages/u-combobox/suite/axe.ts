// Axe accessibility scans of each visual and interaction state. Part of the shared u-combobox suite, see ../u-combobox.suite.ts.
// Only runs in the vanilla browser projects, as the markup comes from the component and does not differ between frameworks
import type { Page } from "@playwright/test";
import { expectNoAxeViolations } from "../../suite";
import { expect, test } from "../../test";
import { type HarnessPatch, ITEMS } from "../u-combobox.harness";
import { BERGEN, OSLO, renderHarness, type SuiteContext } from "./context";

const scan = (page: Page) =>
	expectNoAxeViolations(page, "u-combobox", [
		"aria-allowed-role", // Axe does not allow <input> with list and role="combobox" in the same time
	]);

export const axeTests = ({
	IS_NATIVE,
	LIST_TAG,
	name,
	render,
}: SuiteContext) => {
	test.describe(name("axe"), () => {
		test("single mode without and with item", async ({ page }) => {
			await render(page);
			await scan(page);
			await render(page, { items: [BERGEN] });
			await expect(page.locator("#input")).toHaveValue("Bergen");
			await scan(page);
		});

		test("single mode with unmatched text", async ({ page }) => {
			await render(page);
			await page.locator("#input").fill("Nowhere");
			await scan(page);
		});

		for (const items of [[], [BERGEN], ITEMS]) {
			test(`multiple mode with ${items.length} items`, async ({ page }) => {
				await render(page, { multiple: true, items });
				await scan(page);
			});
		}

		test("multiple mode with focused item", async ({ page }) => {
			await render(page, { multiple: true, items: [OSLO, BERGEN] });
			const input = page.locator("#input");
			await input.focus();
			await input.press("ArrowLeft"); // Empty input, so the caret is at the start and focus moves to the last item
			await expect(page.locator("data").last()).toBeFocused();
			await scan(page);
		});

		test("open list with active option", async ({ page }) => {
			test.skip(IS_NATIVE, "Native datalist popup is not part of the DOM");
			await render(page, { toggle: true });
			const input = page.locator("#input");
			await input.focus();
			await input.press("ArrowDown"); // Opens the list and activates the first option
			await expect(page.locator(LIST_TAG)).not.toHaveAttribute("hidden");
			await scan(page);
		});

		test("open filtered list", async ({ page }) => {
			test.skip(IS_NATIVE, "Native datalist popup is not part of the DOM");
			await render(page, { nofilter: false });
			await page.locator("#input").pressSequentially("Ber");
			await expect(page.locator(LIST_TAG)).not.toHaveAttribute("hidden");
			await scan(page);
		});

		test("clear and toggle buttons, also with clear focused", async ({
			page,
		}) => {
			await render(page, { clear: true, toggle: true });
			const input = page.locator("#input");
			const clear = page.locator('button[type="reset"]');
			await scan(page);

			await input.fill("abc"); // Shows clear, hides toggle
			await expect(clear).not.toHaveAttribute("hidden");
			await scan(page);

			await input.press("Tab");
			await expect(clear).toHaveAttribute("aria-hidden", "false"); // Only exposed while focused
			await scan(page);
		});

		for (const attr of ["disabled", "readonly"]) {
			test(`${attr} input`, async ({ page }) => {
				await render(page, {
					multiple: true,
					items: [BERGEN],
					clear: true,
					toggle: true,
					inputAttrs: { [attr]: "" },
				});
				await scan(page);
			});
		}

		test("while announcing an added item", async ({ page }) => {
			await render(page, { multiple: true });
			const input = page.locator("#input");
			await input.fill("Bergen");
			await input.press("Enter");
			await expect(input).toHaveAttribute("aria-label", /Bergen/); // Temporary aria-label, reverted after 300ms
			await scan(page);
		});

		test("in form with mirrored select", async ({ page }) => {
			await render(page, {
				form: true,
				select: "city",
				multiple: true,
				items: [OSLO, BERGEN],
			});
			await scan(page);
		});

		// Axe only checks that a name exists, so assert the name itself. Regex, as the "." text node of #sr-items is part of the name
		test("names the items listbox", async ({ page }) => {
			await render(page, { multiple: true, items: [BERGEN] });
			await expect(page.locator("u-combobox")).toMatchAriaSnapshot(`
				- listbox /^Selected\\b/:
				  - option "Bergen, Press to remove"
			`);

			await page.addStyleTag({ content: 'body { --sr-items: "Valgte" }' }); // Translated through CSS
			await expect(page.locator("u-combobox")).toMatchAriaSnapshot(`
				- listbox /^Valgte\\b/:
				  - option "Bergen, Press to remove"
			`);
		});
	});
};

// Runs once, as the behaviour does not depend on the list tag
export const axeWithoutDatalistTests = (defaults: HarnessPatch) => {
	test.describe("axe without datalist", () => {
		for (const creatable of [false, true]) {
			test(`${creatable ? "creatable" : "not creatable"}`, async ({ page }) => {
				await renderHarness(
					page,
					{
						options: null,
						creatable,
						multiple: true,
						items: [BERGEN],
						clear: true,
					},
					defaults,
				);
				await page.locator("#input").fill("Hello");
				await scan(page);
			});
		}
	});
};
