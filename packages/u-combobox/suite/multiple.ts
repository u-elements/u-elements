// Multiple mode: pick, Enter, blur, creatable and filtering. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { logged, resetLog, settled } from "../../suite";
import { expect, test } from "../../test";
import { BERGEN, type SuiteContext, update } from "./context";

export const multipleTests = ({
	LIST_TAG,
	OPT_TAG,
	IS_NATIVE,
	name,
	render,
	selectOption,
}: SuiteContext) => {
	test.describe(name("spec: multiple + predefined"), () => {
		test("datalist click adds item and reverts typed text", async ({
			page,
		}) => {
			await render(page, { multiple: true });
			await resetLog(page, "input");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.click();
			await input.fill("Tr");
			await selectOption(
				input,
				page.locator(OPT_TAG, { hasText: "Trondheim" }),
			);
			await expect(items).toHaveText(["Trondheim"]);
			await expect(input).toHaveValue("Tr");
			await expect(
				page.locator(OPT_TAG, { hasText: "Trondheim" }),
			).toHaveAttribute("selected");
			expect(await logged(page, "input")).toEqual(["Tr"]); // Reverted pick does not dispatch input
		});

		test("datalist click reverts to value attribute present on mount", async ({
			page,
			framework,
		}) => {
			test.skip(
				framework !== "vanilla",
				"Frameworks write the bound value through the property setter, which is cached by u-combobox",
			);
			await render(page, {
				multiple: true,
				value: "Tr",
				inputAttrs: { value: "Tr" },
			}); // Harness skips the property write as attribute and bound value match, so the input stays pristine
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await expect(input).toHaveValue("Tr");
			await input.click();
			await selectOption(
				input,
				page.locator(OPT_TAG, { hasText: "Trondheim" }),
			);
			await expect(items).toHaveText(["Trondheim"]);
			await expect(input).toHaveValue("Tr"); // Seeded from the attribute, not cleared
		});

		test("datalist click reverts to value attribute set on a pristine input", async ({
			page,
			framework,
		}) => {
			test.skip(
				framework !== "vanilla",
				"Frameworks write the bound value through the property setter, so the input is never pristine",
			);
			await render(page, { multiple: true, clear: true, toggle: true });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const clear = page.locator('button[type="reset"]');
			const toggle = page.locator("button[aria-expanded]");

			await expect(clear).toHaveAttribute("hidden", "");
			if (!IS_NATIVE) await expect(toggle).not.toHaveAttribute("hidden");
			await input.evaluate((el: HTMLInputElement) =>
				el.setAttribute("value", "Tr"),
			); // Changes input.value without hitting the prototype setter
			await expect(input).toHaveValue("Tr");
			await expect(clear).not.toHaveAttribute("hidden"); // Buttons sync, as the attribute write changed the live value
			await expect(toggle).toHaveAttribute("hidden", "");
			await input.click();
			await selectOption(
				input,
				page.locator(OPT_TAG, { hasText: "Trondheim" }),
			);
			await expect(items).toHaveText(["Trondheim"]);
			await expect(input).toHaveValue("Tr");
		});

		test("typing does not match", async ({ page }) => {
			await render(page, { multiple: true });
			await resetLog(page, "comboboxbeforematch");
			const input = page.locator("#input");

			await input.pressSequentially("Bergen");
			await expect(page.locator(OPT_TAG).nth(1)).not.toHaveAttribute(
				"selected",
			);
			expect(await logged(page, "comboboxbeforematch")).toEqual([]);
		});

		test("Enter adds matched item once and keeps typed text", async ({
			page,
		}) => {
			await render(page, { multiple: true });
			await resetLog(page, "comboboxbeforematch");
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const live = page.locator("[aria-live='assertive']");

			await input.fill("bergen");
			await input.press("Enter");
			await expect(items).toHaveText(["Bergen"]);
			await expect(input).toHaveValue("bergen");
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);

			await input.press("Enter");
			await settled(page);
			await expect(items).toHaveText(["Bergen"]); // Still matched, but already an item, so Enter only adds and never toggles off
			await expect(input).toHaveValue("bergen");
			await expect(live).not.toHaveText(/Invalid value/); // A matched option is never invalid
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(2);
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

			await input.fill("oslo");
			await input.press("Enter");
			await expect(items.nth(1)).toHaveAttribute("value", "oslo-id"); // Value from option
			await expect(items.nth(1)).toHaveText("Oslo"); // Label from option
			await expect(items.nth(1)).toHaveAttribute("role", "option");
			await expect(items.nth(1)).toHaveAttribute("tabindex", "-1");
			await expect(input).toBeFocused(); // Focus stays in input after adding
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(3);

			await input.fill("Oslo");
			await input.press("Enter");
			await settled(page);
			await expect(items).toHaveText(["Bergen", "Oslo"]); // Same text as the item still goes through the option, and is kept
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(4);
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);
		});

		test("Enter does not announce invalid value while the datalist is busy", async ({
			page,
		}) => {
			await render(page, { multiple: true });
			await resetLog(page, "comboboxbeforematch");
			const input = page.locator("#input");
			const list = page.locator(LIST_TAG);
			const live = page.locator("[aria-live='assertive']");
			const setBusy = (busy: boolean) =>
				list.evaluate((el, busy) => {
					if (busy) el.setAttribute("aria-busy", "true");
					else el.removeAttribute("aria-busy");
				}, busy); // Written directly, as no harness renders it and no framework removes attributes it did not set

			await setBusy(true);
			await input.fill("Nope");
			await input.press("Enter");
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Matching still runs, so a consumer can match or create
			await settled(page); // Announcements are deferred
			await expect(live).toHaveText(""); // Options are loading, so nothing to announce

			await update(page, { multiple: false }); // Syncs the input to no item
			await input.fill("Nope");
			await input.press("Enter");
			await settled(page);
			await expect(input).toHaveValue("Nope");
			await expect(live).toHaveText(""); // Also in single mode

			await setBusy(false);
			await input.press("Enter");
			await expect(live).toHaveText(/Invalid value/); // Announced once loaded
		});

		test("datalist pick toggles an already selected option off", async ({
			page,
		}) => {
			await render(page, { multiple: true, items: [BERGEN] });
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const bergen = page.locator(OPT_TAG, { hasText: "Bergen" }); // The Bergen option has no value attribute

			await input.click();
			await selectOption(input, bergen);
			await expect(items).toHaveCount(0);
			await expect(bergen).not.toHaveAttribute("selected");
			await expect(input).toHaveValue("");
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

			await selectOption(input, bergen);
			await expect(items).toHaveText(["Bergen"]); // And on again
			await expect(bergen).toHaveAttribute("selected");
		});

		test("Enter announces invalid value on no match, but does nothing on empty", async ({
			page,
		}) => {
			await render(page, { multiple: true });
			await resetLog(page, "comboboxbeforematch");
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const live = page.locator("[aria-live='assertive']");

			await input.fill("Nope");
			await input.press("Enter");
			await expect(live).toHaveText(/Invalid value/);
			await expect(items).toHaveCount(0);
			await expect(input).toHaveValue("Nope");
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]); // No match, so nothing to select

			await expect(live).toHaveText(""); // Cleared after the announcement
			await input.fill("");
			await input.press("Enter");
			await settled(page); // Announcements are deferred
			await expect(live).toHaveText(""); // Empty text is nothing in multiple mode
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Empty text never matches
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
		});

		test("blur does nothing", async ({ page }) => {
			await render(page, { multiple: true });
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");

			await input.fill("Bergen");
			await input.blur();
			await expect(input).toHaveValue("Bergen");
			await expect(page.locator("u-combobox data")).toHaveCount(0);
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
		});
	});

	test.describe(name("spec: multiple + creatable"), () => {
		test("Enter creates item and keeps typed text, blur does nothing", async ({
			page,
		}) => {
			await render(page, { multiple: true, creatable: true });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.fill("Custom");
			await input.press("Enter");
			await expect(items).toHaveText(["Custom"]);
			await expect(input).toHaveValue("Custom");

			await input.fill("Other");
			await input.blur();
			await expect(items).toHaveText(["Custom"]);
			await expect(input).toHaveValue("Other");
		});

		test("holding Enter creates the item once without toggling it off", async ({
			page,
		}) => {
			await render(page, { multiple: true, creatable: true, form: true });
			await resetLog(page, "comboboxbeforematch");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.fill("Custom");
			await page.keyboard.down("Enter");
			await page.keyboard.down("Enter"); // Playwright sets repeat: true on a second down without up, like a held key
			await page.keyboard.down("Enter");
			await page.keyboard.up("Enter");
			await expect(items).toHaveText(["Custom"]); // Committed once, so the created item does not flicker on key repeat
			await expect(input).toHaveValue("Custom");
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Matched once, as repeats are ignored
			expect(await logged(page, "submit")).toEqual([]); // Submit is still prevented on every repeat
		});
	});

	test.describe(name("spec: filter"), () => {
		test("typing filters options", async ({ page }) => {
			test.skip(IS_NATIVE, "Filtering is done by the browser");
			await render(page, { multiple: true, nofilter: false });
			const input = page.locator("#input");
			const opts = page.locator(OPT_TAG);

			await input.click();
			await input.fill("Tr");
			await expect(opts.nth(0)).toBeHidden();
			await expect(opts.nth(2)).toBeVisible();
		});
	});
};
