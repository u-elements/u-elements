// Keyboard: IME composition, item navigation, removal and key repeat. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { logged, resetLog, settled } from "../../suite";
import { expect, test } from "../../test";
import type { UHTMLComboboxElement } from "../u-combobox";
import { ITEMS } from "../u-combobox.harness";
import { BERGEN, OSLO, type SuiteContext, setCaretStart } from "./context";

export const keyboardTests = ({
	OPT_TAG,
	IS_NATIVE,
	name,
	render,
}: SuiteContext) => {
	test.describe(name("keyboard"), () => {
		test("Backspace works in type=email where selection is unsupported", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				items: [BERGEN],
				inputAttrs: { type: "email" },
			});
			const input = page.locator("#input");

			await input.pressSequentially("ab");
			await input.press("Backspace");
			await expect(input).toHaveValue("a");
			await expect(input).toBeFocused();
			await input.press("ArrowLeft");
			await expect(input).toBeFocused();
		});

		test("ignores Enter while composing with an IME", async ({ page }) => {
			await render(page, { creatable: true });
			await resetLog(page, "comboboxbeforematch");
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const composingEnter = (el: Element, init: KeyboardEventInit) =>
				el.dispatchEvent(
					new KeyboardEvent("keydown", {
						bubbles: true,
						cancelable: true,
						key: "Enter",
						...init,
					}),
				);

			await input.click();
			await input.fill("Custom");
			if (!IS_NATIVE) await input.press("ArrowDown"); // Activate an option in <u-datalist>, which Enter would otherwise pick
			await input.evaluate(composingEnter, { isComposing: true }); // Confirming a composition, as in Firefox and Safari
			await input.evaluate(composingEnter, { keyCode: 229 }); // As in Chrome, where isComposing can be false with keyCode 229
			await settled(page); // Give a wrongly handled Enter its chance to surface
			await expect(items).toHaveCount(0);
			await expect(input).toHaveValue("Custom");
			expect(await logged(page, "comboboxbeforematch")).toEqual([]);
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);

			await input.press("Enter"); // A real Enter commits
			await expect(items).toHaveCount(1);
		});

		test("navigates between items and input with arrow keys", async ({
			page,
		}) => {
			await render(page, { multiple: true, items: ITEMS });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.focus();
			await input.pressSequentially("Test");
			await expect(input).toHaveValue("Test");
			await input.evaluate(setCaretStart);
			await input.press("ArrowRight"); // Move caret into text
			await input.press("ArrowLeft"); // Move caret back to start
			await expect(input).toBeFocused(); // Caret was not at start when pressed, so focus stays

			await input.press("ArrowLeft");
			await expect(items.nth(2)).toBeFocused();
			await items.nth(2).press("ArrowLeft");
			await expect(items.nth(1)).toBeFocused();
			await items.nth(1).press("ArrowLeft");
			await expect(items.nth(0)).toBeFocused();
			await items.nth(0).press("ArrowLeft");
			await expect(items.nth(0)).toBeFocused(); // No cycling
			await items.nth(0).press("ArrowRight");
			await expect(items.nth(1)).toBeFocused();
			await items.nth(1).press("ArrowRight");
			await expect(items.nth(2)).toBeFocused();
			await items.nth(2).press("ArrowRight");
			await expect(input).toBeFocused();
		});

		test("deletes text without moving focus, and focuses last item on Backspace at start", async ({
			page,
		}) => {
			await render(page, { multiple: true, items: ITEMS });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.focus();
			await input.pressSequentially("Test");
			await input.selectText();
			await input.press("Backspace");
			await expect(input).toHaveValue("");
			await expect(input).toBeFocused(); // Selection end was not at start, so focus stays

			await input.press("ArrowRight");
			await expect(input).toBeFocused(); // No cycling from input

			await input.evaluate(setCaretStart);
			await input.press("Backspace");
			await expect(items.nth(2)).toBeFocused();
			await items.nth(2).press("Backspace");
			await expect(items).toHaveCount(2);
			await expect(items.nth(1)).toBeFocused();
		});

		test("removes item with Space, Enter and click", async ({ page }) => {
			await render(page, { multiple: true, items: ITEMS });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await expect(items).toHaveCount(3);
			await items.nth(1).focus();
			await items.nth(1).press(" ");
			await expect(items).toHaveCount(2);
			await expect(items.nth(0)).toBeFocused(); // Previous item
			await items.nth(0).press("Enter");
			await expect(items).toHaveCount(1);
			await expect(items.nth(0)).toBeFocused(); // Next item, as there was no previous
			await items.nth(0).evaluate((el) => (el as HTMLElement).click());
			await expect(items).toHaveCount(0);
			await expect(input).toBeFocused(); // Input, as no items are left
		});

		test("keeps item and moved focus after a prevented removal", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				controlled: "manual",
				items: ITEMS,
			}); // Rejects every removal
			await resetLog(page, "comboboxbeforeselect");
			const items = page.locator("u-combobox data");

			await items.nth(1).focus();
			await items.nth(1).press("Backspace");
			await expect(items).toHaveCount(3); // Prevented
			await expect(items.nth(0)).toBeFocused(); // Focus moved to the previous item before the select
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

			await items.nth(0).press("Enter");
			await expect(items).toHaveCount(3);
			await expect(items.nth(1)).toBeFocused(); // No previous, so the next item
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);
		});

		test("removes the pressed item when two items share a value", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				controlled: "manual",
				items: [OSLO, { value: "Bergen", label: "Bergen 1" }],
			}); // Rejects every removal, so the detail can be inspected while both items remain
			await page.locator("u-combobox").evaluate((el: UHTMLComboboxElement) => {
				// Inserted outside the framework, as frameworks keying items by value (i.e. Svelte) refuse a duplicate. No update follows, so no render reconciles it away
				const dupe = document.createElement("data");
				dupe.value = "Bergen";
				dupe.textContent = "Bergen 2";
				el.control?.insertAdjacentElement("beforebegin", dupe);
				el.addEventListener("comboboxbeforeselect", (event) => {
					const { detail } = event as CustomEvent<HTMLDataElement>;
					if (!window.__log) window.__log = {};
					if (!window.__log.detail) window.__log.detail = [];
					window.__log.detail.push(detail.textContent || ""); // Which of the equal-value items the component wants to remove
				});
			});
			const items = page.locator("u-combobox data");

			await items.nth(2).focus();
			await items.nth(2).press("Backspace");
			await expect(items.nth(1)).toBeFocused(); // Focus moved to the previous item of the pressed one, not of the first with that value
			expect(await logged(page, "detail")).toEqual(["Bergen 2"]); // The pressed item, not the first item with that value

			await items.nth(1).press("Backspace");
			await expect(items.nth(0)).toBeFocused();
			expect(await logged(page, "detail")).toEqual(["Bergen 2", "Bergen 1"]);
		});

		test("does not obstruct datalist keyboard navigation", async ({ page }) => {
			await render(page, { multiple: true });
			const input = page.locator("#input");

			await input.focus();
			await input.press("ArrowDown");
			await expect(input).toBeFocused();
			if (!IS_NATIVE)
				await expect(page.locator(OPT_TAG).nth(0)).toHaveAttribute(
					"data-activedescendant",
				);
		});

		test("does not remove item on repeated Backspace", async ({ page }) => {
			await render(page, { multiple: true, items: [BERGEN, OSLO] });
			const items = page.locator("u-combobox data");
			const item = items.nth(1);

			await item.focus();
			await item.evaluate((el) =>
				el.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "Backspace",
						repeat: true,
						bubbles: true,
					}),
				),
			);
			await expect(items).toHaveCount(2);
			await item.press("Backspace");
			await expect(items).toHaveCount(1);
			await expect(items.first()).toBeFocused();
		});

		test("removes one item on held Enter or Space", async ({ page }) => {
			// Removal moves focus to the previous item, so a repeat would remove that one too, cascading through all items
			await render(page, { multiple: true, items: ITEMS });
			const items = page.locator("u-combobox data");

			await items.nth(2).focus();
			await page.keyboard.down("Enter");
			await page.keyboard.down("Enter"); // repeat: true
			await page.keyboard.down("Enter");
			await page.keyboard.up("Enter");
			await expect(items).toHaveCount(2);
			await expect(items.nth(1)).toBeFocused();

			await page.keyboard.down(" ");
			await page.keyboard.down(" "); // repeat: true
			await page.keyboard.up(" ");
			await expect(items).toHaveCount(1);
			await expect(items.nth(0)).toBeFocused();
		});
	});
};
