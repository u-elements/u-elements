// Toggle and clear buttons. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { afterRendered, docLogged, resetDocLog } from "../../suite";
import { expect, test } from "../../test";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const buttonsTests = ({
	LIST_TAG,
	IS_NATIVE,
	name,
	render,
}: SuiteContext) => {
	test.describe(name("toggle button"), () => {
		test("is hidden with native datalist, opens and closes u-datalist", async ({
			page,
		}) => {
			await render(page, { toggle: true });
			const input = page.locator("#input");
			const toggle = page.locator("button[aria-expanded]");
			const list = page.locator(LIST_TAG);

			if (IS_NATIVE) {
				await expect(toggle).toHaveAttribute("hidden", "");
				await expect(toggle).toHaveAttribute("aria-expanded", "false");
				await input.fill("B");
				await expect(toggle).toHaveAttribute("hidden", "");
				await expect(toggle).toHaveAttribute("aria-expanded", "false");
				return;
			}

			await expect(toggle).not.toHaveAttribute("hidden");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await toggle.click();
			await expect(list).not.toHaveAttribute("hidden");
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			await expect(input).toBeFocused();

			await toggle.click();
			await expect(list).toHaveAttribute("hidden", "");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await expect(input).toBeFocused();
		});

		test("stays visible with typed text, and yields to the clear button", async ({
			page,
		}) => {
			test.skip(IS_NATIVE, "Toggle is hidden with native datalist");
			await render(page, { toggle: true });
			const input = page.locator("#input");
			const toggle = page.locator("button[aria-expanded]");

			await input.fill("Ber");
			await expect(toggle).not.toHaveAttribute("hidden"); // No clear button, so the toggle is the only control

			await update(page, { clear: true }); // Clear button added while there is text
			await expect(page.locator('button[type="reset"]')).not.toHaveAttribute(
				"hidden",
			);
			await expect(toggle).toHaveAttribute("hidden", ""); // Clear takes the place of the toggle

			await input.fill("");
			await expect(toggle).not.toHaveAttribute("hidden");
		});

		test("opens and closes u-datalist on touch tap", async ({ page }) => {
			// A tap dispatches mousedown, mouseup and click together after touchend, so the close can not rely on the blur from mousedown
			test.skip(IS_NATIVE, "Toggle is hidden with native datalist");
			test.skip(!test.info().project.use.hasTouch, "Needs a touchscreen");
			await render(page, { toggle: true });
			const input = page.locator("#input");
			const toggle = page.locator("button[aria-expanded]");
			const list = page.locator(LIST_TAG);
			const tap = async () => {
				const box = (await toggle.boundingBox()) as Record<string, number>;
				await page.touchscreen.tap(
					box.x + box.width / 2,
					box.y + box.height / 2,
				);
			};

			await tap();
			await expect(list).not.toHaveAttribute("hidden");
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			await expect(input).toBeFocused();

			await tap();
			await expect(list).toHaveAttribute("hidden", "");
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
			await expect(input).toHaveAttribute("aria-expanded", "false");
			await expect(input).toBeFocused();
		});

		test("opens u-datalist on programmatic click", async ({ page }) => {
			test.skip(IS_NATIVE, "Toggle is hidden with native datalist");
			await render(page, { toggle: true });
			const toggle = page.locator("button[aria-expanded]");
			const list = page.locator(LIST_TAG);

			await expect(list).toHaveAttribute("hidden", "");
			await toggle.evaluate((el) => (el as HTMLElement).click()); // No pointerdown, so live state must be used
			await expect(list).not.toHaveAttribute("hidden");
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			await expect(page.locator("#input")).toBeFocused();
		});

		test("opens on programmatic click after a drag out without a click", async ({
			page,
		}) => {
			test.skip(IS_NATIVE, "Toggle is hidden with native datalist");
			await render(page, { toggle: true });
			const input = page.locator("#input");
			const toggle = page.locator("button[aria-expanded]");
			const list = page.locator(LIST_TAG);

			await input.click(); // Open list
			await expect(list).not.toHaveAttribute("hidden");

			// Pointerdown on the input while open, then release outside so no click is dispatched inside <u-combobox>
			const box = (await input.boundingBox()) as Record<string, number>;
			await page.mouse.move(box.x + 5, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width + 200, box.y + 200);
			await page.mouse.up();
			await input.press("Escape");
			await expect(list).toHaveAttribute("hidden", "");

			await toggle.evaluate((el) => (el as HTMLElement).click()); // Must read live state, not the stale "was open" from the pointerdown
			await expect(list).not.toHaveAttribute("hidden");
			await expect(input).toBeFocused();
		});

		test("reads live list state after a mouse click that returned early", async ({
			page,
		}) => {
			test.skip(IS_NATIVE, "Toggle is hidden with native datalist");
			await render(page, { multiple: true, items: [BERGEN], toggle: true });
			const input = page.locator("#input");
			const item = page.locator("u-combobox data");
			const toggle = page.locator("button[aria-expanded]");
			const list = page.locator(LIST_TAG);

			await input.click(); // Open list
			await expect(list).not.toHaveAttribute("hidden");

			// Pointerdown captures "list was open", click re-routes to the chip and returns early
			const box = (await item.boundingBox()) as Record<string, number>;
			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
			await expect(item).toBeFocused();
			await expect(list).toHaveAttribute("hidden", ""); // Closed by focus leaving the input

			await toggle.evaluate((el) => (el as HTMLElement).click()); // Must not reuse stale pointerdown state
			await expect(list).not.toHaveAttribute("hidden");
			await expect(input).toBeFocused();
		});
	});

	test.describe(name("clear button"), () => {
		test("removes item in single mode and dispatches change once, and none when a prevented removal reverts the text", async ({
			page,
		}) => {
			await render(page, { clear: true, items: [BERGEN] });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const clear = page.locator('u-combobox button[type="reset"]');

			await expect(input).toHaveValue("Bergen");
			await resetDocLog(page);
			await clear.click();
			await expect(input).toHaveValue("");
			await expect(items).toHaveCount(0);
			await afterRendered(page); // The commit is settled after the render opportunity in controlled mode
			expect(await docLogged(page, "input")).toEqual([""]);
			expect(await docLogged(page, "change")).toEqual([""]); // Committed once, after the removal

			await update(page, { controlled: "manual", items: [OSLO] }); // Rejects every removal
			await expect(input).toHaveValue("Oslo");
			await resetDocLog(page);
			await clear.click();
			await expect(input).toHaveValue("Oslo"); // Reverted to the text before the clear
			await expect(items).toHaveCount(1);
			await afterRendered(page);
			expect(await docLogged(page, "input")).toEqual(["", "Oslo"]); // Emptied, then reverted
			expect(await docLogged(page, "change")).toEqual([]); // The text ends up unchanged, so no change
		});

		test("is reachable with Tab, reverts tabindex after, and does not reopen the list when activated with Enter", async ({
			page,
		}) => {
			const IS_ANDROID = test.info().project.name === "Mobile Chrome"; // u-datalist opens on focus in Android
			await render(page, { multiple: true, clear: true });
			const input = page.locator("#input");
			const clear = page.locator('button[type="reset"]');
			const list = page.locator(LIST_TAG);

			await input.click();
			await input.pressSequentially("abc"); // Keydown opens <u-datalist>, so Tab also closes it
			if (!IS_NATIVE) await expect(list).not.toHaveAttribute("hidden");
			await input.press("Tab");
			await expect(clear).toBeFocused();
			if (!IS_NATIVE) await expect(list).toHaveAttribute("hidden", ""); // Closed by focus leaving the input
			await expect(clear).toHaveAttribute("tabindex", "0"); // Must survive the sync triggered by the list closing
			await expect(clear).toHaveAttribute("aria-hidden", "false");

			await clear.press("Enter"); // Programmatic click, no pointerdown
			await expect(input).toHaveValue("");
			await expect(input).toBeFocused();
			await expect(clear).toHaveAttribute("tabindex", "-1");
			await expect(clear).toHaveAttribute("hidden", "");
			if (!IS_NATIVE && !IS_ANDROID)
				await expect(list).toHaveAttribute("hidden", ""); // Live state was closed, so it stays closed
		});
	});
};
