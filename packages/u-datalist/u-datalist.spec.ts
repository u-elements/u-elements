import { type Locator, expect, test } from "@playwright/test";

const expectExpanded = async (locator: Locator, value: unknown) => {
	const IS_SAFARI_MAC = test.info().project.name === "Webkit";

	await expect(locator).toHaveAttribute(
		"aria-expanded",
		`${IS_SAFARI_MAC || value}`,
	);
};

const attrLabelledby = () => {
	const IS_ANDROID = test.info().project.name === "Mobile Chrome";
	return IS_ANDROID ? "data-labelledby" : "aria-labelledby";
};

test.beforeEach(async ({ page }) => {
	await page.goto("index.html");
	await page.evaluate(() => {
		document.body.innerHTML = `<form>
      <label>
        Search here
        <input type="text" list="datalist-1" />
      </label>
      <u-datalist id="datalist-1" data-sr-singular="%d hit" data-sr-plural="%d hits">
        <u-option>Option 1</u-option>
        <u-option>Option 2</u-option>
        <u-option>Option 3</u-option>
      </u-datalist>
    </form>`;
	});
});

test.describe("u-datalist", () => {
	test("matches snapshot", async ({ page }) => {
		expect(await page.locator("body").innerHTML()).toMatchSnapshot(
			"u-datalist",
		);
	});

	test("is is defined", async ({ page }) => {
		const input = page.locator("input");
		const uDatalist = page.locator("u-datalist");
		const instance = await uDatalist.evaluate(
			(el) => el instanceof (customElements.get("u-datalist") as never),
		);
		const listProp = await input.evaluate<boolean, HTMLInputElement>(
			(el) => el.list === document.querySelector("u-datalist"),
		);

		expect(instance).toBeTruthy();
		expect(listProp).toBeTruthy();
		await expect(uDatalist).toBeAttached();
	});

	test("sets up properties", async ({ page }) => {
		const uDatalist = page.locator("u-datalist");

		await expect(uDatalist).toHaveJSProperty("hidden", true);
		expect(
			await uDatalist.evaluate<number, HTMLDataListElement>((el) => {
				return el.children.length;
			}),
		).toBe(3);
	});

	test("sets up attributes", async ({ page }) => {
		const uDatalist = page.locator("u-datalist");

		await expect(uDatalist).toHaveAttribute("hidden");
		await expect(uDatalist).toHaveRole("listbox");
	});

	test("responds on focus and blur", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `
        <label>Search here <input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-sr-singular="%d hit" data-sr-plural="%d hits">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>
        <input id="other-input" />`;
		});
		const uDatalist = page.locator("u-datalist");
		const input = page.locator("input").first();
		const label = page.locator("label");

		await expectExpanded(input, false);
		await expect(uDatalist).toBeHidden();

		await input.focus();
		const labelId = (await label.getAttribute("id")) || "";
		const uDatalistId = (await uDatalist.getAttribute("id")) || "";

		await expect(uDatalist).toBeVisible();
		await expect(input).toHaveRole("combobox");
		await expect(input).toHaveAttribute("autocomplete", "off");
		await expect(input).toHaveAttribute("aria-autocomplete", "list");
		await expectExpanded(input, true);
		await expect(input).toHaveAttribute("aria-controls", uDatalistId);
		await expect(uDatalist).toHaveAttribute(attrLabelledby(), labelId);

		await input.blur();
		await expectExpanded(input, false);
		await expect(uDatalist).toBeHidden();

		await input.focus();
		await expectExpanded(input, true);
		await expect(uDatalist).toBeVisible();

		await page.locator("input").last().focus();
		await expectExpanded(input, false);
		await expect(uDatalist).toBeHidden();
	});

	test("handles keyboard arrow navigation", async ({ page }) => {
		const uDatalist = page.locator("u-datalist");
		const uOption0 = page.locator("u-option").nth(0);
		const uOption2 = page.locator("u-option").nth(2);
		const input = page.locator("input");

		await input.focus();
		await expect(input).toBeFocused();

		await input.press("ArrowDown");
		await expect(uOption0).toBeFocused();

		await uOption0.press("ArrowUp");
		await expect(input).toBeFocused();

		await input.press("ArrowUp");
		await expect(uOption2).toBeFocused();

		await uOption2.press("ArrowDown");
		await expect(uOption0).toBeFocused();

		await uOption0.press("End");
		await expect(uOption2).toBeFocused();

		await uOption2.press("Home");
		await expect(uOption0).toBeFocused();

		await input.press("Escape");
		await expect(input).toBeFocused();
		await expectExpanded(input, false);
		await expect(uDatalist).toBeHidden();

		await input.press("ArrowDown");
		await expectExpanded(input, true);
		await expect(uDatalist).toBeVisible();
		await expect(uOption0).toBeFocused();

		await uOption0.press("Enter");
		await expect(input).toBeFocused();
		await expect(input).toHaveValue((await uOption0.textContent()) || "");
		await expectExpanded(input, false);
		await expect(uDatalist).toBeHidden();
	});

	test("ignores keystrokes with meta keys", async ({ page }) => {
		const input = page.locator("input");

		await input.focus();
		await input.press("Control+ArrowDown");
		await input.press("Meta+ArrowDown");
		await input.press("Shift+ArrowDown");
		await expect(input).toBeFocused();
	});

	test("filters items when typing", async ({ page }) => {
		const uOption = page.locator("u-option");
		const input = page.locator("input");

		await input.focus();
		await input.press("1");
		await expect(input).toBeFocused();
		await expect(input).toHaveValue("1");
		await expect(uOption.nth(0)).toBeVisible();
		await expect(uOption.nth(1)).toBeHidden();
		await expect(uOption.nth(1)).toBeHidden();
	});

	test("filters items when changing value", async ({ page }) => {
		const uOption0 = page.locator("u-option").nth(0);
		const input = page.locator("input");

		await input.evaluate((el) => {
			(el as HTMLInputElement).value = "test";
		});
		await input.focus();
		await expect(uOption0).toBeHidden();
		await uOption0.evaluate((el) => {
			(el as HTMLOptionElement).value = "test";
		});
		await expect(uOption0).toBeVisible();
	});

	test("respects event.preventDefault", async ({ page }) => {
		const input = page.locator("input");

		await input.evaluate<void, HTMLInputElement>((el) =>
			el.addEventListener("keydown", (event) => event.preventDefault()),
		);
		await input.press("ArrowDown");
		await expect(input).toBeFocused();
	});

	test("re-opens on click on input", async ({ page }) => {
		const uDatalist = page.locator("u-datalist");
		const input = page.locator("input");

		await input.focus();
		await expect(uDatalist).toBeVisible();

		await input.press("Escape");
		await expect(uDatalist).toBeHidden();

		await input.click();
		await expect(uDatalist).toBeVisible();
	});

	test("handles multiple u-datalist on same page", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<form>
        <label>Search here<input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-sr-singular="%d hit" data-sr-plural="%d hits">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>
        <label>Search here<input type="text" list="datalist-2" /></label>
        <u-datalist id="datalist-2" data-sr-singular="%d hit" data-sr-plural="%d hits">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>
      </form>`;
		});

		const input0 = page.locator("input").nth(0);
		const input1 = page.locator("input").nth(1);
		const uDatalist0 = page.locator("#datalist-1");
		const uDatalist1 = page.locator("#datalist-2");

		await input0.focus();
		await expect(uDatalist0).toBeVisible();
		await expect(uDatalist1).toBeHidden();

		await input1.focus();
		await expect(uDatalist0).toBeHidden();
		await expect(uDatalist1).toBeVisible();
	});

	test("handles being bound to multiple inputs", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<form>
        <label>Search here 1<input type="text" list="datalist-1" /></label>
        <label>Search here 2<input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-sr-singular="%d hit" data-sr-plural="%d hits">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>
      </form>`;
		});

		const input0 = page.locator("input").nth(0);
		const input1 = page.locator("input").nth(1);
		const uDatalist = page.locator("u-datalist");

		expect(uDatalist).toBeHidden();
		await input0.focus();
		await expectExpanded(input0, true);
		await expectExpanded(input1, false);
		await expect(uDatalist).toBeVisible();

		await input1.focus();
		await expectExpanded(input0, false);
		await expectExpanded(input1, true);
		await expect(uDatalist).toBeVisible();
	});

	test("triggers input and change events", async ({ page }) => {
		const input = page.locator("input");
		const uOption0 = page.locator("u-option").nth(0);

		await input.evaluate<void, HTMLInputElement>((el) => {
			el.addEventListener("input", () => el.setAttribute("data-input", ""));
			el.addEventListener("change", () => el.setAttribute("data-change", ""));
		});

		await input.focus();
		await uOption0.click();
		await expect(input).toHaveAttribute("data-input");
		await expect(input).toHaveAttribute("data-change");
	});
});
