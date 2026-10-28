// Consumer events: preventing comboboxbeforeselect, custom matching through comboboxbeforematch and consumer writes in handlers. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { logged, resetLog } from "../../suite";
import { expect, test } from "../../test";
import type { UHTMLComboboxElement } from "../u-combobox";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const consumerEventsTests = ({
	OPT_TAG,
	name,
	render,
	selectOption,
}: SuiteContext) => {
	test.describe(name("consumer events"), () => {
		test("caches value set by consumer in comboboxafterselect in multiple mode", async ({
			page,
		}) => {
			await render(page, { multiple: true, controlled: false }); // comboboxafterselect only fires when comboboxbeforeselect is not prevented
			await page.locator("u-combobox").evaluate((el: UHTMLComboboxElement) => {
				el.addEventListener("comboboxafterselect", (event) => {
					const { value } = (event as CustomEvent<HTMLDataElement>).detail;
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

		test("supports custom matching by preventing comboboxbeforematch and setting option.selected", async ({
			page,
		}) => {
			await render(page, { multiple: true, items: [OSLO] });
			await page.locator("u-combobox").evaluate((el: UHTMLComboboxElement) => {
				// Prefix matching as in the docs: loop all options and set selected accordingly
				el.addEventListener("comboboxbeforematch", (event) => {
					event.preventDefault();
					const { detail } = event as CustomEvent<HTMLOptionElement>;
					if (!window.__log) window.__log = {};
					if (!window.__log.matchdetail) window.__log.matchdetail = [];
					window.__log.matchdetail.push(detail?.label ?? "none"); // Label of the exact match offered by the component, before the custom match
					const query = el.control?.value.trim().toLowerCase() || "";
					for (const opt of el.options)
						opt.selected = !!query && opt.label.toLowerCase().startsWith(query);
				});
			});
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const oslo = page.locator(OPT_TAG, { hasText: "Oslo" });
			const trondheim = page.locator(OPT_TAG, { hasText: "Trondheim" });

			await input.click();
			await input.fill("tron"); // No label equals "tron", so only the custom match finds Trondheim
			await input.press("Enter");
			await expect(items).toHaveText(["Oslo", "Trondheim"]);
			await expect(input).toHaveValue("tron"); // Multiple mode keeps the text
			await expect(oslo).toHaveAttribute("selected"); // Option selection mirrors the items again after the custom match
			await expect(trondheim).toHaveAttribute("selected");
			expect(await logged(page, "matchdetail")).toEqual(["none"]); // No label equals "tron", so detail is undefined

			await input.fill("osl");
			await input.press("Enter");
			await page.waitForTimeout(100);
			await expect(items).toHaveText(["Oslo", "Trondheim"]); // Custom match of an existing item is kept, as Enter only adds
			await expect(oslo).toHaveAttribute("selected");
			await expect(trondheim).toHaveAttribute("selected");

			await update(page, { multiple: false, items: [] });
			await input.fill("bergen");
			await input.press("Enter");
			await expect(items).toHaveText(["Bergen"]);
			await expect(input).toHaveValue("Bergen"); // Single mode syncs the input to the custom match
			expect(await logged(page, "matchdetail")).toEqual([
				"none",
				"none",
				"Bergen",
			]); // detail is the option whose label equals the text, also when prevented

			await input.fill("xyz");
			await input.press("Enter");
			await expect(input).toHaveValue("xyz"); // Custom match selects nothing, so the typed text stays
			await expect(items).toHaveText(["Bergen"]);

			await input.fill("tron");
			await input.blur();
			await expect(items).toHaveText(["Trondheim"]); // Blur uses the custom match too
			await expect(input).toHaveValue("Trondheim");
		});

		for (const multiple of [false, true]) {
			test(`rejects the match when comboboxbeforematch is prevented and all options are deselected in ${multiple ? "multiple" : "single"} mode`, async ({
				page,
			}) => {
				await render(page, { multiple, items: [OSLO] });
				await page
					.locator("u-combobox")
					.evaluate((el: UHTMLComboboxElement) => {
						el.addEventListener("comboboxbeforematch", (event) => {
							event.preventDefault();
							for (const opt of el.options) opt.selected = false; // Options mirror the items, so reject by deselecting all, as in the docs
						});
					});
				await resetLog(page, "comboboxbeforeselect");
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");
				const oslo = page.locator(OPT_TAG, { hasText: "Oslo" });
				const live = page.locator("[aria-live='assertive']");

				await input.click();
				await input.fill("bergen"); // Would match Bergen without the prevent
				await input.press("Enter");
				await page.waitForTimeout(100);
				await expect(items).toHaveText(["Oslo"]); // Not Bergen, and the existing item is not taken for the custom match
				await expect(input).toHaveValue("bergen"); // Typed text stays until blur
				await expect(live).toHaveText(/Invalid value/); // Rejected is no match
				await expect(oslo).toHaveAttribute("selected"); // Option selection mirrors the items again
				expect(await logged(page, "comboboxbeforeselect")).toEqual([]);

				await input.blur();
				await expect(items).toHaveText(["Oslo"]);
				await expect(input).toHaveValue(multiple ? "bergen" : "Oslo"); // Single mode syncs to the item on blur
				expect(await logged(page, "comboboxbeforeselect")).toEqual([]);
			});
		}

		test("does not match a hidden or disabled option", async ({ page }) => {
			await render(page, {
				multiple: true,
				options: [
					{ text: "Oslo", value: "oslo-id", hidden: true },
					{ text: "Bergen" },
					{ text: "Trondheim" },
				],
			});
			await page
				.locator(OPT_TAG, { hasText: "Bergen" })
				.evaluate((el) => el.setAttribute("disabled", "")); // Written directly, as the harness has no disabled option
			await resetLog(page, "comboboxbeforematch");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			const live = page.locator("[aria-live='assertive']");

			await input.click();
			await input.fill("oslo");
			await input.press("Enter");
			await page.waitForTimeout(100);
			await expect(items).toHaveCount(0); // Hidden option is not offered, so it is not matched
			await expect(live).toHaveText(/Invalid value/);

			await input.fill("bergen");
			await input.press("Enter");
			await page.waitForTimeout(100);
			await expect(items).toHaveCount(0); // Disabled option is not matched

			await input.fill("trondheim");
			await input.press("Enter");
			await expect(items).toHaveText(["Trondheim"]);
			expect(await logged(page, "comboboxbeforematch")).toHaveLength(3); // Match is still dispatched, so a consumer can match or create
		});

		test("restores the text after a prevented clear removal", async ({
			page,
		}) => {
			await render(page, {
				controlled: "manual",
				items: [OSLO],
				clear: true,
			}); // Rejects every select
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			await expect(input).toHaveValue("Oslo");

			await input.click();
			await page.locator('button[type="reset"]').click();
			await expect(items).toHaveText(["Oslo"]); // Prevented
			await expect(input).toHaveValue("Oslo"); // Restored, as the revert mirrors confirmed state and is not cancelable
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

		test("restores the search text after selecting multiple datalist options in uncontrolled mode", async ({
			page,
		}) => {
			await render(page, { multiple: true, controlled: false }); // Component manages items itself
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.click();
			await selectOption(input, page.locator(`${OPT_TAG}[value="oslo-id"]`));
			await expect(items).toHaveText(["Oslo"]);
			await expect(input).toHaveValue("");

			await input.fill("Ber");
			await selectOption(input, page.locator(OPT_TAG).nth(1));
			await expect(items).toHaveText(["Oslo", "Bergen"]);
			await expect(input).toHaveValue("Ber");
		});

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
			await page.locator("u-combobox").evaluate((el: UHTMLComboboxElement) => {
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
};
