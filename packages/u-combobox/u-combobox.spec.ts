import { expect, type Page, test } from "@playwright/test";
import type { UHTMLComboboxElement } from "./u-combobox";

const setCaretStart = (input: Node) => {
	(input as HTMLInputElement).selectionStart = (
		input as HTMLInputElement
	).selectionEnd = 0; // Set caret to start of text
};

const DEFAULT = `
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

const NO_LIST_SINGLE = `
			<label for="single">My label</label>
			<u-combobox data-creatable>
				<input id="single" />
				<button type="reset">Clear</button>
				<button type="button" aria-expanded="false">Toggle</button>
			</u-combobox>
		`;

const NO_LIST_MULTIPLE = `
			<label for="multi">My label</label>
			<u-combobox data-multiple data-creatable>
				<data>Tag 1</data>
				<input id="multi" />
				<button type="reset">Clear</button>
			</u-combobox>
		`;

const mount = async (page: Page, html: string) => {
	await page.evaluate((markup) => {
		document.body.innerHTML = markup;
	}, html);
};

test.beforeEach(async ({ page }) => {
	await page.goto("test.html");
});

test.describe("u-combobox", () => {
	test("matches snapshot", async ({ page }) => {
		await mount(page, "<u-combobox></u-combobox>");
		expect(await page.locator("body").innerHTML()).toMatchSnapshot(
			"u-combobox",
		);
	});

	test("is is defined", async ({ page }) => {
		await mount(page, DEFAULT);
		const uCombobox = page.locator("u-combobox");
		const instance = await uCombobox.evaluate(
			(el) => el instanceof (customElements.get("u-combobox") as never),
		);

		expect(instance).toBeTruthy();
		await expect(uCombobox).toBeAttached();
	});

	test("sets up properties", async ({ page }) => {
		await mount(page, DEFAULT);
		expect(
			await page.evaluate(() => {
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
		await mount(page, DEFAULT);
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
		await mount(page, DEFAULT);
		const input = page.locator("input");
		const live = page.locator("[aria-live]");

		await expect(live).not.toBeAttached();
		await input.focus();
		await expect(live).toBeAttached();
	});

	test("handles keyboard arrow navigation", async ({ page }) => {
		await mount(page, DEFAULT);
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.pressSequentially("Test");
		await expect(input).toBeFocused();
		await expect(input).toHaveValue("Test");
		await input.evaluate(setCaretStart);

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
		await mount(page, DEFAULT);
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

		await input.evaluate(setCaretStart);
		await input.press("Backspace");
		await expect(items.nth(2)).toBeFocused();

		await items.nth(2).press("Backspace");
		await expect(items.nth(2)).not.toBeAttached();
		await expect(items.nth(1)).toBeFocused();
	});

	test("handles keyboard creation and removal", async ({ page }) => {
		await mount(page, DEFAULT);
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

		await input.evaluate(setCaretStart);
		await input.press("ArrowLeft");
		await item3.press("Enter");
		await expect(item3).not.toBeAttached();
		await expect(item2).toBeFocused();
	});

	test("makes announcements when focused, but not when blurred", async ({
		page,
	}) => {
		await mount(page, DEFAULT);
		const input = page.locator("input");
		await input.focus();

		const live = page.locator("[aria-live='assertive']");
		await expect(live).toBeAttached();

		await input.press("Enter");
		await expect(live).toHaveText("Invalid value");

		await input.blur();
		await input.press("Enter");
		await expect(live).toHaveText("");
	});

	test("does not obstruct datalist keyboard navigation", async ({ page }) => {
		await mount(page, DEFAULT);
		const input = page.locator("input");
		const option0 = page.locator("u-option").nth(0);
		await input.focus();
		await input.press("ArrowDown");
		// Should not throw or lose focus, and datalist should be accessible
		await expect(input).toBeFocused();
		await expect(option0).toHaveAttribute("data-activedescendant");
	});

	test("focuses item on click", async ({ page }) => {
		await mount(page, DEFAULT);
		const item0 = page.locator("data").nth(0);
		const box = (await item0.boundingBox()) as Record<string, number>;
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		await expect(item0).toBeFocused();
	});

	test("removes item space / enter and x-click", async ({ page }) => {
		await mount(page, DEFAULT);
		const input = page.locator("input");
		const items = page.locator("data");
		const item0 = items.nth(0);

		expect(await items.count()).toBe(3);
		await items.nth(1).focus();
		await items.nth(1).press(" ");
		await expect(item0).toBeFocused();
		expect(await items.count()).toBe(2);
		await item0.press("Enter");
		expect(await items.count()).toBe(1);
		await expect(item0).toBeFocused();
		await item0.evaluate((el) => (el as HTMLElement).click());
		expect(await items.count()).toBe(0);
		await expect(input).toBeFocused();
	});

	test("focuses input when clicking u-combobox", async ({ page }) => {
		await mount(page, DEFAULT);
		const combobox = page.locator("u-combobox");
		const input = page.locator("input");
		await combobox.click();
		await expect(input).toBeFocused();
	});

	test("focuses input when clicking related label", async ({ page }) => {
		await mount(page, DEFAULT);
		const label = page.locator("label[for='my-tags']");
		const input = page.locator("input");
		await label.click();
		await expect(input).toBeFocused();
	});

	test("handles multiple u-combobox on same page", async ({ page }) => {
		await mount(
			page,
			`${DEFAULT}
				<u-combobox id="second">
					<data>Second 1</data>
					<input />
					<button type="reset">Clear</button>
					<u-datalist>
						<u-option>Second 1</u-option>
						<u-option>Second 2</u-option>
					</u-datalist>
				</u-combobox>
			`,
		);
		const firstInput = page.locator("u-combobox").first().locator("input");
		const secondInput = page.locator("#second input");
		const secondData = page.locator("#second  data");
		const buttonReset = page.locator('button[type="reset"]');
		await secondInput.focus();
		await expect(secondInput).toBeFocused();
		await buttonReset.click();
		await expect(secondData).toBeAttached();
		await firstInput.focus();
		await expect(firstInput).toBeFocused();
		await expect(secondData).not.toBeAttached();
	});

	// test("handles click on option in datalist", async ({ page }) => {
	// 	await mount(page, DEFAULT);
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
	// 	await mount(page, DEFAULT);
	// 	const input = page.locator("input");
	// 	const clear = page.locator('button[type="reset"], del');
	// 	await input.fill("Tag 5");
	// 	await clear.click();
	// 	await expect(input).toHaveValue("");
	// });

	// test("handles clear button with <del> element", async ({ page }) => {
	// 	await mount(page, DEFAULT);
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

test.describe("u-combobox without <u-datalist>", () => {
	test("hides toggle button regardless of input value", async ({ page }) => {
		await mount(page, NO_LIST_SINGLE);
		const input = page.locator("input");
		const toggle = page.locator("button[aria-expanded]");

		await expect(toggle).toHaveAttribute("hidden", "");
		await input.fill("Hello");
		await expect(toggle).toHaveAttribute("hidden", ""); // Still hidden, no datalist to toggle
	});

	test("does not forward list attribute to input", async ({ page }) => {
		await mount(page, NO_LIST_SINGLE);
		const input = page.locator("input");
		await expect(input).not.toHaveAttribute("list");
	});

	test("shows and hides clear button based on input value", async ({
		page,
	}) => {
		await mount(page, NO_LIST_SINGLE);
		const input = page.locator("input");
		const clear = page.locator('button[type="reset"]');

		await expect(clear).toHaveAttribute("hidden", "");
		await input.focus();
		await input.fill("Hello");
		await expect(clear).not.toHaveAttribute("hidden");
		await clear.click();
		await expect(input).toHaveValue("");
		await expect(clear).toHaveAttribute("hidden", "");
	});

	test("creates data item on Enter in single mode when creatable", async ({
		page,
	}) => {
		await mount(page, NO_LIST_SINGLE);
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.fill("Hello");
		await input.press("Enter");
		await expect(items).toHaveCount(1);
		await expect(items.nth(0)).toHaveText("Hello");
		await expect(items.nth(0)).toHaveAttribute("value", "Hello");
	});

	test("creates data item on blur in single mode when creatable", async ({
		page,
	}) => {
		await mount(page, NO_LIST_SINGLE);
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.fill("Hello");
		await input.blur();
		await expect(items).toHaveCount(1);
		await expect(items.nth(0)).toHaveText("Hello");
	});

	test("does not create data item when not creatable", async ({ page }) => {
		await mount(
			page,
			`<label for="single">My label</label>
			<u-combobox>
				<input id="single" />
			</u-combobox>`,
		);
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.fill("Hello");
		await input.press("Enter");
		await expect(items).toHaveCount(0);
	});

	test("creates tag on Enter in multiple mode when creatable", async ({
		page,
	}) => {
		await mount(page, NO_LIST_MULTIPLE);
		const input = page.locator("input");
		const items = page.locator("data");

		await expect(items).toHaveCount(1);
		await input.focus();
		await input.fill("Tag 2");
		await input.press("Enter");
		await expect(items).toHaveCount(2);
		await expect(items.nth(1)).toHaveText("Tag 2");
	});

	test("does not create tag in multiple mode when not creatable", async ({
		page,
	}) => {
		await mount(
			page,
			`<label for="multi">My label</label>
			<u-combobox data-multiple>
				<data>Tag 1</data>
				<input id="multi" />
			</u-combobox>`,
		);
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.fill("Tag 2");
		await input.press("Enter");
		await expect(items).toHaveCount(1); // Unchanged, since not creatable and no datalist to match against
	});

	test("focuses last tag on Backspace at start of input in multiple mode", async ({
		page,
	}) => {
		await mount(page, NO_LIST_MULTIPLE);
		const input = page.locator("input");
		const items = page.locator("data");

		await input.focus();
		await input.evaluate(setCaretStart);
		await input.press("Backspace");
		await expect(items.nth(0)).toBeFocused();
	});

	test("removes tag on Backspace and space/enter/click", async ({ page }) => {
		await mount(
			page,
			`<label for="multi">My label</label>
			<u-combobox data-multiple data-creatable>
				<data>Tag 1</data>
				<data>Tag 2</data>
				<input id="multi" />
				<button type="reset">Clear</button>
			</u-combobox>`,
		);
		const items = page.locator("data");

		await items.nth(1).focus();
		await items.nth(1).press("Backspace");
		await expect(items).toHaveCount(1);
		await expect(items.nth(0)).toBeFocused();
	});
});

// TODO: Test single mode syncs value when changing/adding/removing item
