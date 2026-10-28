// Single mode: pick, Enter, blur and creatable, see the spec table in ../u-combobox.ts. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import {
	afterRendered,
	docLogged,
	logged,
	resetDocLog,
	resetLog,
	settled,
} from "../../suite";
import { expect, test } from "../../test";
import { OPTIONS } from "../u-combobox.harness";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const singleTests = ({
	OPT_TAG,
	IS_NATIVE,
	name,
	render,
	selectOption,
}: SuiteContext) => {
	test.describe(name("spec: single + predefined"), () => {
		test("datalist click adds item and shows option label", async ({
			page,
		}) => {
			await render(page);
			await resetLog(page, "input");
			const input = page.locator("#input");
			const item = page.locator("u-combobox data");

			await input.click();
			await selectOption(input, page.locator(`${OPT_TAG}[value="oslo-id"]`));
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

		test("blur trims whitespace around the item text without matching", async ({
			page,
		}) => {
			await render(page, { items: [BERGEN] });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			await expect(input).toHaveValue("Bergen");
			await resetLog(page, "comboboxbeforematch");
			await resetLog(page, "comboboxbeforeselect");
			await resetDocLog(page);

			await input.click();
			await input.fill("  Bergen  ");
			await input.blur();
			await expect(input).toHaveValue("Bergen"); // Synced to the item text, as the padded text is the item
			await expect(items).toHaveText(["Bergen"]);
			await expect
				.poll(() => docLogged(page, "change").then((log) => log.slice(-1)))
				.toEqual(["Bergen"]); // The last change carries the final text, as the browser dispatched its own with the padded text
			expect(await logged(page, "comboboxbeforematch")).toEqual([]); // A confirmed item is never matched
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
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

		test("Enter on text equal to current item matches and only syncs input", async ({
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
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Enter always matches against the options
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]); // The match is the current item, so nothing is selected

			await input.fill(" Trondheim ");
			await input.press("Enter");
			await expect(items).toHaveCount(1);
			await expect(input).toHaveValue("Trondheim"); // Synced from the item, as the match is the current item
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(2);
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);

			await input.fill("trondheim");
			await input.press("Enter");
			await expect(items).toHaveCount(1);
			await expect(input).toHaveValue("Trondheim"); // Match is case insensitive
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(3);
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
		});

		for (const multiple of [false, true]) {
			test(`Enter on text equal to an item without a matching option does not announce invalid in ${multiple ? "multiple" : "single"} mode`, async ({
				page,
			}) => {
				await render(page, {
					multiple,
					items: [{ value: "custom-id", label: "Custom" }], // Not among the options, i.e. prefilled from server before options are loaded
					options: [{ text: "Other" }],
				}); // Enter always matches against the options, so an item can only be toggled through its option
				await resetLog(page, "comboboxbeforematch");
				await resetLog(page, "comboboxbeforeselect");
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");
				const live = page.locator("[aria-live='assertive']");

				await input.click();
				await input.fill("Custom");
				await input.press("Enter");
				await settled(page);
				await expect(items).toHaveText(["Custom"]); // Unchanged
				await expect(input).toHaveValue("Custom");
				await expect(live).not.toHaveText(/Invalid value/); // A confirmed item is never invalid
				expect(await logged(page, "comboboxbeforematch")).toHaveLength(1); // Still matched against the options
				expect(await logged(page, "comboboxbeforeselect")).toEqual([]);

				await input.fill("Other thing");
				await input.press("Enter");
				await expect(live).toHaveText(/Invalid value/); // Announced, as the text is neither an option nor an item
				await expect(items).toHaveText(["Custom"]);
			});
		}

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
			await resetDocLog(page);

			await input.click();
			await input.fill("os");
			await selectOption(input, page.locator(`${OPT_TAG}[value="oslo-id"]`));
			await expect(item).toHaveAttribute("value", "oslo-id");
			await expect(input).toHaveValue("Oslo"); // Synced back from the item
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
			expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Picks never match
			await afterRendered(page);
			if (!IS_NATIVE) expect(await docLogged(page, "change")).toEqual(["Oslo"]); // Exactly one change: the sync commits the text inside the pick's input dispatch, so the <u-datalist> setValue skips its own, like the browser. Skipped for the simulated native pick, which dispatches its own change
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
			await selectOption(input, page.locator(OPT_TAG, { hasText: "same-2" }));
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
			await selectOption(input, page.locator(OPT_TAG, { hasText: "same-2" }));
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

		test("Enter on the item text keeps the current item with equal labels", async ({
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
			await resetLog(page, "comboboxbeforeselect");

			await input.click();
			await input.press("Enter");
			await expect(item).toHaveAttribute("value", "same-2"); // The item's own option wins the label tie, so the first option does not replace it
			await expect(item).toHaveCount(1);
			await expect(input).toHaveValue("Same text");
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]); // Already the item, so only the text is synced
		});

		test("Enter on a chip label with equal labels does not add the other option in multiple mode", async ({
			page,
		}) => {
			await render(page, {
				multiple: true,
				options: [
					{ label: "Same text", value: "same-1", text: "same-1" },
					{ label: "Same text", value: "same-2", text: "same-2" },
				],
				items: [{ value: "same-2", label: "Same text" }],
			});
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			await resetLog(page, "comboboxbeforeselect");

			await input.click();
			await input.fill("Same text");
			await input.press("Enter");
			await expect(items).toHaveCount(1); // Resolves to the chip's option, which Enter never re-adds
			await expect(items.first()).toHaveAttribute("value", "same-2");
			expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
		});
	});

	test.describe(name("spec: single + creatable"), () => {
		test("Enter creates items but blur does not, and options win over creatable", async ({
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
			await expect(items.first()).toHaveText("Custom"); // Blur never creates, so the item is kept
			await expect(input).toHaveValue("Custom"); // Synced back to the item
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(2); // Blur still matched against the options

			await input.click();
			await input.fill("bergen"); // Predefined option wins over creatable on Enter
			await input.press("Enter");
			await expect(items.first()).toHaveText("Bergen");

			await input.fill("oslo"); // And on blur
			await input.blur();
			await expect(items.first()).toHaveAttribute("value", "oslo-id");
			await expect(input).toHaveValue("Oslo");
		});

		test("without datalist keeps free text, and creates on Enter but not on blur", async ({
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
			await expect(items.first()).toHaveText("Hello"); // Blur never creates, so the item is kept
			await expect(input).toHaveValue("Hello world"); // Free text is never overwritten
			expect(await logged(page, "comboboxbeforematch")).toEqual([]); // Match is never dispatched without a datalist

			await clear.click();
			await expect(input).toHaveValue("");
			await expect(items).toHaveCount(0);
			await expect(clear).toHaveAttribute("hidden", "");
		});
	});
};
