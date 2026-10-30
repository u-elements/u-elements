import type { Page } from "@playwright/test";
import { expect, test } from "../test";
import { datalistSuite, opened, recordSpoken } from "./u-datalist.suite";

// Runs the shared suite (u-datalist.suite.ts) against the vanilla DOM harness page (frameworks/vanilla/test.html?component=u-datalist).
// The tests below need raw DOM access and have no equivalent in the harness
datalistSuite({ url: "frameworks/vanilla/test.html?component=u-datalist" });

const mount = async (page: Page, html: string) => {
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
	test.beforeEach(async ({ page }) => {
		await page.goto("test.html");
	});

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
			.evaluate((input: HTMLInputElement) => {
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
		const data = await datalist.evaluate((el: HTMLDataListElement) => ({
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
		expect(
			await datalist.evaluate((el: HTMLDataListElement) => el.options.length),
		).toBe(1);

		await datalist.evaluate((el) => {
			const dog = document.createElement("u-option") as HTMLOptionElement;
			dog.value = "Dog";
			el.append(dog);
		});
		expect(
			await datalist.evaluate((el: HTMLDataListElement) => el.options.length),
		).toBe(2);

		await datalist.evaluate((el) => {
			el.firstElementChild?.remove();
		});
		expect(
			await datalist.evaluate((el: HTMLDataListElement) => el.options.length),
		).toBe(1);
		const values = await datalist.evaluate((el: HTMLDataListElement) =>
			Array.from(el.options, (opt) => opt.value),
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
		const optionsCount = await datalist.evaluate(
			(el: HTMLDataListElement) => el.options.length,
		);
		expect(optionsCount).toBe(3);
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
        <u-datalist id="datalist-1">
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

	test("picks the active option once on held Enter", async ({ page }) => {
		// Multiselectable stays open with the option active after a pick, so a repeat would pick again on every keydown
		await mount(
			page,
			DEFAULT.replace(
				"<u-datalist",
				'<u-datalist aria-multiselectable="true" data-multiselectable="true"', // data- variant is what Android reads, see SAFE_MULTISELECTABLE
			),
		);
		const datalist = page.locator("u-datalist");
		const input = page.locator("input");

		await input.evaluate((el: HTMLInputElement) => {
			let inputs = 0;
			el.addEventListener("input", () =>
				el.setAttribute("data-inputs", `${++inputs}`),
			);
			el.form?.addEventListener("submit", (e) => {
				e.preventDefault();
				el.setAttribute("data-submit", "");
			});
		});

		await input.focus();
		await input.press("ArrowDown");
		await page.keyboard.down("Enter");
		await page.keyboard.down("Enter"); // Playwright sets repeat: true on a second down without up, like a held key
		await page.keyboard.down("Enter");
		await page.keyboard.up("Enter");
		await expect(input).toHaveValue("Option 1");
		await expect(input).toHaveAttribute("data-inputs", "1"); // Picked once
		await expect(datalist).toBeVisible();
		await expect(input).not.toHaveAttribute("data-submit"); // Submit is still prevented on every repeat
	});

	test("does not re-open on held Enter after the pick closed the list", async ({
		page,
	}) => {
		await mount(page, DEFAULT);
		const datalist = page.locator("u-datalist");
		const input = page.locator("input");

		await input.evaluate((el: HTMLInputElement) =>
			el.form?.addEventListener("submit", (e) => e.preventDefault()),
		); // A held Enter on a closed list is a plain Enter in the input, so only keep the page from navigating

		await input.focus();
		await input.press("ArrowDown");
		await page.keyboard.down("Enter");
		await page.keyboard.down("Enter"); // repeat: true
		await page.keyboard.up("Enter");
		await expect(input).toHaveValue("Option 1");
		await expect(datalist).toBeHidden();
	});

	test("keeps the open state on Escape while composing", async ({ page }) => {
		await mount(page, DEFAULT);
		const datalist = page.locator("u-datalist");
		const input = page.locator("input");
		const composeEscape = (el: HTMLInputElement) =>
			el.dispatchEvent(
				new KeyboardEvent("keydown", {
					bubbles: true,
					cancelable: true,
					isComposing: true,
					key: "Escape",
				}),
			);

		await input.focus();
		await input.press("ArrowDown");
		await expect(datalist).toBeVisible();
		await input.evaluate(composeEscape); // Cancels the composition, so the list stays open
		await expect(datalist).toBeVisible();

		await input.press("Escape");
		await expect(datalist).toBeHidden();
		await input.evaluate(composeEscape); // Cancels the composition, so the list stays closed
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

		await input.evaluate((el: HTMLDataListElement) =>
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

	test("announces hits with --sr-* custom properties", async ({ page }) => {
		await mount(
			page,
			`<style>:root { --sr-singular: "%d treff"; --sr-plural: '%d treff' }</style>
        <label>Search here <input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>`,
		);
		const input = page.locator("input").first();

		await input.click();
		const spoken = await recordSpoken(page);

		await input.pressSequentially("Option 1", { delay: 50 }); // Like a user, as the list clears the pending announcement in a timeout when it opens, which keys dispatched without a gap would all precede
		await expect.poll(spoken).toContain("1 treff");
		await input.press("Backspace");
		await input.press("Backspace");
		await expect.poll(spoken).toContain("3 treff");
	});

	test("announces aria-setsize as the hit count for a virtualized window", async ({
		page,
	}) => {
		// A consumer rendering a window of a larger result set sets aria-setsize on the rendered options
		await mount(
			page,
			`<label>Search here <input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-nofilter>
          <u-option aria-setsize="7" hidden>Hidden</u-option>
          <u-option aria-posinset="41" aria-setsize="120">Option 1</u-option>
          <u-option aria-posinset="42" aria-setsize="120">Option 2</u-option>
          <u-option aria-posinset="43" aria-setsize="120">Option 3</u-option>
        </u-datalist>`,
		);
		const input = page.locator("input").first();
		const options = page.locator("u-option:not([hidden])");

		await input.click();
		const spoken = await recordSpoken(page);
		await opened(page);

		await input.press("x");
		await expect.poll(spoken).toEqual(["120 hits"]); // The total, not the 3 rendered options and not the hidden option's 7

		if (test.info().project.name === "Mobile Safari")
			for (const [index, pos] of ["41", "42", "43"].entries()) {
				const option = options.nth(index);
				await expect(option).toHaveAttribute("data-posinset", pos); // iOS reads the position from aria-posinset instead of the rendered index
				await expect(option).toHaveAttribute("data-setsize", "120");
				const content = await option.evaluate(
					(el) => getComputedStyle(el, "::after").content,
				);
				expect(content).toContain(`${pos} of 120`); // The CSS reads the same attributes as written
			}
	});

	test("picks singular or plural from the aria-setsize total", async ({
		page,
	}) => {
		await mount(
			page,
			`<label>Search here <input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-nofilter>
          <u-option aria-posinset="1" aria-setsize="1">Option 1</u-option>
        </u-datalist>`,
		);
		const input = page.locator("input").first();
		const option = page.locator("u-option");
		const setSize = (size: string) =>
			option.evaluate(
				(el, size) => el.setAttribute("aria-setsize", size),
				size,
			);

		await input.click();
		const spoken = await recordSpoken(page);
		await opened(page);

		await input.press("x");
		await expect.poll(spoken).toEqual(["1 hit"]);

		await setSize("5"); // One rendered option, but the total is plural
		await expect.poll(spoken).toEqual(["1 hit", "5 hits"]);

		await setSize("-1"); // Unknown total per ARIA, so fall back to the rendered count
		await expect.poll(spoken).toEqual(["1 hit", "5 hits", "1 hit"]);

		await setSize("2");
		await expect.poll(spoken).toEqual(["1 hit", "5 hits", "1 hit", "2 hits"]);

		await setSize("abc"); // Not a number, so fall back to the rendered count
		await expect
			.poll(spoken)
			.toEqual(["1 hit", "5 hits", "1 hit", "2 hits", "1 hit"]);
	});

	test("does not re-announce when options are replaced with the same query and total", async ({
		page,
	}) => {
		// A consumer fetching a window re-renders fresh option elements, which must not repeat the hit count
		await mount(
			page,
			`<label>Search here <input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1" data-nofilter>
          <u-option aria-posinset="1" aria-setsize="120">Option 1</u-option>
          <u-option aria-posinset="2" aria-setsize="120">Option 2</u-option>
          <u-option aria-posinset="3" aria-setsize="120">Option 3</u-option>
        </u-datalist>`,
		);
		const input = page.locator("input").first();
		const datalist = page.locator("u-datalist");
		const replaceOptions = (size: string) =>
			datalist.evaluate((el, size) => {
				el.replaceChildren(
					...["Option 1", "Option 2", "Option 3"].map((text, index) => {
						const opt = document.createElement("u-option");
						opt.setAttribute("aria-posinset", `${index + 1}`);
						opt.setAttribute("aria-setsize", size);
						opt.textContent = text;
						return opt;
					}),
				);
			}, size);

		await input.click();
		const spoken = await recordSpoken(page);
		await opened(page);

		await input.press("x");
		await expect.poll(spoken).toEqual(["120 hits"]);

		await replaceOptions("120");
		await page.waitForTimeout(700); // Past the 500ms announcement timer
		expect(await spoken()).toEqual(["120 hits"]); // Same query and total, so nothing new to announce

		await replaceOptions("121");
		await expect.poll(spoken).toEqual(["120 hits", "121 hits"]); // A new total is announced

		await input.press("Escape");
		await expect(datalist).toBeHidden();
		await input.press("ArrowDown");
		await expect(datalist).toBeVisible();
		await opened(page);
		await replaceOptions("121");
		await expect.poll(spoken).toEqual(["120 hits", "121 hits", "121 hits"]); // Closing clears the last announcement, so the same result is announced again on the next open
	});
	test("handles multiple datalist on same page", async ({ page }) => {
		await mount(
			page,
			`<form>
        <label>Search here<input type="text" list="datalist-1" /></label>
        <u-datalist id="datalist-1">
          <u-option>Option 1</u-option>
          <u-option>Option 2</u-option>
          <u-option>Option 3</u-option>
        </u-datalist>
        <label>Search here<input type="text" list="datalist-2" /></label>
        <u-datalist id="datalist-2">
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
        <u-datalist id="datalist-1">
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

		await input.evaluate((el: HTMLInputElement) => {
			el.addEventListener("input", () => el.setAttribute("data-input", ""));
			el.addEventListener("change", () => el.setAttribute("data-change", ""));
		});

		await input.click();
		await option0.click();
		await expect(input).toHaveAttribute("data-input");
		await expect(input).toHaveAttribute("data-change");
	});
});
