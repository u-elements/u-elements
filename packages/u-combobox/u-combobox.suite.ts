import { expect, type Locator, type Page, test } from "@playwright/test";
import type { UHTMLComboboxElement } from "./u-combobox";
import {
	type HarnessPatch,
	ITEMS,
	OPTIONS,
	type Option,
} from "./u-combobox.harness";

/**
 * Shared test suite for the harness pages (see u-combobox.harness.ts), run against
 * vanilla DOM (u-combobox.spec.ts) and each framework (u-combobox.<framework>.spec.ts).
 * Items are rendered from state, the input value is bound, and all events are handled
 * with the renderer's event bindings. Pure DOM tests (snapshot, shadow root host, moving
 * the element) live in u-combobox.spec.ts.
 *
 * Every test runs with both native <datalist> and <u-datalist>.
 * Native <datalist> picks are simulated with setRangeText + InputEvent("insertReplacementText"),
 * as Playwright can not interact with the native suggestion popup.
 */

export type SuiteOptions = {
	url?: string; // Harness page, relative to the project baseURL
	defaults?: HarnessPatch; // Applied to every render, i.e. { controlled: false } to let the component manage items
};

const BERGEN = { value: "Bergen", label: "Bergen" } as const;
const OSLO = { value: "oslo-id", label: "Oslo" } as const;

const setCaretStart = (input: Node) => {
	(input as HTMLInputElement).selectionStart = (
		input as HTMLInputElement
	).selectionEnd = 0;
};

const update = (page: Page, patch: HarnessPatch, index = 0) =>
	page.evaluate(([patch, index]) => window.harness.update(patch, index), [
		patch,
		index,
	] as const);

const resetLog = (page: Page, type: string) =>
	page.evaluate((type) => window.harness.resetLog(type), type);

const logged = (page: Page, type: string) =>
	page.evaluate((type) => window.__log?.[type] || [], type);

const resetDocLog = (page: Page) =>
	page.evaluate(() => window.harness.resetDocLog());

const docLogged = (page: Page, type: string) =>
	page.evaluate((type) => window.__doclog?.[type] || [], type);

export const comboboxSuite = (
	framework: string,
	{ url = "test.u-combobox.html", defaults = {} }: SuiteOptions = {},
) => {
	test.describe(framework, () => {
		test.beforeEach(async ({ page }) => {
			await page.goto(url);
			await page.waitForFunction(() => !!window.harness);
		});

		for (const LIST_TAG of ["u-datalist", "datalist"] as const) {
			const OPT_TAG = LIST_TAG === "u-datalist" ? "u-option" : "option";
			const IS_NATIVE = LIST_TAG === "datalist";
			const name = (group: string) => `${group} (${LIST_TAG})`;

			const render = (page: Page, cfg: HarnessPatch | HarnessPatch[] = {}) =>
				page.evaluate(
					([cfg, listTag, defaults]) =>
						window.harness.render(
							Array.isArray(cfg)
								? cfg.map((c) => ({ listTag, ...defaults, ...c }))
								: { listTag, ...defaults, ...cfg },
						),
					[cfg, LIST_TAG, defaults] as const,
				);

			const selectOption = async (input: Locator, opt: Locator) => {
				if (IS_NATIVE) {
					// A real native <datalist> pick updates the value inside the browser without
					// going through the (patched) HTMLInputElement.prototype.value setter.
					const optElement = await opt.elementHandle();
					await input.evaluate((input: HTMLInputElement, opt: Element) => {
						const inputType = "insertReplacementText";
						const data = (opt as HTMLOptionElement).value;
						const event = { bubbles: true, composed: true, data, inputType };
						const type = input.type; // Types without selection support (i.e. email) can not use setRangeText, so write the value as type="text"

						input.type = "text";
						input.setRangeText(data, 0, input.value.length);
						input.type = type;
						input.dispatchEvent(new InputEvent("input", event));
						input.dispatchEvent(new Event("change", { bubbles: true }));
					}, optElement);
				} else {
					await expect(opt).toBeVisible();
					await opt.click();
				}
			};

			test.describe(name("setup"), () => {
				test("is defined and exposes control, list, items and values", async ({
					page,
				}) => {
					await render(page, { multiple: true, items: ITEMS });
					expect(
						await page
							.locator("u-combobox")
							.evaluate((el: UHTMLComboboxElement) => {
								const items = el.querySelectorAll("data");
								return (
									el instanceof (customElements.get("u-combobox") as never) &&
									el.control === el.querySelector("input") &&
									el.list === el.querySelector("datalist,u-datalist") &&
									el.items.length === items.length &&
									[...el.items].every((item, index) => item === items[index]) &&
									el.values.join() === "oslo-id,Bergen,Trondheim"
								);
							}),
					).toBe(true);
				});

				test("sets up attributes on input, items and options", async ({
					page,
				}) => {
					const { name } = test.info().project;
					const IS_IOS = name === "Mobile Safari";
					const IS_ANDROID = name === "Mobile Chrome";
					await render(page, { multiple: true, items: [OSLO, BERGEN] });
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");
					const opts = page.locator(OPT_TAG);

					await expect(input).toHaveAttribute(
						"aria-description",
						"Navigate left to find 2 selected",
					);
					await expect(input).toHaveAttribute("list", "input-list");
					await expect(page.locator(LIST_TAG)).toHaveAttribute(
						`${IS_ANDROID ? "data" : "aria"}-multiselectable`,
						"true",
					);
					await expect(opts.nth(0)).toHaveAttribute("selected");
					await expect(opts.nth(1)).toHaveAttribute("selected");
					await expect(opts.nth(2)).not.toHaveAttribute("selected");
					await expect(items.nth(0)).toHaveAttribute("value", "oslo-id");
					await expect(items.nth(1)).toHaveAttribute("value", "Bergen");

					for (const [index, text] of ["Oslo", "Bergen"].entries()) {
						const item = items.nth(index);
						const label = `${text}, Press to remove${IS_IOS ? `, ${index + 1} of 2` : ""}`;
						await expect(item).toHaveAttribute("role", "option");
						await expect(item).toHaveAttribute("tabindex", "-1");
						await expect(item).toHaveAttribute("slot", "items");
						await expect(item).toHaveAttribute("aria-label", label);
					}
				});

				test("sets up attributes on clear and toggle buttons added dynamically", async ({
					page,
				}) => {
					const { name } = test.info().project;
					const ariaHidden = `${name === "Mobile Safari" || name === "Mobile Chrome"}`;
					await render(page);
					const clear = page.locator('button[type="reset"]');
					const toggle = page.locator("button[aria-expanded]");

					await update(page, { clear: true, toggle: true }); // Rendered by the framework after mount

					await expect(clear).toHaveAttribute("aria-label", "Clear input");
					await expect(clear).toHaveAttribute("aria-hidden", ariaHidden);
					await expect(clear).toHaveAttribute("hidden", "");
					await expect(clear).toHaveAttribute("tabindex", "-1");

					await expect(toggle).toHaveAttribute("aria-label", "Options");
					await expect(toggle).toHaveAttribute("aria-hidden", ariaHidden);
					await expect(toggle).toHaveAttribute("aria-expanded", "false");
					await expect(toggle).toHaveAttribute("tabindex", "-1");
					await expect(toggle).toHaveAttribute("type", "button");
					if (IS_NATIVE) await expect(toggle).toHaveAttribute("hidden", "");
					else await expect(toggle).not.toHaveAttribute("hidden");
				});

				test("shows and hides clear button when bound value changes", async ({
					page,
				}) => {
					await render(page, { clear: true });
					const input = page.locator("#input");
					const clear = page.locator('button[type="reset"]');

					await expect(clear).toHaveAttribute("hidden", "");
					await update(page, { value: "Programmatic" }); // Framework writes input.value
					await expect(input).toHaveValue("Programmatic");
					await expect(clear).not.toHaveAttribute("hidden");

					await update(page, { value: "" });
					await expect(input).toHaveValue("");
					await expect(clear).toHaveAttribute("hidden", "");
				});

				test("handles multiple u-combobox on same page", async ({ page }) => {
					await render(page, [
						{ multiple: true, items: [BERGEN] },
						{
							id: "second",
							clear: true,
							options: [{ text: "Second 1" }, { text: "Second 2" }],
						},
					]);
					await update(
						page,
						{ items: [{ value: "Second 1", label: "Second 1" }] },
						1,
					);
					const firstInput = page.locator("#input");
					const secondInput = page.locator("#second");
					const firstData = page.locator("u-combobox:has(#input) data");
					const secondData = page.locator("u-combobox:has(#second) data");

					await expect(secondInput).toHaveValue("Second 1");
					await secondInput.focus();
					await page
						.locator('u-combobox:has(#second) button[type="reset"]')
						.click();
					await expect(secondData).toHaveCount(0);
					await expect(secondInput).toHaveValue("");
					await expect(firstData).toHaveText(["Bergen"]); // Other instance untouched

					await firstInput.focus();
					await expect(firstInput).toBeFocused();
				});

				test("focuses input when clicking host or label", async ({ page }) => {
					await render(page, { multiple: true }); // No items, as a chip at the click point would receive the click instead
					const input = page.locator("#input");

					await page.locator("u-combobox").click();
					await expect(input).toBeFocused();
					await input.blur();
					await page.locator('label[for="input"]').click();
					await expect(input).toBeFocused();
				});
			});

			test.describe(name("spec: single + predefined"), () => {
				test("datalist click adds item and shows option label", async ({
					page,
				}) => {
					await render(page);
					await resetLog(page, "input");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");

					await input.click();
					await selectOption(
						input,
						page.locator(`${OPT_TAG}[value="oslo-id"]`),
					);
					await expect(item).toHaveAttribute("value", "oslo-id");
					await expect(item).toHaveText("Oslo");
					await expect(input).toHaveValue("Oslo"); // Label, not value

					// Frameworks must receive input events in single mode, also when label equals value
					await input.click();
					await selectOption(input, page.locator(OPT_TAG).nth(1));
					await expect(item).toHaveText("Bergen");
					await expect(input).toHaveValue("Bergen");
					await expect
						.poll(() => logged(page, "input"))
						.toEqual(["Oslo", "Bergen"]);
				});

				test("typing never matches, Enter and blur match trimmed and case insensitive", async ({
					page,
				}) => {
					await render(page);
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");
					const opts = page.locator(OPT_TAG);

					await input.pressSequentially("bergen");
					await expect(opts.nth(1)).not.toHaveAttribute("selected"); // Matching only happens on Enter and blur
					expect(await logged(page, "comboboxbeforematch")).toEqual([]);

					await input.blur();
					await expect(items).toHaveText(["Bergen"]); // Blur matches case insensitive
					await expect(input).toHaveValue("Bergen");
					await expect(opts.nth(1)).toHaveAttribute("selected");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

					await input.click();
					await input.fill(" oslo ");
					await input.press("Enter");
					await expect(items).toHaveText(["Oslo"]); // Enter matches trimmed and case insensitive
					await expect(input).toHaveValue("Oslo");
					await expect(opts.nth(0)).toHaveAttribute("selected");
					await expect(opts.nth(1)).not.toHaveAttribute("selected");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(2);
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);
				});

				test("Enter matches, keeps text and announces on no match, and clears on empty", async ({
					page,
				}) => {
					await render(page);
					await resetLog(page, "comboboxbeforematch");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");
					const live = page.locator("[aria-live='assertive']");

					await input.fill("trondheim");
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveAttribute("value", "Trondheim");
					await expect(input).toHaveValue("Trondheim");

					await input.fill("unknown");
					await input.press("Enter");
					await expect(items).toHaveText(["Trondheim"]); // Unchanged
					await expect(input).toHaveValue("unknown"); // Typed text stays until blur
					await expect(live).toHaveText(/Invalid value/);
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(2);

					await input.blur();
					await expect(input).toHaveValue("Trondheim"); // Blur matches again, finds nothing and syncs to the item
					await expect(items).toHaveText(["Trondheim"]);
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(3);

					await input.click();
					await input.fill("");
					await input.press("Enter");
					await expect(items).toHaveCount(0); // Cleared
					await expect(input).toHaveValue("");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(3); // Empty text never matches
				});

				test("Enter on text equal to current item does nothing", async ({
					page,
				}) => {
					await render(page);
					await update(page, {
						items: [{ value: "Trondheim", label: "Trondheim" }],
					});
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await expect(input).toHaveValue("Trondheim");
					await input.fill("Trondheim");
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(input).toHaveValue("Trondheim");

					await input.fill(" Trondheim ");
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(input).toHaveValue(" Trondheim "); // Same text compares trimmed, and the text is already the item so nothing is synced
					expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Same text never matches
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]); // And never re-selects

					await input.fill("trondheim");
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(input).toHaveValue("Trondheim"); // Items compare case sensitive, so this matches the option instead, which is the current item and syncs
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
				});

				test("Enter syncs input when the match is the current item", async ({
					page,
				}) => {
					await render(page, {
						items: [{ value: "oslo-id", label: "Oslo city" }],
					}); // Item text differs from the option label, so the text is not the same text, but the match has the same value
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");
					await expect(input).toHaveValue("Oslo city");

					await input.fill("oslo");
					await input.press("Enter");
					await expect(item).toHaveAttribute("value", "oslo-id");
					await expect(input).toHaveValue("Oslo city"); // Synced from the item, not the option label
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]); // Matching the current item is not a select
				});

				test("datalist pick of the current item only syncs input", async ({
					page,
				}) => {
					await render(page, { items: [OSLO] });
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");
					await expect(input).toHaveValue("Oslo");

					await input.click();
					await input.fill("os");
					await selectOption(
						input,
						page.locator(`${OPT_TAG}[value="oslo-id"]`),
					);
					await expect(item).toHaveAttribute("value", "oslo-id");
					await expect(input).toHaveValue("Oslo"); // Synced back from the item
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
					expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Picks never match
				});

				test("blur matches, reverts on no match and clears on empty", async ({
					page,
				}) => {
					await render(page);
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.fill("unknown");
					await input.blur();
					await expect(input).toHaveValue(""); // No item to revert to
					await expect(items).toHaveCount(0);
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Blur matches like Enter
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]); // No match, so nothing to select

					await input.fill("bergen");
					await input.press("Enter");
					await expect(items).toHaveText(["Bergen"]);
					await expect(input).toHaveValue("Bergen");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(2);

					await input.fill("unknown");
					await input.blur();
					await expect(items).toHaveText(["Bergen"]);
					await expect(input).toHaveValue("Bergen"); // Reverted to the item
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(3);
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1); // Only Enter selected

					await input.fill("oslo"); // Case insensitive option label
					await input.blur();
					await expect(items).toHaveText(["Oslo"]); // Selected on blur
					await expect(input).toHaveValue("Oslo");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(4);
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);

					await input.fill("");
					await input.blur();
					await expect(items).toHaveCount(0); // Cleared
					await expect(input).toHaveValue("");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(4); // Empty text never matches
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(3); // Removal is a select, so it can be prevented
				});

				test("Enter matches options added after typing", async ({ page }) => {
					await render(page, { options: [{ text: "Other" }] });
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.fill("Bergen"); // No match yet
					await update(page, {
						options: [{ text: "Other" }, { text: "Bergen" }],
					}); // Framework renders the new option
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveText("Bergen");
				});

				test("Enter matches against current options when options are replaced after typing", async ({
					page,
				}) => {
					await render(page);
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.pressSequentially("Bergen"); // Would match, but matching is deferred
					await update(page, { options: [{ text: "Other" }] }); // Fetch resolves and replaces options, so the text is no longer in the list
					await input.press("Enter");
					await expect(items).toHaveCount(0); // No match in the current options, so nothing is selected
					await expect(input).toHaveValue("Bergen"); // Typed text stays until blur

					await update(page, { options: OPTIONS });
					await input.click();
					await input.fill("Oslo");
					await update(page, {
						options: [{ text: "Other" }, { text: "Oslo" }],
					}); // Replacement still contains the typed text
					await input.press("Enter");
					await expect(items).toHaveText(["Oslo"]);
				});

				test("Enter matches typed text that was changed programmatically", async ({
					page,
				}) => {
					await render(page);
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.pressSequentially("Bergen");
					await update(page, { value: "Oslo" }); // Programmatic write changes the text, so no state from typing must be used
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveText("Oslo");
				});

				test("Enter and blur match value set through the framework", async ({
					page,
				}) => {
					await render(page);
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.focus();
					await update(page, { value: "Bergen" }); // Bound value write is programmatic
					await expect(input).toHaveValue("Bergen");
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveText("Bergen");

					await update(page, { value: "Oslo" }); // Programmatic text is matched like typed text
					await input.blur();
					await expect(items).toHaveText(["Oslo"]);
					await expect(input).toHaveValue("Oslo");

					await update(page, { value: "unknown" });
					await input.focus();
					await input.blur();
					await expect(items).toHaveText(["Oslo"]);
					await expect(input).toHaveValue("Oslo"); // Reverted
				});

				test("blur keeps picked option after a shorter typed match and with equal labels", async ({
					page,
				}) => {
					await render(page, {
						options: [
							{ value: "Oslo", text: "Oslo" },
							{ value: "Oslo Lufthavn", text: "Oslo Lufthavn" },
							{ label: "Same text", value: "same-1", text: "same-1" },
							{ label: "Same text", value: "same-2", text: "same-2" },
						],
					});
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");

					await input.click();
					await input.fill("Oslo"); // Exact match of the shorter option is cached as typing match
					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "Oslo Lufthavn" }),
					);
					await expect(item).toHaveText("Oslo Lufthavn");
					await expect(input).toHaveValue("Oslo Lufthavn");
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");

					await input.blur();
					await expect(item).toHaveText("Oslo Lufthavn"); // Must not revert to the earlier typed match
					await expect(input).toHaveValue("Oslo Lufthavn");
					expect(await logged(page, "comboboxbeforematch")).toEqual([]);
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]);

					await input.click();
					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "same-2" }),
					);
					await expect(item).toHaveAttribute("value", "same-2");
					await expect(input).toHaveValue("Same text");

					await input.blur();
					await expect(item).toHaveAttribute("value", "same-2"); // Must not re-match to the first option with the same label
					expect(await logged(page, "comboboxbeforematch")).toEqual([]);
				});

				test("syncs input on pick between options with equal labels", async ({
					page,
				}) => {
					await render(page, {
						options: [
							{ label: "Same text", value: "same-1", text: "same-1" },
							{ label: "Same text", value: "same-2", text: "same-2" },
						],
						items: [{ value: "same-1", label: "Same text" }],
					});
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");
					await expect(input).toHaveValue("Same text");

					await input.click();
					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "same-2" }),
					);
					await expect(item).toHaveAttribute("value", "same-2");
					await expect(input).toHaveValue("Same text"); // Only the value changed, but input must still sync from the picked value to the label
					await resetLog(page, "comboboxbeforematch");

					await input.blur();
					await expect(input).toHaveValue("Same text");
					await expect(item).toHaveAttribute("value", "same-2");
					expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Input already matches the item, so blur must not re-match
				});

				test("blur keeps current item when typing away and back to its label with equal labels", async ({
					page,
				}) => {
					await render(page, {
						options: [
							{ label: "Same text", value: "same-1", text: "same-1" },
							{ label: "Same text", value: "same-2", text: "same-2" },
						],
						items: [{ value: "same-2", label: "Same text" }],
					});
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");
					await expect(input).toHaveValue("Same text");

					await input.click();
					await input.fill("Same"); // Typing away from the current item
					await input.fill("Same text"); // Typing back caches the first option with the same label
					await resetLog(page, "comboboxbeforeselect");

					await input.blur();
					await expect(item).toHaveAttribute("value", "same-2"); // Value equals current item text, so cached match must be ignored
					await expect(item).toHaveCount(1);
					await expect(input).toHaveValue("Same text");
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
				});
			});

			test.describe(name("events and state"), () => {
				test("dispatches input only for the synced value on option click in single mode", async ({
					page,
				}) => {
					await render(page);
					await resetDocLog(page);
					const input = page.locator("#input");

					await input.pressSequentially("Ber");
					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "Bergen" }),
					);
					await expect(input).toHaveValue("Bergen");
					await expect
						.poll(() => docLogged(page, "input"))
						.toEqual(["B", "Be", "Ber", "Bergen"]); // The click input is stopped, the sync dispatches its own
					expect((await docLogged(page, "change")).slice(-1)).toEqual([
						"Bergen",
					]); // The sync dispatches change last. Earlier change events from the browser or datalist are not suppressed
				});

				test("dispatches no input on option click in multiple mode", async ({
					page,
				}) => {
					await render(page, { multiple: true });
					await resetDocLog(page);
					const input = page.locator("#input");

					await input.pressSequentially("Ber");
					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "Bergen" }),
					);
					await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
					await expect(input).toHaveValue("Ber");
					await page.waitForTimeout(50);
					expect(await docLogged(page, "input")).toEqual(["B", "Be", "Ber"]); // The click input is stopped, and the reverted text dispatches nothing
				});

				test("keeps option selected after non-matching Enter in single mode", async ({
					page,
				}) => {
					await render(page, { items: [BERGEN] });
					const input = page.locator("#input");
					const bergen = page.locator(OPT_TAG, { hasText: "Bergen" });

					await expect(input).toHaveValue("Bergen");
					await expect(bergen).toHaveAttribute("selected");
					await input.fill("xyz");
					await input.press("Enter");
					await expect(input).toHaveValue("xyz"); // Typed text stays until blur
					await expect(bergen).toHaveAttribute("selected"); // Still reflects the item while the list is open
					await expect(page.locator(OPT_TAG).first()).not.toHaveAttribute(
						"selected",
					);

					await input.blur();
					await expect(input).toHaveValue("Bergen"); // Synced to the item on blur
					await expect(bergen).toHaveAttribute("selected");
				});

				test("syncs after form reset", async ({ page }) => {
					test.skip(
						framework === "React",
						"React keeps the value attribute of a controlled input in sync, so form.reset() restores the current value and there is nothing to sync",
					);
					await render(page, {
						multiple: true,
						form: true,
						items: [BERGEN],
						clear: true,
					});
					const input = page.locator("#input");
					const clear = page.locator('button[type="reset"]');
					const reset = () =>
						page.evaluate(() =>
							(document.getElementById("form") as HTMLFormElement).reset(),
						);

					await input.fill("abc");
					await expect(clear).not.toHaveAttribute("hidden");
					await reset();
					await expect(input).toHaveValue("");
					await expect(clear).toHaveAttribute("hidden", ""); // Reset neither calls the value setter nor dispatches input, so the component listens for reset
					await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]); // Items are not form controls

					await update(page, { multiple: false });
					await expect(input).toHaveValue("Bergen");
					await input.fill("abc");
					await reset();
					await expect(input).toHaveValue("Bergen"); // Single mode keeps mirroring the item
					await expect(clear).not.toHaveAttribute("hidden");
				});

				test("selects option on click in type=email where selection is unsupported", async ({
					page,
				}) => {
					await render(page, { multiple: true, inputAttrs: { type: "email" } });
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.pressSequentially("B");
					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "Bergen" }),
					);
					await expect(items).toHaveText(["Bergen"]);
					await expect(input).toHaveValue("B"); // Reverted through the native setter, as setRangeText is not supported

					await update(page, { multiple: false });
					await expect(input).toHaveValue("Bergen"); // Synced through the native setter
					await selectOption(input, page.locator(OPT_TAG, { hasText: "Oslo" }));
					await expect(items).toHaveText(["Oslo"]);
					await expect(input).toHaveValue("Oslo");
				});
			});

			test.describe(name("spec: single + creatable"), () => {
				test("Enter and blur create items, but options win over creatable", async ({
					page,
				}) => {
					await render(page, { creatable: true });
					await resetLog(page, "comboboxbeforematch");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.fill("Custom");
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveAttribute("value", "Custom");
					await expect(input).toHaveValue("Custom");

					await input.fill("Another");
					await input.blur();
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveText("Another"); // Created on blur, replacing the previous item
					await expect(input).toHaveValue("Another");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(2); // Blur matched before creating

					await input.click();
					await input.fill("bergen"); // Predefined option wins over creatable on Enter
					await input.press("Enter");
					await expect(items.first()).toHaveText("Bergen");

					await input.fill("oslo"); // And on blur
					await input.blur();
					await expect(items.first()).toHaveAttribute("value", "oslo-id");
					await expect(input).toHaveValue("Oslo");
				});

				test("without datalist keeps free text, and creates on Enter and blur", async ({
					page,
				}) => {
					await render(page, { creatable: true, options: null, clear: true });
					await resetLog(page, "comboboxbeforematch");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");
					const clear = page.locator('button[type="reset"]');

					await expect(clear).toHaveAttribute("hidden", "");
					await input.fill("Hello");
					await expect(clear).not.toHaveAttribute("hidden");
					await input.press("Enter");
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveText("Hello");

					await input.fill("Hello world");
					await input.blur();
					await expect(items).toHaveCount(1);
					await expect(items.first()).toHaveText("Hello world"); // Blur creates from the text like Enter
					await expect(input).toHaveValue("Hello world"); // Free text is never overwritten
					expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Match is never dispatched without a datalist

					await clear.click();
					await expect(input).toHaveValue("");
					await expect(items).toHaveCount(0);
					await expect(clear).toHaveAttribute("hidden", "");
				});
			});

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
				}) => {
					test.skip(
						framework !== "Vanilla",
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
				}) => {
					test.skip(
						framework !== "Vanilla",
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

				test("Enter toggles matched item and keeps typed text", async ({
					page,
				}) => {
					await render(page, { multiple: true });
					await resetLog(page, "comboboxbeforematch");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.fill("bergen");
					await input.press("Enter");
					await expect(items).toHaveText(["Bergen"]);
					await expect(input).toHaveValue("bergen");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);

					await input.press("Enter");
					await expect(items).toHaveCount(0); // Toggled off through the matched option, as "bergen" is not the item text "Bergen"
					await expect(input).toHaveValue("bergen");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(2);

					await input.fill("oslo");
					await input.press("Enter");
					await expect(items.first()).toHaveAttribute("value", "oslo-id"); // Value from option
					await expect(items.first()).toHaveText("Oslo"); // Label from option
					await expect(items.first()).toHaveAttribute("role", "option");
					await expect(items.first()).toHaveAttribute("tabindex", "-1");
					await expect(input).toBeFocused(); // Focus stays in input after adding
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(3);

					await input.fill("Oslo");
					await input.press("Enter");
					await expect(items).toHaveCount(0); // Same text as the item removes without matching
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(3);
				});

				test("Enter removes item by its text even when the option is gone", async ({
					page,
				}) => {
					await render(page, {
						multiple: true,
						items: [BERGEN],
						options: [{ text: "Other" }],
					}); // Same text compares against items, never against options
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.fill(" bergen ");
					await input.press("Enter");
					await expect(items).toHaveText(["Bergen"]); // Items compare case sensitive, so this is matched against options instead and finds nothing
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]);

					await input.fill(" Bergen ");
					await input.press("Enter");
					await expect(items).toHaveCount(0); // Trimmed
					await expect(input).toHaveValue(" Bergen ");
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Same text never matches
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);
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

				test("Enter announces invalid value on no match and empty", async ({
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

					await input.fill("");
					await input.press("Enter");
					await expect(live).toHaveText(/Invalid value/);
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

			test.describe(name("consumer events"), () => {
				test("caches value set by consumer in comboboxafterselect in multiple mode", async ({
					page,
				}) => {
					await render(page, { multiple: true, controlled: false }); // comboboxafterselect only fires when comboboxbeforeselect is not prevented
					await page
						.locator("u-combobox")
						.evaluate((el: UHTMLComboboxElement) => {
							el.addEventListener("comboboxafterselect", (event) => {
								const { value } = (event as CustomEvent<HTMLDataElement>)
									.detail;
								if (value === "Trondheim" && el.control) el.control.value = ""; // Clear filter after first pick only, so second pick reveals what was cached
							});
						});
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.click();
					await input.fill("T");
					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "Trondheim" }),
					);
					await expect(items).toHaveText(["Trondheim"]);
					await expect(input).toHaveValue(""); // Cleared by consumer

					await selectOption(input, page.locator(OPT_TAG).nth(1));
					await expect(items).toHaveText(["Trondheim", "Bergen"]);
					await expect(input).toHaveValue(""); // Reverts to cached "", not to stale "T"
				});

				test("supports preventing selection, and without triggering new matching", async ({
					page,
				}) => {
					await render(page, {
						controlled: "manual", // Framework prevents, test confirms by updating state
						attrs: { "data-multiple": "false" },
					});
					await update(page, { items: [OSLO] });
					await resetLog(page, "comboboxbeforematch");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");

					await expect(item).toHaveAttribute("value", "oslo-id");
					await input.click();
					await selectOption(input, page.locator(OPT_TAG).nth(1));
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented
					await expect(input).toHaveValue("Oslo"); // Restored
					await update(page, { items: [BERGEN] }); // Confirm
					await expect(item).toHaveAttribute("value", "Bergen");
					await expect(input).toHaveValue("Bergen");

					await input.click();
					await selectOption(input, page.locator(OPT_TAG).nth(0));
					await expect(item).toHaveAttribute("value", "Bergen"); // Prevented, and rejected by doing nothing
					await input.blur();
					await expect(item).toHaveAttribute("value", "Bergen");
					expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Picks never match, and blur does not re-match a restored input
				});

				test("keeps typed text after a prevented pick in single mode, and reverts to the item on blur", async ({
					page,
				}) => {
					await render(page, { controlled: "manual", items: [OSLO] }); // Rejects every pick
					await resetLog(page, "comboboxbeforeselect");
					await resetLog(page, "comboboxbeforematch");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");

					await input.click();
					await input.fill("Berg");
					await selectOption(input, page.locator(OPT_TAG).nth(1));
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented
					await expect(input).toHaveValue("Berg"); // Typed text is kept, so the user can keep typing
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

					await input.blur();
					await expect(input).toHaveValue("Oslo"); // Blur matches the typed text, finds no option and syncs to the item
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1); // No new select on blur
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Picks never match, blur does
				});

				for (const controlled of [true, false]) {
					test(`restores the search text after selecting multiple datalist options (${controlled ? "controlled" : "uncontrolled"})`, async ({
						page,
					}) => {
						await render(page, { multiple: true, controlled });
						const input = page.locator("#input");
						const items = page.locator("u-combobox data");

						await input.click();
						await selectOption(
							input,
							page.locator(`${OPT_TAG}[value="oslo-id"]`),
						);
						await expect(items).toHaveText(["Oslo"]);
						await expect(input).toHaveValue("");

						await input.fill("Ber");
						await selectOption(input, page.locator(OPT_TAG).nth(1));
						await expect(items).toHaveText(["Oslo", "Bergen"]);
						await expect(input).toHaveValue("Ber");
					});
				}

				test("keeps the clicked option on blur after a substring search with a dynamic add option", async ({
					page,
				}) => {
					await render(page, {
						creatable: true,
						nofilter: false,
						items: [{ value: "Tag 1", label: "Tag 1" }],
						options: [{ text: "" }, { value: "Oslo", text: "Oslo" }],
					});
					await resetLog(page, "comboboxbeforeselect");
					await page
						.locator("u-combobox")
						.evaluate((el: UHTMLComboboxElement) => {
							const handleAddOption = () => {
								const value = el.control?.value.trim() || "";
								const add = el.options[0];
								add.hidden = !value || el.values.includes(value);
								add.value = value;
								add.label = value;
								add.textContent = `Add "${value}"`;
							};
							el.addEventListener("comboboxafterselect", handleAddOption);
							el.addEventListener("input", handleAddOption);
						});
					const input = page.locator("#input");
					const options = page.locator(OPT_TAG);

					await input.click();
					await input.fill("slo");
					await expect(options.first()).toHaveAttribute("value", "slo");
					await selectOption(input, options.last());
					await expect(input).toHaveValue("Oslo"); // Clicked option wins over the typed substring
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

					await page.locator("body").click();
					await expect(input).toHaveValue("Oslo"); // Not reset to the typed query on blur
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1); // No new selection on blur
				});
			});

			test.describe(name("event fingerprinting"), () => {
				test("treats synthetic InputEvent without inputType as typing", async ({
					page,
				}) => {
					// Mimics @testing-library fireEvent.input(input, { target: { value } })
					await render(page, { multiple: true });
					await resetLog(page, "input");
					const input = page.locator("#input");

					await input.evaluate((el) => {
						const input = el as HTMLInputElement;
						const proto = HTMLInputElement.prototype;
						Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(
							input,
							"Ber",
						);
						input.dispatchEvent(new InputEvent("input", { bubbles: true }));
					});
					await expect(input).toHaveValue("Ber"); // Not reverted
					await expect(page.locator("u-combobox data")).toHaveCount(0);
					expect(await logged(page, "input")).toEqual(["Ber"]); // Propagated to consumer
				});

				test("treats insertReplacementText without an option value as typing", async ({
					page,
				}) => {
					// Mimics a Firefox spell check correction or autofill, which also use insertReplacementText
					await render(page, { multiple: true });
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.click();
					await input.fill("Trondhiem");
					await resetLog(page, "input");
					await input.evaluate((el) => {
						const input = el as HTMLInputElement;
						const data = "Trondhjem"; // Corrected, but still not an option value
						const init = {
							bubbles: true,
							data,
							inputType: "insertReplacementText",
						};
						input.setRangeText(data, 0, input.value.length, "end");
						input.dispatchEvent(new InputEvent("input", init));
					});
					await expect(input).toHaveValue("Trondhjem"); // Correction is kept, not reverted
					await expect(items).toHaveCount(0);
					expect(await logged(page, "input")).toEqual(["Trondhjem"]); // Propagated to consumer

					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "Trondheim" }),
					);
					await expect(items).toHaveText(["Trondheim"]);
					await expect(input).toHaveValue("Trondhjem"); // Pick reverts to the corrected text, as it was cached like typed text
				});

				test("does not re-match when blurring right after a prevented pick", async ({
					page,
				}) => {
					await render(page, { controlled: "manual", items: [OSLO] }); // Rejects every pick
					await resetLog(page, "comboboxbeforematch");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");

					await input.click();
					// Pick and blur in the same task, before the deferred restore has run
					await input.evaluate((el, native) => {
						const input = el as HTMLInputElement;
						if (native) {
							const init = {
								bubbles: true,
								composed: true,
								data: "Bergen",
								inputType: "insertReplacementText",
							};
							input.setRangeText("Bergen", 0, input.value.length);
							input.dispatchEvent(new InputEvent("input", init));
						} else
							(
								document.querySelector("u-option:nth-child(2)") as HTMLElement
							).click();
						input.blur();
					}, IS_NATIVE);

					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented
					await expect(input).toHaveValue("Oslo"); // Restored
					expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Picked value was never treated as typed text
				});

				test("keeps typed text after a prevented Enter in single mode until blur", async ({
					page,
				}) => {
					await render(page, { controlled: "manual", items: [OSLO] }); // Rejects every pick
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");

					await input.click();
					await input.fill("Bergen");
					await input.press("Enter");
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented, nothing mutates
					await expect(input).toHaveValue("Bergen"); // Typed text stays, so the user can keep typing
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

					await input.blur();
					await expect(item).toHaveAttribute("value", "oslo-id"); // Blur matches again and is prevented again
					await expect(input).toHaveValue("Oslo"); // Synced from the item on blur
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);

					await input.click();
					await input.fill("Bergen");
					await input.press("Enter");
					await update(page, { items: [BERGEN] }); // Confirm
					await expect(item).toHaveAttribute("value", "Bergen");
					await expect(input).toHaveValue("Bergen");
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(3);
				});

				test("syncs input after a prevented match and a prevented removal on blur in single mode", async ({
					page,
				}) => {
					await render(page, { controlled: "manual", items: [OSLO] }); // Rejects every pick
					await resetLog(page, "comboboxbeforematch");
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");

					await input.click();
					await input.fill("unknown");
					await input.blur();
					await expect(item).toHaveAttribute("value", "oslo-id");
					await expect(input).toHaveValue("Oslo"); // Synced from the item, not the typed text
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(1);
					expect(await logged(page, "comboboxbeforeselect")).toEqual([]); // No match, so nothing to select

					await input.click();
					await input.fill("bergen");
					await input.blur(); // Matching label asks to select
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented, nothing mutates
					await expect(input).toHaveValue("Oslo"); // Synced from the item, not the typed text
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(2);
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

					await input.click();
					await input.fill("");
					await input.blur(); // Empty input asks to remove the item
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented, nothing mutates
					await expect(input).toHaveValue("Oslo"); // Synced from the item
					expect(await logged(page, "comboboxbeforematch")).toHaveLength(2); // Empty text never matches
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);
				});

				test("keeps typed text after a prevented Enter with no item in single mode, and clears on blur", async ({
					page,
				}) => {
					await render(page, { controlled: "manual" }); // Rejects every pick
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");

					await input.click();
					await input.fill("Bergen");
					await input.press("Enter");
					await expect(page.locator("u-combobox data")).toHaveCount(0); // Prevented
					await expect(input).toHaveValue("Bergen"); // Typed text stays until blur
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

					await input.blur();
					await expect(page.locator("u-combobox data")).toHaveCount(0); // Prevented again
					await expect(input).toHaveValue(""); // Synced to no item
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);
				});

				test("reverts input after a prevented removal in single mode", async ({
					page,
				}) => {
					await render(page, {
						controlled: "manual",
						items: [OSLO],
						clear: true,
					}); // Rejects every removal
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");
					const clear = page.locator('u-combobox button[type="reset"]');

					await input.click();
					await input.fill("");
					await input.press("Enter"); // Empty input and Enter asks to remove the item
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented
					await expect(input).toHaveValue(""); // Typing emptied the text, so there is nothing to revert to
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);

					await input.blur(); // Empty input asks to remove again
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented
					await expect(input).toHaveValue("Oslo"); // Synced from the item
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);

					await clear.click(); // Clear button also asks to remove the item
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented
					await expect(input).toHaveValue("Oslo"); // Reverted to the text before the clear, as the clear does not cache
					await expect(input).toBeFocused();
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(3);

					await input.fill("Berg");
					await clear.click();
					await expect(item).toHaveAttribute("value", "oslo-id"); // Prevented
					await expect(input).toHaveValue("Berg"); // Reverted to the typed text, not the item
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(4);
				});

				test("clear button caches the emptied text in multiple mode", async ({
					page,
				}) => {
					await render(page, { multiple: true, clear: true });
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.click();
					await input.fill("Ber");
					await page.locator('u-combobox button[type="reset"]').click();
					await expect(input).toHaveValue("");
					await expect(items).toHaveCount(0); // Nothing to remove in multiple mode

					await selectOption(
						input,
						page.locator(OPT_TAG, { hasText: "Bergen" }),
					);
					await expect(items).toHaveText(["Bergen"]);
					await expect(input).toHaveValue(""); // Reverts to the emptied text, not to the text before the clear
				});

				test("reverts input when picking a placeholder option with empty value", async ({
					page,
				}) => {
					await render(page, {
						multiple: true,
						options: [{ value: "", text: "Loading" }, ...OPTIONS],
					});
					const input = page.locator("#input");

					await input.click();
					await input.fill("Ber");
					await selectOption(input, page.locator(OPT_TAG).first());
					await expect(input).toHaveValue("Ber");
					await expect(page.locator("u-combobox data")).toHaveCount(0);
				});
			});

			test.describe(name("mode changes"), () => {
				test("reacts to data-multiple toggled at runtime", async ({ page }) => {
					const IS_ANDROID = test.info().project.name === "Mobile Chrome";
					const multiselectable = `${IS_ANDROID ? "data" : "aria"}-multiselectable`;
					await render(page, { select: "tags" });
					await update(page, { items: [BERGEN] });
					const item = page.locator("u-combobox data");
					const select = page.locator("select");
					const list = page.locator(LIST_TAG);

					await expect(item).toHaveAttribute("hidden", "");
					await expect(select).not.toHaveAttribute("multiple");
					await expect(list).toHaveAttribute(multiselectable, "false");

					await update(page, { multiple: true }); // Framework toggles the attribute
					await expect(item).not.toHaveAttribute("hidden");
					await expect(select).toHaveAttribute("multiple", "");
					await expect(list).toHaveAttribute(multiselectable, "true");

					await update(page, { multiple: false });
					await expect(item).toHaveAttribute("hidden", "");
					await expect(select).not.toHaveAttribute("multiple");
				});

				test("mirrors only the first item in single mode, keeping the rest for multiple mode", async ({
					page,
				}) => {
					await render(page, {
						multiple: true,
						form: true,
						select: "tags",
						items: [OSLO, BERGEN],
					});
					const input = page.locator("#input");
					const options = page.locator(`${LIST_TAG} ${OPT_TAG}`); // Scoped, as the mirrored <select> also holds <option>
					const getAll = () =>
						page.evaluate(() =>
							new FormData(
								document.getElementById("form") as HTMLFormElement,
							).getAll("tags"),
						);

					await expect.poll(getAll).toEqual(["oslo-id", "Bergen"]);
					await expect(options.nth(1)).toHaveAttribute("selected");

					await update(page, { multiple: false });
					await expect(input).toHaveValue("Oslo"); // Input mirrors the first item
					await expect.poll(getAll).toEqual(["oslo-id"]); // So must the form value
					await expect(page.locator("select option")).toHaveCount(1);
					await expect(options.nth(0)).toHaveAttribute("selected");
					await expect(options.nth(1)).not.toHaveAttribute("selected"); // Single select can only have one selected option
					await expect(page.locator("u-combobox data")).toHaveCount(2); // Items are kept

					await update(page, { multiple: true });
					await expect.poll(getAll).toEqual(["oslo-id", "Bergen"]); // Switching back is lossless
					await expect(options.nth(1)).toHaveAttribute("selected");
				});

				test("restores item text in input when switching from multiple to single mode", async ({
					page,
				}) => {
					await render(page, { items: [BERGEN] });
					const input = page.locator("input");
					await expect(input).toHaveValue("Bergen");

					await update(page, { multiple: true });
					await input.fill("ber"); // Filter text is kept in multiple mode
					await expect(input).toHaveValue("ber");

					await update(page, { multiple: false }); // Item text is unchanged, but input must still sync
					await expect(input).toHaveValue("Bergen");
				});

				test("keeps typed text when data-creatable is toggled in single mode", async ({
					page,
				}) => {
					await render(page, { items: [BERGEN] });
					const input = page.locator("input");
					const item = page.locator("u-combobox data");
					await expect(input).toHaveValue("Bergen");

					await input.click();
					await input.fill("ber"); // Typed query must survive a mode change that does not affect single/multiple
					await update(page, { creatable: true });
					await expect(input).toHaveValue("ber");
					await expect(item).toHaveText("Bergen");

					await update(page, { creatable: false });
					await expect(input).toHaveValue("ber");

					await update(page, { items: [] }); // No item must not clear the typed query either
					await input.fill("tro");
					await update(page, { creatable: true });
					await expect(input).toHaveValue("tro");
				});
			});

			test.describe(name("toggle button"), () => {
				test("is hidden with native datalist, opens and closes u-datalist", async ({
					page,
				}) => {
					await render(page, { toggle: true });
					const input = page.locator("#input");
					const toggle = page.locator("button[aria-expanded]");
					const list = page.locator(LIST_TAG);

					if (IS_NATIVE) {
						await expect(toggle).toHaveAttribute("hidden", "");
						await expect(toggle).toHaveAttribute("aria-expanded", "false");
						await input.fill("B");
						await expect(toggle).toHaveAttribute("hidden", "");
						await expect(toggle).toHaveAttribute("aria-expanded", "false");
						return;
					}

					await expect(toggle).not.toHaveAttribute("hidden");
					await expect(toggle).toHaveAttribute("aria-expanded", "false");
					await toggle.click();
					await expect(list).not.toHaveAttribute("hidden");
					await expect(toggle).toHaveAttribute("aria-expanded", "true");
					await expect(input).toBeFocused();

					await toggle.click();
					await expect(list).toHaveAttribute("hidden", "");
					await expect(toggle).toHaveAttribute("aria-expanded", "false");
					await expect(input).toBeFocused();
				});

				test("opens u-datalist on programmatic click", async ({ page }) => {
					test.skip(IS_NATIVE, "Toggle is hidden with native datalist");
					await render(page, { toggle: true });
					const toggle = page.locator("button[aria-expanded]");
					const list = page.locator(LIST_TAG);

					await expect(list).toHaveAttribute("hidden", "");
					await toggle.evaluate((el) => (el as HTMLElement).click()); // No pointerdown, so live state must be used
					await expect(list).not.toHaveAttribute("hidden");
					await expect(toggle).toHaveAttribute("aria-expanded", "true");
					await expect(page.locator("#input")).toBeFocused();
				});

				test("reads live list state after a mouse click that returned early", async ({
					page,
				}) => {
					test.skip(IS_NATIVE, "Toggle is hidden with native datalist");
					await render(page, { multiple: true, items: [BERGEN], toggle: true });
					const input = page.locator("#input");
					const item = page.locator("u-combobox data");
					const toggle = page.locator("button[aria-expanded]");
					const list = page.locator(LIST_TAG);

					await input.click(); // Open list
					await expect(list).not.toHaveAttribute("hidden");

					// Pointerdown captures "list was open", click re-routes to the chip and returns early
					const box = (await item.boundingBox()) as Record<string, number>;
					await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
					await expect(item).toBeFocused();
					await expect(list).toHaveAttribute("hidden", ""); // Closed by focus leaving the input

					await toggle.evaluate((el) => (el as HTMLElement).click()); // Must not reuse stale pointerdown state
					await expect(list).not.toHaveAttribute("hidden");
					await expect(input).toBeFocused();
				});
			});

			test.describe(name("mount"), () => {
				test("syncs single mode input on mount and dispatches input and change", async ({
					page,
				}) => {
					await resetDocLog(page);
					await render(page, { items: [BERGEN] });
					const input = page.locator("#input");

					await expect(input).toHaveValue("Bergen");
					await expect.poll(() => docLogged(page, "input")).toEqual(["Bergen"]); // Mount sync dispatches like any later sync
					expect(await docLogged(page, "change")).toEqual(["Bergen"]);

					await update(page, {
						items: [{ value: "Bergen", label: "Trondheim" }],
					}); // Same key, new label text
					await expect(input).toHaveValue("Trondheim");
					expect(await docLogged(page, "input")).toEqual([
						"Bergen",
						"Trondheim",
					]);
					expect(await docLogged(page, "change")).toEqual([
						"Bergen",
						"Trondheim",
					]);
				});

				test("clears prefilled input on mount in single mode when list exists but no item", async ({
					page,
				}) => {
					await resetDocLog(page);
					await render(page, { value: "Draft" });
					const input = page.locator("#input");

					await expect(input).toHaveValue(""); // Single mode always mirrors the item, and there is none
					await expect.poll(() => docLogged(page, "input")).toEqual([""]);
					expect(await docLogged(page, "change")).toEqual([""]);
				});

				test("keeps prefilled input on mount in multiple mode", async ({
					page,
				}) => {
					await resetDocLog(page);
					await render(page, { multiple: true, value: "Draft" });
					const input = page.locator("#input");

					await expect(input).toHaveValue("Draft"); // Filter text is never overwritten in multiple mode
					await page.waitForTimeout(100); // Allow the deferred mount sync to run
					expect(await docLogged(page, "input")).toEqual([]); // No sync dispatched on mount
					expect(await docLogged(page, "change")).toEqual([]);
				});

				test("keeps prefilled input on mount without list", async ({
					page,
				}) => {
					await resetDocLog(page);
					await render(page, {
						creatable: true,
						options: null,
						value: "Draft",
					});
					const input = page.locator("#input");

					await expect(input).toHaveValue("Draft"); // Free text without datalist
					expect(await docLogged(page, "input")).toEqual([]); // Framework may write "Draft", u-combobox must not clear it
					expect(await docLogged(page, "change")).toEqual([]);
				});

				test("syncs single mode input when framework adds, changes and removes item", async ({
					page,
				}) => {
					await render(page);
					await resetLog(page, "input");
					const input = page.locator("#input");

					await update(page, { items: [{ value: "b", label: "Bergen" }] });
					await expect(input).toHaveValue("Bergen");

					await update(page, { items: [{ value: "b", label: "Trondheim" }] });
					await expect(input).toHaveValue("Trondheim");

					await update(page, { items: [] });
					await expect(input).toHaveValue("");
					expect(await logged(page, "input")).toEqual([
						"Bergen",
						"Trondheim",
						"",
					]);
				});

				test("keeps consumer mutations made in handlers of the sync input event", async ({
					page,
				}) => {
					const replaced: Option[] = [
						{ id: "o1", value: "Bergen", text: "Bergen" },
						{ id: "o2", value: "Trondheim", text: "Trondheim" },
					];
					await render(page, { replaceOptionsOnInput: replaced }); // Framework replaces options on every input event, like the API example in the docs
					await update(page, { items: [BERGEN] });
					const input = page.locator("#input");
					await expect(input).toHaveValue("Bergen");

					await update(page, {
						items: [{ value: "Bergen", label: "Bergen city" }],
					}); // Triggers sync, which dispatches input, which replaces options
					await expect(input).toHaveValue("Bergen city");
					await expect(page.locator("#o1")).toHaveAttribute("selected"); // Fresh option matching the item value must be synced
					await expect(page.locator("#o2")).not.toHaveAttribute("selected");
				});

				test("works after remount", async ({ page }) => {
					await render(page, { multiple: true });
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");

					await update(page, { mounted: false });
					await expect(page.locator("u-combobox")).toHaveCount(0);
					await update(page, { mounted: true });
					await input.fill("Bergen");
					await input.press("Enter");
					await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);
				});

				test("connects to a replaced datalist", async ({ page }) => {
					await render(page, { multiple: true, items: [BERGEN] });
					const input = page.locator("#input");
					const list = page.locator(LIST_TAG);

					await update(page, {
						listKey: 1, // Forces the framework to create a new element
						options: [{ text: "Bergen" }, { text: "Stavanger" }],
					});
					await expect(list).toHaveCount(1);
					await expect(input).toHaveAttribute("list", "input-list");
					await expect(page.locator(OPT_TAG).nth(0)).toHaveAttribute(
						"selected",
					);

					await input.fill("Stavanger");
					await input.press("Enter");
					await expect(page.locator("u-combobox data")).toHaveText([
						"Bergen",
						"Stavanger",
					]);
				});
			});

			test.describe(name("form"), () => {
				test("Enter does not submit when datalist exists and restores form attribute", async ({
					page,
				}) => {
					await render(page, { multiple: true, form: true });
					const input = page.locator("#input");

					await input.fill("Bergen");
					await input.press("Enter");
					await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
					await input.fill("Nope");
					await input.press("Enter");
					await expect(input).not.toHaveAttribute("form", "#");
					expect(await logged(page, "submit")).toEqual([]);
				});

				test("Enter restores explicit form attribute", async ({ page }) => {
					await render(page, { multiple: true, form: "outside" });
					const input = page.locator("#input");

					await input.fill("Bergen");
					await input.press("Enter");
					await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
					await expect(input).toHaveAttribute("form", "form");
					expect(await logged(page, "submit")).toEqual([]);
				});

				test("Enter submits when no datalist and not creatable", async ({
					page,
				}) => {
					await render(page, { form: true, options: null, label: false });
					const input = page.locator("#input");

					await input.fill("Hello");
					await input.press("Enter");
					await expect.poll(() => logged(page, "submit")).toHaveLength(1);
				});

				test("ArrowDown and Enter selects active option once without submit", async ({
					page,
				}) => {
					test.skip(IS_NATIVE, "Native datalist popup can not be driven");
					await render(page, { multiple: true, form: true });
					await resetLog(page, "comboboxbeforeselect");
					const input = page.locator("#input");

					await input.click();
					await input.press("ArrowDown");
					await input.press("Enter");
					await expect(page.locator("u-combobox data")).toHaveText(["Oslo"]);
					await expect(input).toHaveValue("");
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);
					expect(await logged(page, "submit")).toEqual([]);
				});

				test("mirrors items into select for FormData", async ({ page }) => {
					await render(page, {
						multiple: true,
						form: true,
						select: "tags",
						items: [BERGEN, OSLO],
					});
					const options = page.locator("select option");
					const getAll = () =>
						page.evaluate(() =>
							new FormData(
								document.getElementById("form") as HTMLFormElement,
							).getAll("tags"),
						);

					await expect(page.locator("select")).toHaveAttribute("multiple", "");
					await expect(options).toHaveCount(2);
					await expect(options.nth(0)).toHaveText("Bergen");
					await expect(options.nth(1)).toHaveText("Oslo");
					await expect(options.nth(1)).toHaveAttribute("value", "oslo-id");
					await expect.poll(getAll).toEqual(["Bergen", "oslo-id"]);

					await page.locator("u-combobox data").nth(1).focus();
					await page.locator("u-combobox data").nth(1).press("Backspace");
					await expect(options).toHaveCount(1);
					await expect.poll(getAll).toEqual(["Bergen"]);
				});

				test("mirrors single item into select", async ({ page }) => {
					await render(page, { form: true, select: "tag" });
					await update(page, { items: [OSLO] });
					const input = page.locator("#input");
					const getAll = () =>
						page.evaluate(() =>
							new FormData(
								document.getElementById("form") as HTMLFormElement,
							).getAll("tag"),
						);

					await expect(page.locator("select")).not.toHaveAttribute("multiple");
					await expect.poll(getAll).toEqual(["oslo-id"]);

					await input.fill("Bergen");
					await input.press("Enter");
					await expect(page.locator("select option")).toHaveCount(1);
					await expect.poll(getAll).toEqual(["Bergen"]);
				});

				test("syncs single mode input after form reset", async ({ page }) => {
					await render(page, {
						form: true,
						clear: true,
						toggle: true,
						items: [BERGEN],
					});
					const input = page.locator("#input");
					const clear = page.locator('button[type="reset"]');
					const toggle = page.locator("button[aria-expanded]");

					await input.click();
					await input.fill("Tro");
					await page.evaluate(() =>
						(document.getElementById("form") as HTMLFormElement).reset(),
					);
					await expect(input).toHaveValue("Bergen"); // Re-synced from the item
					await expect(clear).not.toHaveAttribute("hidden");
					if (!IS_NATIVE) await expect(toggle).toHaveAttribute("hidden", "");
				});

				test("clear button does not reset the form", async ({ page }) => {
					await render(page, {
						multiple: true,
						form: true,
						items: [BERGEN],
						clear: true,
					});
					const input = page.locator("#input");
					const other = page.locator("#other");
					const clear = page.locator('button[type="reset"]');
					const list = page.locator(LIST_TAG);

					await other.fill("changed");
					await expect(clear).toHaveAttribute("hidden", "");
					await input.click();
					await input.fill("abc");
					await expect(clear).not.toHaveAttribute("hidden");
					await clear.click();
					await expect(input).toHaveValue("");
					await expect(input).toBeFocused();
					await expect(other).toHaveValue("changed"); // Form was not reset
					await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]); // Items untouched in multiple mode
					if (!IS_NATIVE) await expect(list).not.toHaveAttribute("hidden"); // Reopened as it was open before clear
				});
			});

			test.describe(name("clear button"), () => {
				test("removes item in single mode", async ({ page }) => {
					await render(page, { clear: true });
					await update(page, { items: [BERGEN] });
					const input = page.locator("#input");

					await expect(input).toHaveValue("Bergen");
					await page.locator('button[type="reset"]').click();
					await expect(input).toHaveValue("");
					await expect(page.locator("u-combobox data")).toHaveCount(0);
				});

				test("is reachable with Tab and reverts tabindex after", async ({
					page,
				}) => {
					await render(page, { multiple: true, clear: true });
					const input = page.locator("#input");
					const clear = page.locator('button[type="reset"]');
					const list = page.locator(LIST_TAG);

					await input.click();
					await input.pressSequentially("abc"); // Keydown opens <u-datalist>, so Tab also closes it
					await input.press("Tab");
					await expect(clear).toBeFocused();
					if (!IS_NATIVE) await expect(list).toHaveAttribute("hidden", "");
					await expect(clear).toHaveAttribute("tabindex", "0"); // Must survive the sync triggered by the list closing
					await expect(clear).toHaveAttribute("aria-hidden", "false");
					await clear.press("Enter");
					await expect(input).toHaveValue("");
					await expect(input).toBeFocused();
					await expect(clear).toHaveAttribute("tabindex", "-1");
					await expect(clear).toHaveAttribute("hidden", "");
				});

				test("does not reopen the list when activated with Enter after Tab", async ({
					page,
				}) => {
					const IS_ANDROID = test.info().project.name === "Mobile Chrome"; // u-datalist opens on focus in Android
					await render(page, { multiple: true, clear: true });
					const input = page.locator("#input");
					const clear = page.locator('button[type="reset"]');
					const list = page.locator(LIST_TAG);

					await input.click();
					await input.pressSequentially("abc"); // Keydown opens <u-datalist>
					if (!IS_NATIVE) await expect(list).not.toHaveAttribute("hidden");
					await input.press("Tab");
					await expect(clear).toBeFocused();
					if (!IS_NATIVE) await expect(list).toHaveAttribute("hidden", ""); // Closed by focus leaving the input

					await clear.press("Enter"); // Programmatic click, no pointerdown
					await expect(input).toHaveValue("");
					await expect(input).toBeFocused();
					if (!IS_NATIVE && !IS_ANDROID)
						await expect(list).toHaveAttribute("hidden", ""); // Live state was closed, so it stays closed
				});

				test("uses data-sr-clear as aria-label", async ({ page }) => {
					await render(page, {
						clear: true,
						attrs: { "data-sr-clear": "Tøm" },
					});
					await expect(page.locator('button[type="reset"]')).toHaveAttribute(
						"aria-label",
						"Tøm",
					);
				});
			});

			test.describe(name("disabled and readonly"), () => {
				for (const state of ["readonly", "disabled"]) {
					test(`ignores interaction when ${state}`, async ({ page }) => {
						await render(page, {
							multiple: true,
							items: [BERGEN],
							value: "Trondheim",
							clear: true,
							inputAttrs: { [state]: "" },
						});
						const input = page.locator("#input");
						const items = page.locator("u-combobox data");

						await expect(input).toHaveValue("Trondheim");
						await expect(page.locator('button[type="reset"]')).toHaveAttribute(
							"hidden",
							"",
						);
						await items.first().evaluate((el) => (el as HTMLElement).click());
						await expect(items).toHaveCount(1);

						if (state === "readonly") {
							await input.focus();
							await page.keyboard.press("Enter");
							await expect(items).toHaveCount(1); // No item added from prefilled value
						}
					});
				}
			});

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

				test("does not obstruct datalist keyboard navigation", async ({
					page,
				}) => {
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
			});

			test.describe(name("announcements"), () => {
				test("uses data-sr-* texts for description and live region", async ({
					page,
				}) => {
					await render(page, {
						multiple: true,
						attrs: {
							"data-sr-added": "La til",
							"data-sr-empty": "Ingen valgte",
							"data-sr-found": "%d valgt",
						},
					});
					const input = page.locator("#input");
					const live = page.locator("[aria-live='assertive']");

					await expect(input).toHaveAttribute(
						"aria-description",
						"Ingen valgte",
					);
					await input.fill("Bergen");
					await input.press("Enter");
					await expect(live).toHaveText(/La til Bergen/);
					await expect(input).toHaveAttribute("aria-description", "1 valgt");
				});

				test("announces item changes only while focused", async ({ page }) => {
					await render(page, { multiple: true });
					const input = page.locator("#input");
					const live = page.locator("[aria-live='assertive']");

					await expect(live).not.toBeAttached();
					await input.focus();
					await expect(live).toBeAttached(); // Live region is created on focus
					await update(page, { items: [BERGEN] });
					await expect(live).toHaveText(/Added Bergen/);

					await input.blur();
					await expect(live).toHaveText(""); // Cleared after announcement
					await update(page, { items: [BERGEN, OSLO] });
					await page.waitForTimeout(500);
					await expect(live).toHaveText(""); // Nothing announced while blurred
				});
			});
		}

		// Behaviour without a datalist does not depend on list type, so runs once
		test.describe("without datalist", () => {
			const render = (page: Page, cfg: HarnessPatch) =>
				page.evaluate(
					([cfg, defaults]) => window.harness.render({ ...defaults, ...cfg }),
					[cfg, defaults] as const,
				);

			test("hides toggle and removes list attribute", async ({ page }) => {
				await render(page, { options: null, toggle: true });
				const input = page.locator("#input");
				const toggle = page.locator("button[aria-expanded]");

				await expect(input).not.toHaveAttribute("list");
				await expect(toggle).toHaveAttribute("hidden", "");
				await expect(toggle).toHaveAttribute("aria-expanded", "false");
				await input.fill("Hello");
				await expect(toggle).toHaveAttribute("hidden", ""); // Still hidden, nothing to toggle
			});

			for (const multiple of [false, true]) {
				test(`does not create item on Enter in ${multiple ? "multiple" : "single"} mode when not creatable`, async ({
					page,
				}) => {
					await render(page, { multiple, options: null, items: [BERGEN] });
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.fill("Hello");
					await input.press("Enter");
					await expect(items).toHaveText(["Bergen"]); // Unchanged
					await expect(input).toHaveValue("Hello");
				});
			}

			test("creates item on Enter in multiple mode when creatable", async ({
				page,
			}) => {
				await render(page, {
					multiple: true,
					creatable: true,
					options: null,
					items: [BERGEN],
				});
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");

				await input.fill("Oslo");
				await input.press("Enter");
				await expect(items).toHaveText(["Bergen", "Oslo"]);
				await expect(input).toHaveValue("Oslo");
			});
		});
	});
};
