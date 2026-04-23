import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("test.html");
});

const mount = async (page: import("@playwright/test").Page, html: string) => {
	await page.evaluate((markup) => {
		document.body.innerHTML = markup;
	}, html);
};

const DEFAULT = `<form>
      <label>
        Search here
        <input type="text" list="datalist-1" />
      </label>
      <u-datalist id="datalist-1">
        <u-option>Option 1</u-option>
        <u-option>Option 2</u-option>
        <u-option>Option 3</u-option>
      </u-datalist>
    </form>`;

test.describe("HTMLDataListElement", () => {
	test("matches snapshot", async ({ page }) => {
		await mount(page, DEFAULT);
		expect(await page.locator("body").innerHTML()).toMatchSnapshot(
			"u-datalist",
		);
	});
	test("exposes the native interface", async ({ page }) => {
		await mount(
			page,
			`<label for="animal">Animal</label>
			 <input id="animal" list="animals" />
			 <u-datalist id="animals">
			  <u-option value="Cat"></u-option>
			  <u-option value="Dog"></u-option>
			 </u-datalist>`,
		);

		const datalist = page.locator("u-datalist");
		const instance = await datalist.evaluate((el) => {
			const instance = customElements.get("u-datalist");
			return el instanceof (instance as CustomElementConstructor);
		});

		expect(instance).toBeTruthy();
		await expect(datalist).toBeAttached();
		const listMatches = await page
			.locator("input")
			.evaluate<boolean, HTMLInputElement>((input) => {
				return input.list === document.querySelector("u-datalist");
			});

		expect(listMatches).toBeTruthy();
	});

	test("returns descendant option elements in tree order", async ({ page }) => {
		await mount(
			page,
			`<u-datalist id="animals">
			  <u-option value="Cat">Cat</u-option>
			  <u-option value="Dog">Dog</u-option>
			  <u-option value="Ant">Ant</u-option>
			</u-datalist>`,
		);

		const datalist = page.locator("u-datalist");
		const data = await datalist.evaluate<
			{ length: number; values: string[]; texts: string[] },
			HTMLDataListElement
		>((el) => ({
			length: el.options.length,
			values: Array.from(el.options, (opt) => opt.value),
			texts: Array.from(el.options, (opt) => opt.text),
		}));

		expect(data.length).toBe(3);
		expect(data.values).toEqual(["Cat", "Dog", "Ant"]);
		expect(data.texts).toEqual(["Cat", "Dog", "Ant"]);
	});

	test("updates the live options collection", async ({ page }) => {
		await mount(
			page,
			`<u-datalist id="animals">
					<u-option value="Cat"></u-option>
				</u-datalist>`,
		);

		const datalist = page.locator("u-datalist");

		await expect(datalist).toHaveJSProperty("options.length", 1);

		await datalist.evaluate((el) => {
			const dog = document.createElement("u-option") as HTMLOptionElement;
			dog.value = "Dog";
			el.append(dog);
		});
		await expect(datalist).toHaveJSProperty("options.length", 2);

		await datalist.evaluate((el) => {
			el.firstElementChild?.remove();
		});
		await expect(datalist).toHaveJSProperty("options.length", 1);
		const values = await datalist.evaluate<string[], HTMLDataListElement>(
			(el) => Array.from(el.options, (opt) => opt.value),
		);
		expect(values).toEqual(["Dog"]);
	});

	test("supports mouse focus and keyboard input", async ({ page }) => {
		await mount(
			page,
			`<label for="animal">Animal</label>
			 <input id="animal" list="animals" />
			 <u-datalist id="animals">
			  <u-option value="Cat"></u-option>
			  <u-option value="Dog"></u-option>
			 </u-datalist>`,
		);

		const input = page.locator("input");

		await input.click();
		await expect(input).toBeFocused();
		await input.press("ArrowDown");
		await input.fill("Dog");
		await expect(input).toHaveValue("Dog");
	});

	test("keeps free text input valid and editable", async ({ page }) => {
		await mount(
			page,
			`<label for="animal">Animal</label>
			 <input id="animal" list="animals" />
			 <u-datalist id="animals">
			  <u-option value="Cat"></u-option>
			 </u-datalist>`,
		);

		const input = page.locator("input");

		await input.fill("Zebra");
		await expect(input).toHaveValue("Zebra");
		await expect(input).toHaveJSProperty("willValidate", true);
	});

	test("sets up properties", async ({ page }) => {
		await mount(page, DEFAULT);
		const datalist = page.locator("u-datalist");

		await expect(datalist).toBeHidden();
		await expect(datalist).toHaveJSProperty("children.length", 3);
	});

	test("sets up attributes", async ({ page }) => {
		await mount(page, DEFAULT);
		const datalist = page.locator("u-datalist");

		await expect(datalist).toBeHidden();
		await expect(datalist).toHaveRole("listbox");
	});

	test("responds on focus and blur", async ({ page }) => {
		await mount(
			page,
			`
        <label>Search here <input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-sr-singular="%d hit" data-sr-plural="%d hits">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>`,
		);
		const datalist = page.locator("u-datalist");
		const body = page.locator("body");
		const input = page.locator("input").first();

		await expect(datalist).toBeHidden();

		await input.click();
		const datalistId = (await datalist.getAttribute("id")) || "";

		await expect(datalist).toBeVisible();
		await expect(input).toHaveRole("combobox");
		await expect(input).toHaveAttribute("autocomplete", "off");
		await expect(input).toHaveAttribute("aria-autocomplete", "list");
		await expect(input).toHaveAttribute("aria-controls", datalistId);

		await body.click(); // Click outside to close datalist - also on Android
		await expect(datalist).toBeHidden();
	});

	test("handles keyboard arrow navigation", async ({ page }) => {
		await mount(page, DEFAULT);

		const datalist = page.locator("u-datalist");
		const option0 = page.locator("u-option").nth(0);
		const option2 = page.locator("u-option").nth(2);
		const input = page.locator("input");

		await input.focus();
		await expect(input).toBeFocused();

		await input.press("ArrowDown");
		await expect(option0).toHaveAttribute("data-activedescendant");

		await input.press("ArrowUp");
		await expect(option0).not.toHaveAttribute("data-activedescendant");

		await input.press("End");
		await expect(option2).toHaveAttribute("data-activedescendant");

		await input.press("Home");
		await expect(option0).toHaveAttribute("data-activedescendant");

		await input.press("Escape");
		await expect(input).toBeFocused();
		await expect(datalist).toBeHidden();

		await input.press("ArrowDown");
		await expect(datalist).toBeVisible();
		await expect(option0).toHaveAttribute("data-activedescendant");

		await input.press("Enter");
		await expect(input).toHaveValue((await option0.textContent()) || "");
		await expect(datalist).toBeHidden();
	});

	test("ignores keystrokes with meta keys", async ({ page }) => {
		await mount(page, DEFAULT);
		const input = page.locator("input");

		await input.focus();
		await input.press("Control+ArrowDown");
		await input.press("Meta+ArrowDown");
		await input.press("Shift+ArrowDown");
		await expect(input).toBeFocused();
	});

	test("filters items when typing", async ({ page }) => {
		await mount(page, DEFAULT);
		const option = page.locator("u-option");
		const input = page.locator("input");

		await input.focus();
		await input.press("1");
		await expect(input).toBeFocused();
		await expect(input).toHaveValue("1");
		await expect(option.nth(0)).toBeVisible();
		await expect(option.nth(1)).toBeHidden();
	});

	test("filters items when changing value", async ({ page }) => {
		await mount(page, DEFAULT);
		const option0 = page.locator("u-option").nth(0);
		const input = page.locator("input");

		await input.evaluate((el) => {
			(el as HTMLInputElement).value = "test";
		});
		await input.click();
		await expect(input).toBeFocused();
		await expect(option0).toBeHidden();
		await option0.evaluate((el) => {
			(el as HTMLOptionElement).textContent = "test";
		});
		await expect(option0).toBeVisible();
	});

	test("respects event.preventDefault", async ({ page }) => {
		await mount(page, DEFAULT);
		const input = page.locator("input");

		await input.evaluate<void, HTMLInputElement>((el) =>
			el.addEventListener("keydown", (event) => event.preventDefault()),
		);
		await input.press("ArrowDown");
		await expect(input).toBeFocused();
	});

	test("re-opens on click on input", async ({ page }) => {
		await mount(page, DEFAULT);
		const datalist = page.locator("u-datalist");
		const input = page.locator("input");

		await input.click();
		await expect(datalist).toBeVisible();

		await input.press("Escape");
		await expect(datalist).toBeHidden();

		await input.click();
		await expect(datalist).toBeVisible();
	});

	test("handles multiple datalist on same page", async ({ page }) => {
		await mount(
			page,
			`<form>
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
      </form>`,
		);

		const body = page.locator("body");
		const input0 = page.locator("input").nth(0);
		const input1 = page.locator("input").nth(1);
		const datalist0 = page.locator("#datalist-1");
		const datalist1 = page.locator("#datalist-2");

		await input0.click();
		await expect(datalist0).toBeVisible();
		await expect(datalist1).toBeHidden();

		await body.click(); // Click outside to close first datalist
		await input1.click();
		await expect(datalist1).toBeVisible();
		await expect(datalist0).toBeHidden();
	});

	test("handles being bound to multiple inputs", async ({ page }) => {
		await mount(
			page,
			`<form>
        <label>Search here 1<input type="text" list="datalist-1" /></label>
        <label>Search here 2<input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-sr-singular="%d hit" data-sr-plural="%d hits">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>
      </form>`,
		);

		const input0 = page.locator("input").nth(0);
		const input1 = page.locator("input").nth(1);
		const datalist = page.locator("u-datalist");

		await expect(datalist).toBeHidden();
		await input0.click();
		await expect(datalist).toBeVisible();

		await input1.click();
		await expect(datalist).toBeVisible();
	});

	test("triggers input and change events", async ({ page }) => {
		await mount(page, DEFAULT);
		const input = page.locator("input");
		const option0 = page.locator("u-option").nth(0);

		await input.evaluate<void, HTMLInputElement>((el) => {
			el.addEventListener("input", () => el.setAttribute("data-input", ""));
			el.addEventListener("change", () => el.setAttribute("data-change", ""));
		});

		await input.click();
		await option0.click();
		await expect(input).toHaveAttribute("data-input");
		await expect(input).toHaveAttribute("data-change");
	});
});
