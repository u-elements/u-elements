import { expect, test } from "@playwright/test";
import type { UHTMLComboboxElement } from "./u-combobox";

const setCaretStart = (input: HTMLInputElement) => {
	input.selectionStart = input.selectionEnd = 0; // Set caret to start of text
};

test.beforeEach(async ({ page }) => {
	await page.goto("index.html");
	await page.evaluate(() => {
		document.body.innerHTML = `
			<label for="my-tags">My label</label>
			<u-combobox data-multiple>
				<data>Tag 1</data>
				<data>Tag 2</data>
				<data value="tag-3">Tag 3</data>
				<input id="my-tags" list="my-list" />
				<u-datalist id="my-list">
					<u-option>Tag 1</u-option>
					<u-option>Tag 2</u-option>
					<u-option value="tag-3">Tag 3</u-option>
					<u-option value="tag-4">Tag 4</u-option>
					<u-option>Tag 5</u-option>
				</u-datalist>
			</u-combobox>
		`;
	});
});

test.describe("u-combobox", () => {
	test("matches snapshot", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = "<u-combobox></u-combobox>";
		});
		expect(await page.locator("body").innerHTML()).toMatchSnapshot(
			"u-combobox",
		);
	});

	test("is is defined", async ({ page }) => {
		const uCombobox = page.locator("u-combobox");
		const instance = await uCombobox.evaluate(
			(el) => el instanceof (customElements.get("u-combobox") as never),
		);

		expect(instance).toBeTruthy();
		await expect(uCombobox).toBeAttached();
	});

	test("sets up properties", async ({ page }) => {
		expect(
			await page.evaluate<boolean>(() => {
				const uCombobox =
					document.querySelector<UHTMLComboboxElement>("u-combobox");
				const input = document.querySelector("input");
				const items = document.querySelectorAll("u-combobox data");

				return (
					uCombobox?.control === input &&
					[...uCombobox.items].every((item, index) => item === items[index])
				);
			}),
		).toBe(true);
	});

	test("sets up attributes", async ({ page }) => {
		const browser = test.info().project.name;
		const IS_IOS = browser === "Mobile Safari";
		const IS_ANDROID = browser === "Mobile Chrome";

		const uDatalist = page.locator("u-datalist");
		const uOption = page.locator("u-option");
		const input = page.locator("input");
		const items = page.locator("data");
		const itemsCount = await items.count();
		const inputDesctipion = `Navigate left to find ${itemsCount} selected`;

		await expect(input).toHaveAttribute("aria-description", inputDesctipion);
		await expect(uDatalist).toHaveAttribute(
			`${IS_ANDROID ? "data" : "aria"}-multiselectable`,
			"true",
		);

		await expect(uOption.nth(0)).toHaveAttribute("selected");
		await expect(uOption.nth(1)).toHaveAttribute("selected");
		await expect(uOption.nth(2)).toHaveAttribute("selected");
		await expect(uOption.nth(3)).not.toHaveAttribute("selected");
		await expect(items.nth(0)).toHaveAttribute("value", "Tag 1");
		await expect(items.nth(1)).toHaveAttribute("value", "Tag 2");
		await expect(items.nth(2)).toHaveAttribute("value", "tag-3");

		for (let i = 0; i < itemsCount; i++) {
			const item = items.nth(i);
			const label = `Tag ${i + 1}, Press to remove${IS_IOS ? `, ${i + 1} of ${itemsCount}` : ""}`;

			await expect(item).toHaveAttribute("role", "option");
			await expect(item).toHaveAttribute("tabindex", "-1");
			await expect(item).toHaveAttribute("aria-label", label);
		}
	});

	test("responds on focus and blur", async ({ page }) => {
		const input = page.locator("input");
		const live = page.locator("[aria-live]");

		await expect(live).not.toBeAttached();
		await input.focus();
		await expect(live).toBeAttached();
	});

	test("handles keyboard arrow navigation", async ({ page }) => {
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.pressSequentially("Test");
		await expect(input).toBeFocused();
		await expect(input).toHaveValue("Test");
		await input.evaluate<void, HTMLInputElement>(setCaretStart);

		await input.press("ArrowRight"); // Move caret into text
		await input.press("ArrowLeft"); // Move caret back to start of text
		await expect(input).toBeFocused(); // Input should therefore still be focused

		await input.press("ArrowLeft");
		await expect(items.nth(2)).toBeFocused();

		await items.nth(2).press("ArrowLeft");
		await expect(items.nth(1)).toBeFocused();

		await items.nth(1).press("ArrowLeft");
		await expect(items.nth(0)).toBeFocused();

		await items.nth(0).press("ArrowLeft");
		await expect(items.nth(0)).toBeFocused(); // Should not cycle, so staying on 0 is correct

		await items.nth(0).press("ArrowRight");
		await expect(items.nth(1)).toBeFocused();

		await items.nth(1).press("ArrowRight");
		await expect(items.nth(2)).toBeFocused();

		await items.nth(2).press("ArrowRight");
		await expect(input).toBeFocused();
	});

	test("handles keyboard typing", async ({ page }) => {
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.pressSequentially("Test");
		await input.selectText();
		await input.press("Backspace");
		await expect(input).toHaveValue("");
		await expect(input).toBeFocused(); // Should move focus as all backspaces should delete value "Test"

		await input.press("ArrowRight");
		await expect(input).toBeFocused(); // Should not cycle, so staying on input is correct

		await input.evaluate<void, HTMLInputElement>(setCaretStart);
		await input.press("Backspace");
		await expect(items.nth(2)).toBeFocused();

		await items.nth(2).press("Backspace");
		await expect(items.nth(2)).not.toBeAttached();
		await expect(items.nth(1)).toBeFocused();
	});

	test("handles keyboard creation and removal", async ({ page }) => {
		const input = page.locator("input");
		const live = page.locator("[aria-live='assertive']");
		const item2 = page.locator("data").nth(2);
		const item3 = page.locator("data").nth(3);

		await input.focus();
		await expect(live).toBeAttached();

		await input.focus();
		await input.fill("Tag 4");
		await input.press("Enter");
		await expect(item3).toBeAttached();
		await expect(item3).toHaveAttribute("value", "tag-4");
		await expect(item3).toHaveAttribute("role", "option");
		await expect(item3).toHaveAttribute("tabindex", "-1");
		await expect(item3).toHaveText("Tag 4");
		await expect(input).toBeFocused();

		await input.evaluate<void, HTMLInputElement>(setCaretStart);
		await input.press("ArrowLeft");
		await item3.press("Enter");
		await expect(item3).not.toBeAttached();
		await expect(item2).toBeFocused();
	});

	// TODO: Does not make announcements when blurred
	// TODO: Makes announcements when focused
	// TODO: Does not obstruct datalist keyboard navigation
	// TODO: Focus item on click
	// TODO: Remove item on x-click
	// TODO: Remove item on keyboard click (space / enter)
	// TODO: Focus input when clicking u-combobox
	// TODO: Focus input when clicking related label
	// TODO: Handles multiple u-combobox on same page
	// TODO: Handles click on option in datalist
	// TODO: Handles clear button, and to not reset form
	// TODO: Handles clear button with <del> element
	// TODO: These tests are AI-generated and need to be verified and improved:
	// test("does not make announcements when blurred", async ({ page }) => {
	// 	const input = page.locator("input");
	// 	const live = page.locator("[aria-live='assertive']");

	// 	await input.focus();
	// 	await expect(live).toBeAttached();
	// 	await input.blur();
	// 	await expect(live).not.toBeAttached();
	// });

	// test("makes announcements when focused", async ({ page }) => {
	// 	const input = page.locator("input");
	// 	const live = page.locator("[aria-live='assertive']");

	// 	await input.focus();
	// 	await expect(live).toBeAttached();
	// });

	// test("does not obstruct datalist keyboard navigation", async ({ page }) => {
	// 	const input = page.locator("input");
	// 	await input.focus();
	// 	await input.fill("Tag");
	// 	await input.press("ArrowDown");
	// 	// Should not throw or lose focus, and datalist should be accessible
	// 	await expect(input).toBeFocused();
	// });

	// test("focuses item on click", async ({ page }) => {
	// 	const items = page.locator("data");
	// 	await items.nth(1).click();
	// 	await expect(items.nth(1)).toBeFocused();
	// });

	// test("removes item on x-click", async ({ page }) => {
	// 	const items = page.locator("data");
	// 	const initialCount = await items.count();
	// 	await items.nth(0).click();
	// 	await expect(items).toHaveCount(initialCount - 1);
	// });

	// test("removes item on keyboard click (space / enter)", async ({ page }) => {
	// 	const items = page.locator("data");
	// 	await items.nth(0).focus();
	// 	await items.nth(0).press(" ");
	// 	await expect(items.nth(0)).not.toBeAttached();
	// });

	// test("focuses input when clicking u-combobox", async ({ page }) => {
	// 	const combobox = page.locator("u-combobox");
	// 	const input = page.locator("input");
	// 	await combobox.click();
	// 	await expect(input).toBeFocused();
	// });

	// test("focuses input when clicking related label", async ({ page }) => {
	// 	const label = page.locator("label[for='my-tags']");
	// 	const input = page.locator("input");
	// 	await label.click();
	// 	await expect(input).toBeFocused();
	// });

	// test("handles multiple u-combobox on same page", async ({ page }) => {
	// 	await page.evaluate(() => {
	// 		document.body.innerHTML += `
	// 			<u-combobox id="second">
	// 				<data>Second 1</data>
	// 				<input />
	// 				<u-datalist>
	// 					<u-option>Second 1</u-option>
	// 					<u-option>Second 2</u-option>
	// 				</u-datalist>
	// 			</u-combobox>
	// 		`;
	// 	});
	// 	const firstInput = page.locator("u-combobox").first().locator("input");
	// 	const secondInput = page.locator("#second input");
	// 	await firstInput.focus();
	// 	await expect(firstInput).toBeFocused();
	// 	await secondInput.focus();
	// 	await expect(secondInput).toBeFocused();
	// });

	// test("handles click on option in datalist", async ({ page }) => {
	// 	const input = page.locator("input");
	// 	const datalist = page.locator("u-datalist");
	// 	const option = datalist.locator("u-option").nth(3);

	// 	await input.focus();
	// 	await input.fill("Tag 4");
	// 	await option.click();
	// 	const items = page.locator("data");
	// 	await expect(items.nth(3)).toHaveText("Tag 4");
	// });

	// test("handles clear button, and does not reset form", async ({ page }) => {
	// 	const input = page.locator("input");
	// 	const clear = page.locator('button[type="reset"], del');
	// 	await input.fill("Tag 5");
	// 	await clear.click();
	// 	await expect(input).toHaveValue("");
	// });

	// test("handles clear button with <del> element", async ({ page }) => {
	// 	await page.evaluate(() => {
	// 		const combobox = document.querySelector("u-combobox");
	// 		const del = document.createElement("del");
	// 		combobox?.appendChild(del);
	// 	});
	// 	const input = page.locator("input");
	// 	const del = page.locator("u-combobox del");
	// 	await input.fill("Tag 5");
	// 	await del.click();
	// 	await expect(input).toHaveValue("");
	// });
});

// TODO: Test single mode syncs value when changing/adding/removing item
