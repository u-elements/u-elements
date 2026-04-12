import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("index.html");
	await page.evaluate(() => {
		document.body.innerHTML = "<u-option>Option 1</u-option>";
	});
});

test.describe("u-option", () => {
	test("matches snapshot", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML =
				"<u-option>Option 1</u-option><u-option selected>Option 2</u-option><u-option disabled>Option 2</u-option>";
		});
		expect(await page.locator("body").innerHTML()).toMatchSnapshot("u-option");
	});

	test("is is defined", async ({ page }) => {
		const uOption = page.locator("u-option");
		const instance = await uOption.evaluate(
			(el) => el instanceof (customElements.get("u-option") as never),
		);

		expect(instance).toBeTruthy();
		await expect(uOption).toHaveAccessibleName("Option 1");
		await expect(uOption).toHaveJSProperty("label", "Option 1");
		await expect(uOption).toBeAttached();
	});

	test("sets up properties", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<form>
          <u-datalist>
            <u-option>Option 1</u-option>
            <u-option>TMP</u-option>
          </u-datalist>
        </form>`;
		});
		const uOption0 = page.locator("u-option").nth(0);
		const uOption1 = page.locator("u-option").nth(1);

		uOption0.evaluate<void, HTMLOptionElement>((uOption0) => {
			uOption0.defaultSelected = true;
			uOption0.disabled = true;
			uOption0.selected = true;
		});
		uOption1.evaluate<void, HTMLOptionElement>((uOption1) => {
			uOption1.label = "Option 2";
			uOption1.text = "Text 2";
			uOption1.value = "Value 2";
			uOption1.selected = false;
			uOption1.disabled = false;
		});

		expect(
			await page.evaluate(() => {
				const uOption = document.querySelectorAll("u-option");
				const form = document.querySelector("form");
				return uOption[0].form === form && uOption[1].form === form;
			}),
		).toBeTruthy();

		await expect(uOption0).toHaveJSProperty("disabled", true);
		await expect(uOption0).toHaveJSProperty("defaultSelected", true);
		await expect(uOption0).toHaveJSProperty("selected", true);
		await expect(uOption0).toHaveJSProperty("index", 0);
		await expect(uOption0).toHaveJSProperty("label", "Option 1");
		await expect(uOption0).toHaveJSProperty("text", "Option 1");
		await expect(uOption0).toHaveJSProperty("value", "Option 1");

		await expect(uOption1).toHaveJSProperty("disabled", false);
		await expect(uOption1).toHaveJSProperty("defaultSelected", false);
		await expect(uOption1).toHaveJSProperty("selected", false);
		await expect(uOption1).toHaveJSProperty("index", 1);
		await expect(uOption1).toHaveJSProperty("label", "Option 2");
		await expect(uOption1).toHaveJSProperty("text", "Text 2");
		await expect(uOption1).toHaveJSProperty("value", "Value 2");

		await page.evaluate(() => {
			document.body.innerHTML = "<u-option></u-option>";
		});

		await expect(uOption0).toHaveJSProperty("index", 0);
		await expect(uOption0).toHaveJSProperty("text", "");
	});

	test("sets up attributes", async ({ page }) => {
		const uOption = page.locator("u-option");

		await expect(uOption).toHaveAttribute("aria-selected", "false");
		await expect(uOption).toHaveAttribute("aria-disabled", "false");

		await uOption.evaluate((el) => el.setAttribute("selected", ""));
		await uOption.evaluate((el) => el.setAttribute("disabled", ""));
		await expect(uOption).toHaveAttribute("aria-selected", "true");
		await expect(uOption).toHaveAttribute("aria-disabled", "true");

		await uOption.evaluate((el) => el.setAttribute("selected", "banana"));
		await uOption.evaluate((el) => el.setAttribute("disabled", "banana"));
		await expect(uOption).toHaveAttribute("aria-selected", "true");
		await expect(uOption).toHaveAttribute("aria-disabled", "true");

		await uOption.evaluate((el) => el.removeAttribute("selected"));
		await uOption.evaluate((el) => el.removeAttribute("disabled"));
		await expect(uOption).toHaveAttribute("aria-selected", "false");
		await expect(uOption).toHaveAttribute("aria-disabled", "false");

		await uOption.evaluate<void, HTMLOptionElement>((el) => {
			el.label = "Label 1";
			el.value = "Value 1";
			el.selected = true;
			el.disabled = true;
		});
		await expect(uOption).toHaveAttribute("label", "Label 1");
		await expect(uOption).toHaveAttribute("value", "Value 1");
		await expect(uOption).toHaveAttribute("selected");
		await expect(uOption).toHaveAttribute("aria-selected", "true");
		await expect(uOption).toHaveAttribute("disabled");
		await expect(uOption).toHaveAttribute("aria-disabled", "true");

		await uOption.evaluate<void, HTMLOptionElement>((el) => {
			el.selected = false;
			el.disabled = false;
		});
		await expect(uOption).not.toHaveAttribute("selected");
		await expect(uOption).toHaveAttribute("aria-selected", "false");
		await expect(uOption).not.toHaveAttribute("disabled");
		await expect(uOption).toHaveAttribute("aria-disabled", "false");
	});
});
