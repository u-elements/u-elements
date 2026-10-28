// Announcements: --sr-* texts, the live region and aria-label announcements. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import type { Page } from "@playwright/test";
import { afterRendered, settled } from "../../suite";
import { expect, test } from "../../test";
import { ITEMS } from "../u-combobox.harness";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const announcementsTests = ({ name, render }: SuiteContext) => {
	test.describe(name("announcements"), () => {
		// The harness buttons have text content, so empty them to test the default naming of empty buttons
		const emptyButtons = (page: Page) =>
			page.evaluate(() => {
				for (const el of document.querySelectorAll("u-combobox > button"))
					el.textContent = "";
			});

		test("uses --sr-* custom properties for description, live region and buttons", async ({
			page,
		}) => {
			// Inherited, so a translation can be set once on an ancestor
			await page.addStyleTag({
				content: `body {
					--sr-added: "La til";
					--sr-clear: "Tøm";
					--sr-empty: "Ingen valgte";
					--sr-found: "%d valgt";
					--sr-toggle: 'Valg';
				}`,
			});
			await render(page, { multiple: true, clear: true, toggle: true });
			await emptyButtons(page);
			const input = page.locator("#input");
			const live = page.locator("[aria-live='assertive']");

			await expect(input).toHaveAttribute("aria-description", "Ingen valgte");
			await input.fill("Bergen");
			await input.press("Enter");
			await expect(live).toHaveText(/La til Bergen/);
			await expect(input).toHaveAttribute("aria-description", "1 valgt");
		});

		test("announces item changes only while focused", async ({ page }) => {
			await render(page, { multiple: true });
			const input = page.locator("#input");
			const live = page.locator("[aria-live='assertive']");

			await expect(live).not.toBeAttached();
			await input.focus();
			await expect(live).toBeAttached(); // Live region is created on focus
			await update(page, { items: [BERGEN] });
			await expect(live).toHaveText(/Added Bergen/);

			await input.blur();
			await expect(live).toHaveText(""); // Cleared after announcement
			await update(page, { items: [BERGEN, OSLO] });
			await settled(page); // The announcement is deferred with setTimeout
			await expect(live).toHaveText(""); // Nothing announced while blurred
		});

		test("restores aria-label after two item changes within the announcement delay", async ({
			page,
		}) => {
			await render(page, { multiple: true, items: ITEMS });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await expect(input).not.toHaveAttribute("aria-label");
			await items.nth(2).focus();
			// Both removals run in the page, so the second is guaranteed to land within the 300ms reset delay of the first
			const label = await page.evaluate(async () => {
				const tick = () => new Promise((r) => setTimeout(r, 50));
				const press = () =>
					document.activeElement?.dispatchEvent(
						new KeyboardEvent("keydown", {
							key: "Backspace",
							bubbles: true,
						}),
					);
				press(); // Removes Trondheim, focus moves to Bergen
				await tick(); // Let the removal render and announce
				press(); // Removes Bergen
				await tick();
				return document.getElementById("input")?.getAttribute("aria-label");
			});
			expect(label).toBe("Removed Bergen, Label"); // Not stacked on the previous announcement
			await expect(items).toHaveText(["Oslo"]);
			await expect(input).not.toHaveAttribute("aria-label"); // Restored once the last announcement has been read
		});

		test("announces a programmatic item change after a prevented removal moved focus", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				controlled: "manual",
				items: [BERGEN],
			}); // Rejects every select
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const live = page.locator("[aria-live='assertive']");

			await input.focus();
			await page.keyboard.press("ArrowLeft"); // Focus the item
			await expect(items.first()).toBeFocused();
			await page.keyboard.press("Enter"); // Asks to remove, moving focus to the input first
			await expect(input).toBeFocused();
			await expect(items).toHaveCount(1); // Prevented, so the item stays
			await afterRendered(page); // The focus move expires after the render opportunity

			await update(page, { items: [] }); // Later programmatic removal, i.e. after a confirm dialog
			await expect(live).toHaveText(/Removed Bergen/); // Announced through the live region, as no focus move belongs to this change
		});
	});
};
