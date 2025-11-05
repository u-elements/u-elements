import { expect, test } from "@playwright/test";
import type { UHTMLComboboxElement } from "./u-combobox";

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
		const uDatalist = page.locator("u-datalist");
		const uOption = page.locator("u-option");
		const input = page.locator("input");
		const items = page.locator("data");
		const itemsCount = await items.count();
		const inputLabel = `My label, Navigate left to find ${itemsCount} selected${"\u{200B}".repeat(5)}`;

		await expect(input).toHaveAttribute("aria-label", inputLabel);
		await expect(uDatalist).toHaveAttribute("aria-multiselectable", "true");
		await expect(uOption.nth(0)).toHaveAttribute("selected");
		await expect(uOption.nth(1)).toHaveAttribute("selected");
		await expect(uOption.nth(2)).toHaveAttribute("selected");
		await expect(uOption.nth(3)).not.toHaveAttribute("selected");
		await expect(items.nth(0)).toHaveAttribute("value", "Tag 1");
		await expect(items.nth(1)).toHaveAttribute("value", "Tag 2");
		await expect(items.nth(2)).toHaveAttribute("value", "tag-3");

		for (let i = 0; i < itemsCount; i++) {
			const label = `Tag ${i + 1}, Press to remove, ${i + 1} of ${itemsCount}`;
			await expect(items.nth(i)).toHaveAttribute("role", "button");
			await expect(items.nth(i)).toHaveAttribute("tabindex", "-1");
			await expect(items.nth(i)).toHaveAttribute("aria-label", label);
		}
	});

	// Need another test, as live is no longer added and removed
	// test("responds on focus and blur", async ({ page }) => {
	// 	const input = page.locator("input");
	// 	const live = page.locator("[aria-live]");
	// 	const items0 = page.locator("data").nth(0);
	// 	const uOption0 = page.locator("u-option").nth(0);

	// 	await expect(live).not.toBeAttached();
	// 	await input.focus();
	// 	await expect(live).toBeAttached();
	// 	await items0.focus();
	// 	await expect(live).toBeAttached();
	// 	await uOption0.focus();
	// 	await expect(live).toBeAttached();
	// 	await input.focus();
	// 	await input.blur();
	// 	await expect(live).not.toBeAttached();
	// });

	test("handles keyboard arrow navigation", async ({ page }) => {
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.pressSequentially("Test");
		await expect(input).toBeFocused();
		await expect(input).toHaveValue("Test");
		await input.evaluate<void, HTMLInputElement>((input) => {
			input.selectionStart = input.selectionEnd = 0; // Set caret to start of text
		});

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

		await input.press("Backspace");
		await expect(items.nth(2)).toBeFocused();

		await items.nth(2).press("Backspace");
		await expect(items.nth(2)).not.toBeAttached();
		await expect(input).toBeFocused();
	});

	test("handles keyboard creation and removal", async ({ page }) => {
		const input = page.locator("input");
		const live = page.locator("[aria-live='assertive']");
		const item3 = page.locator("data").nth(3);

		await input.focus();
		await expect(live).toBeAttached();

		await input.focus();
		await input.fill("Tag 4");
		await input.press("Enter");
		await expect(item3).toBeAttached();
		await expect(item3).toHaveAttribute("value", "tag-4");
		await expect(item3).toHaveAttribute("role", "button");
		await expect(item3).toHaveAttribute("tabindex", "-1");
		await expect(item3).toHaveText("Tag 4");
		await expect(input).toBeFocused();

		await item3.focus();
		await item3.press("Enter");
		await expect(item3).not.toBeAttached();
		await expect(input).toBeFocused();
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
});
