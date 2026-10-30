import type { Page } from "@playwright/test";
import {
	afterRendered,
	docLogged,
	gotoHarness,
	harnessHelpers,
	logged,
	resetDocLog,
	resetLog,
} from "../suite";
import { expect, test } from "../test";
import { type HarnessConfig, OPTIONS } from "./u-datalist.harness";

/**
 * Shared test suite for the u-datalist harness pages (see u-datalist.harness.ts), run against vanilla
 * DOM (u-datalist.spec.ts) and each framework (u-datalist.frameworks.spec.ts). Covers what a framework
 * can interfere with: options keyed from state, a bound input value, re-created inputs and lists,
 * and <u-option> properties. Component logic is covered by u-datalist.spec.ts.
 */

export type SuiteOptions = {
	url?: string; // Harness page, relative to the project baseURL
};

const { render, update } = harnessHelpers<HarnessConfig>();

// Record every announcement, as the live region is cleared again shortly after speaking.
// Install after focusing the input, as the live region is created on focus.
// Resolves to the spoken texts in order, without the clears and the alternating non-breaking space, which trim strips
export const recordSpoken = async (page: Page) => {
	const live = page.locator("[aria-live='assertive']");
	await live.evaluate((el) => {
		new MutationObserver(() => {
			el.dataset.spoken = `${el.dataset.spoken || ""}|${el.textContent}`;
		}).observe(el, { childList: true, characterData: true, subtree: true });
	});
	return () =>
		live.evaluate((el) =>
			(el.dataset.spoken || "")
				.split("|")
				.map((text) => text.trim())
				.filter(Boolean),
		);
};

// Opening the list clears a pending announcement in a timeout, which keys or mutations dispatched without a gap would precede.
// A timeout queued after it resolves once it has run, also when the browser defers timers after input
export const opened = (page: Page) =>
	page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));

export const datalistSuite = ({
	url = "test.html?component=u-datalist",
}: SuiteOptions = {}) => {
	test.describe("harness", () => {
		test.beforeEach(({ page }) => gotoHarness(page, url));

		test("connects the input to options rendered from state", async ({
			page,
		}) => {
			await render(page);
			const input = page.locator("#input");
			const datalist = page.locator("u-datalist");

			await expect(datalist).toBeHidden();
			await expect(page.locator("u-option")).toHaveCount(3);
			await input.click();
			await expect(datalist).toBeVisible();
			await expect(input).toHaveRole("combobox");
			await expect(input).toHaveAttribute("aria-controls", "list");
			await expect(input).toHaveAttribute("aria-expanded", "true");
			await expect(page.locator("u-option").nth(1)).toHaveText("Option 2");
		});

		test("follows its id when changed from state", async ({ page }) => {
			await render(page);
			const input = page.locator("#input");
			const datalist = page.locator("u-datalist");

			await input.click();
			await expect(input).toHaveAttribute("aria-controls", "list");
			await update(page, { listId: "renamed" }); // The input list follows, as list is null
			await expect(datalist).toHaveAttribute("id", "renamed");
			await expect(input).toHaveAttribute("list", "renamed");
			await expect(input).toHaveAttribute("aria-controls", "renamed");
			await expect(input).toHaveAttribute("role", "combobox");

			await input.press("ArrowDown"); // Still connected, or connects again if the id was written before the list attribute
			await expect(datalist).toBeVisible();
			await expect(input).toHaveAttribute("aria-expanded", "true");
		});

		test("resets an input left pointing to its previous id", async ({
			page,
		}) => {
			await render(page, { list: "list" });
			const input = page.locator("#input");
			const datalist = page.locator("u-datalist");

			await input.click();
			await expect(datalist).toBeVisible();
			await update(page, { listId: "renamed" }); // The input keeps list="list"
			await expect(datalist).toHaveAttribute("id", "renamed");
			await expect(datalist).toBeHidden();
			await expect(input).not.toHaveAttribute("aria-controls");
			await expect(input).not.toHaveAttribute("aria-expanded");
			await expect(input).not.toHaveAttribute("role");

			await input.press("ArrowDown"); // No longer connected
			await expect(datalist).toBeHidden();

			await update(page, { list: "renamed" });
			await input.press("ArrowDown"); // Connects again on interaction
			await expect(datalist).toBeVisible();
			await expect(input).toHaveAttribute("aria-controls", "renamed");
		});

		test("resets an unfocused input left pointing to its previous id", async ({
			page,
		}) => {
			await render(page, { list: "list", inputs: 2 });
			const second = page.locator("#input-2");

			await expect(second).toHaveAttribute("role", "combobox"); // Set up without focus
			await update(page, { listId: "renamed" }); // The inputs keep list="list"
			await expect(page.locator("u-datalist")).toHaveAttribute("id", "renamed");
			await expect(second).not.toHaveAttribute("aria-controls");
			await expect(second).not.toHaveAttribute("aria-expanded");
			await expect(second).not.toHaveAttribute("role");
		});

		test("resets every input when the list is removed", async ({ page }) => {
			await render(page, { inputs: 2 });
			const first = page.locator("#input");
			const second = page.locator("#input-2");

			await first.click();
			await expect(second).toHaveAttribute("role", "combobox");
			await update(page, { options: null }); // Renders no datalist
			await expect(page.locator("u-datalist")).toHaveCount(0);
			for (const input of [first, second]) {
				await expect(input).not.toHaveAttribute("aria-controls");
				await expect(input).not.toHaveAttribute("aria-expanded");
				await expect(input).not.toHaveAttribute("role");
			}
		});

		test("picks with click and keyboard, updating the bound value through the framework", async ({
			page,
		}) => {
			await render(page);
			await resetDocLog(page);
			const input = page.locator("#input");
			const datalist = page.locator("u-datalist");

			await input.click();
			await page.locator("u-option").nth(1).click();
			await expect(input).toHaveValue("Option 2");
			await expect(datalist).toBeHidden();
			await afterRendered(page); // The framework renders the bound value, which must not revert the pick
			await expect(input).toHaveValue("Option 2");
			expect(await logged(page, "input")).toEqual(["Option 2"]); // The framework input binding received the pick
			expect(await docLogged(page, "change")).toEqual(["Option 2"]);

			await input.click();
			await input.press("ArrowDown");
			await input.press("ArrowDown");
			await input.press("ArrowDown");
			await input.press("Enter");
			await expect(input).toHaveValue("Option 3");
			await expect(datalist).toBeHidden();
			expect(await logged(page, "input")).toEqual(["Option 2", "Option 3"]);
			expect(await docLogged(page, "change")).toEqual(["Option 2", "Option 3"]);
		});

		test("filters typed text, also against options replaced from state while open", async ({
			page,
		}) => {
			await render(page, { nofilter: false });
			const input = page.locator("#input");
			const options = page.locator("u-option");

			await input.click();
			await input.pressSequentially("2");
			await expect(options.nth(1)).toBeVisible();
			await expect(options.nth(0)).toBeHidden();

			await update(page, {
				options: [
					{ key: "4", text: "Option 22" },
					{ key: "5", text: "Other" },
				],
			}); // New keys, so the framework creates new elements, like async search results
			await expect(options).toHaveCount(2);
			await expect(options.nth(0)).toBeVisible();
			await expect(options.nth(1)).toBeHidden(); // Filtered as soon as rendered
			await expect(page.locator("u-datalist")).toBeVisible();

			await page.locator("u-option").nth(0).click();
			await expect(input).toHaveValue("Option 22");
		});

		test("filters on a value written from state when the list opens", async ({
			page,
		}) => {
			await render(page, { nofilter: false, value: "3" });
			const input = page.locator("#input");
			const options = page.locator("u-option");

			await expect(input).toHaveValue("3");
			await input.click();
			await expect(options.nth(2)).toBeVisible();
			await expect(options.nth(0)).toBeHidden();

			await input.press("Escape");
			await update(page, { value: "1" }); // Programmatic write from state
			await input.click();
			await expect(options.nth(0)).toBeVisible();
			await expect(options.nth(2)).toBeHidden();
		});

		test("updates options patched in place while open", async ({ page }) => {
			await render(page, { nofilter: false });
			const input = page.locator("#input");
			const options = page.locator("u-option");

			await input.click();
			await update(page, {
				options: OPTIONS.map((option) =>
					option.key === "1" ? { ...option, text: "Changed" } : option,
				),
			}); // Same keys, so the framework patches the text in place
			await expect(options.nth(0)).toHaveText("Changed");
			await input.pressSequentially("Chan");
			await expect(options.nth(0)).toBeVisible();
			await expect(options.nth(1)).toBeHidden();

			await update(page, {
				options: OPTIONS.map((option) =>
					option.key === "2" ? { ...option, hidden: true } : option,
				),
			});
			await input.fill("");
			await expect(options.nth(0)).toBeVisible();
			await expect(options.nth(1)).toBeHidden(); // hidden rendered as a property from state
			await expect(options.nth(2)).toBeVisible();
		});

		test("announces the aria-setsize total rendered from state", async ({
			page,
		}) => {
			const sized = (setsize: number, keys = ["1", "2", "3"]) =>
				keys.map((key, index) => ({
					key,
					text: `Option ${index + 1}`,
					posinset: index + 1,
					setsize,
				}));
			await render(page, { options: sized(120) });
			const input = page.locator("#input");

			await input.click();
			const spoken = await recordSpoken(page);
			await opened(page);

			await input.press("x");
			await expect.poll(spoken).toEqual(["120 hits"]); // The total, not the 3 rendered options

			await update(page, { options: sized(120, ["4", "5", "6"]) }); // Fresh elements with the same total
			await page.waitForTimeout(700); // Past the 500ms announcement timer
			expect(await spoken()).toEqual(["120 hits"]); // Same query and total, so nothing new to announce

			await update(page, { options: sized(121, ["4", "5", "6"]) });
			await expect.poll(spoken).toEqual(["120 hits", "121 hits"]); // A new total is announced
		});

		test("connects a datalist rendered after the input has focus", async ({
			page,
		}) => {
			await render(page, { options: null });
			const input = page.locator("#input");

			await input.click();
			await expect(page.locator("u-datalist")).toHaveCount(0);
			await expect(input).not.toHaveAttribute("role");

			await update(page, { options: OPTIONS }); // Rendered while focused, i.e. once results arrive
			await input.click();
			await expect(page.locator("u-datalist")).toBeVisible();
			await expect(input).toHaveRole("combobox");
			await expect(input).toHaveAttribute("aria-controls", "list");
		});

		test("follows the list attribute to another datalist", async ({ page }) => {
			await render(page, {
				options2: [{ key: "a", text: "Second 1" }],
			});
			const input = page.locator("#input");
			const first = page.locator("#list");
			const second = page.locator("#list-2");

			await input.click();
			await expect(first).toBeVisible();
			await expect(second).toBeHidden();
			await input.blur(); // The list attribute is read when the input gains focus, so a change while focused takes effect on the next focus

			await update(page, { list: "list-2" });
			await input.click();
			await expect(second).toBeVisible();
			await expect(first).toBeHidden();
			await expect(input).toHaveAttribute("aria-controls", "list-2");
			await second.locator("u-option").click();
			await expect(input).toHaveValue("Second 1");
		});

		test("connects a re-created input", async ({ page }) => {
			await render(page);
			const input = page.locator("#input");
			const datalist = page.locator("u-datalist");

			await input.click();
			await expect(datalist).toBeVisible();
			await update(page, { inputKey: 1 }); // The framework replaces the focused input element
			await expect(page.locator("input")).toHaveCount(1);
			await expect(input).not.toBeFocused();
			// Whether the list closes here differs between browsers: Chromium dispatches focusout when a focused element is removed,
			// Firefox and WebKit do not, so the list stays open until the next focus change, and a pick from that stale list only closes it
			if (page.context().browser()?.browserType().name() === "chromium") {
				await expect(datalist).toBeHidden();
			} else {
				await expect(datalist).toBeVisible();
				await page.locator("u-option").nth(0).click();
				await expect(datalist).toBeHidden();
				await expect(input).toHaveValue("");
			}

			await input.click();
			await expect(datalist).toBeVisible();
			await expect(input).toHaveRole("combobox");
			await page.locator("u-option").nth(0).click();
			await expect(input).toHaveValue("Option 1");
		});

		test("reflects u-option properties rendered from state", async ({
			page,
		}) => {
			const option = (extra: Partial<(typeof OPTIONS)[number]>) => [
				{ key: "1", text: "Option 1", ...extra },
			];
			await render(page, {
				options: option({
					value: "value-1",
					label: "Label 1",
					selected: true,
					disabled: true,
				}),
			});
			const opt = page.locator("u-option");

			await expect(opt).toHaveAttribute("value", "value-1");
			await expect(opt).toHaveAttribute("label", "Label 1");
			await expect(opt).toHaveAttribute("aria-selected", "true");
			await expect(opt).toHaveAttribute("aria-disabled", "true");
			await expect(opt).toHaveJSProperty("selected", true);
			await expect(opt).toHaveJSProperty("disabled", true);

			await update(page, {
				options: option({ value: "value-2", label: "Label 2" }),
			}); // Booleans dropped from state, which frameworks write as false, so the attributes must go
			await expect(opt).toHaveAttribute("value", "value-2");
			await expect(opt).toHaveAttribute("label", "Label 2");
			await expect(opt).toHaveAttribute("aria-selected", "false");
			await expect(opt).toHaveAttribute("aria-disabled", "false");
			await expect(opt).toHaveJSProperty("label", "Label 2");

			await page.locator("#input").click();
			await opt.click();
			await expect(page.locator("#input")).toHaveValue("value-2");
		});

		test("does not open when readonly or disabled from state", async ({
			page,
		}) => {
			await render(page, { inputAttrs: { readonly: "" } });
			const input = page.locator("#input");
			const datalist = page.locator("u-datalist");

			await input.click();
			await expect(datalist).toBeHidden();
			await update(page, { inputAttrs: {} });
			await input.click();
			await expect(datalist).toBeVisible();

			await input.press("Escape");
			await update(page, { inputAttrs: { disabled: "" } });
			await expect(input).toBeDisabled();
			await input.click({ force: true });
			await expect(datalist).toBeHidden();
		});

		test("binds two inputs rendered from state to one list", async ({
			page,
		}) => {
			await render(page, { inputs: 2 });
			const first = page.locator("#input");
			const second = page.locator("#input-2");
			const datalist = page.locator("u-datalist");

			await first.click();
			await expect(datalist).toBeVisible();
			await expect(first).toHaveAttribute("aria-controls", "list");

			await second.click();
			await expect(datalist).toBeVisible();
			await expect(second).toHaveAttribute("aria-controls", "list");
			await expect(first).toHaveAttribute("aria-controls", "list"); // Inputs sharing the list keep their combobox setup
			await expect(first).toHaveAttribute("aria-expanded", "false");
			await expect(first).toHaveAttribute("role", "combobox");
			await page.locator("u-option").nth(2).click();
			await expect(second).toHaveValue("Option 3");
			await expect(first).toHaveValue("");
		});

		test("keeps the list open on pick when multiselectable", async ({
			page,
		}) => {
			await render(page, {
				attrs: {
					"aria-multiselectable": "true",
					"data-multiselectable": "true", // What Android reads, see SAFE_MULTISELECTABLE
				},
			});
			await resetLog(page, "input");
			const input = page.locator("#input");
			const datalist = page.locator("u-datalist");

			await input.click();
			await page.locator("u-option").nth(0).click();
			await expect(input).toHaveValue("Option 1");
			await expect(datalist).toBeVisible();
			await page.locator("u-option").nth(1).click();
			await expect(input).toHaveValue("Option 2");
			await expect(datalist).toBeVisible();
			expect(await logged(page, "input")).toEqual(["Option 1", "Option 2"]);
		});

		test("resets the input when the datalist is unmounted", async ({
			page,
		}) => {
			await render(page);
			const input = page.locator("#input");

			await input.click();
			await expect(page.locator("u-datalist")).toBeVisible();
			await expect(input).toHaveRole("combobox");

			await update(page, { options: null });
			await expect(page.locator("u-datalist")).toHaveCount(0);
			await expect(input).not.toHaveAttribute("role");
			await expect(input).not.toHaveAttribute("aria-controls");
			await expect(input).not.toHaveAttribute("aria-expanded");
			await expect(input).toBeFocused();
		});

		test("works after unmount and remount", async ({ page }) => {
			await render(page);
			const input = page.locator("#input");

			await update(page, { mounted: false });
			await expect(page.locator("u-datalist")).toHaveCount(0);
			await update(page, { mounted: true });
			await input.click();
			await expect(page.locator("u-datalist")).toBeVisible();
			await page.locator("u-option").nth(0).click();
			await expect(input).toHaveValue("Option 1");
		});
	});
};
