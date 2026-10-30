// Mount: the sync on connect, items and lists rendered or replaced by the framework, and remount. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { docLogged, logged, resetDocLog, resetLog, settled } from "../../suite";
import { expect, test } from "../../test";
import type { Option } from "../u-combobox.harness";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const mountTests = ({
	LIST_TAG,
	OPT_TAG,
	name,
	render,
}: SuiteContext) => {
	test.describe(name("mount"), () => {
		test("mirrors items into options replaced after mount", async ({
			page,
		}) => {
			await render(page, { multiple: true, items: [OSLO, BERGEN] });
			const items = page.locator("u-combobox data");
			const oslo = page.locator(OPT_TAG, { hasText: "Oslo" });
			const bergen = page.locator(OPT_TAG, { hasText: "Bergen" });
			const other = page.locator(OPT_TAG, { hasText: "Other" });

			await expect(oslo).toHaveAttribute("selected");
			await expect(bergen).toHaveAttribute("selected");

			// New ids force the framework to create new option elements, so only the list contents mutate (i.e. async search results)
			await update(page, {
				options: [
					{ text: "Other" },
					{ id: "oslo-2", value: "oslo-id", text: "Oslo" },
					{ id: "bergen-2", text: "Bergen" },
				],
			});
			await expect(oslo).toHaveAttribute("selected"); // The replaced options mirror the items again
			await expect(bergen).toHaveAttribute("selected");
			await expect(other).not.toHaveAttribute("selected");
			await expect(items).toHaveText(["Oslo", "Bergen"]); // Items are untouched by an option change
		});

		test("syncs single mode input on mount and dispatches input but not change", async ({
			page,
		}) => {
			await resetDocLog(page);
			await render(page, { items: [BERGEN] });
			const input = page.locator("#input");

			await expect(input).toHaveValue("Bergen");
			await expect.poll(() => docLogged(page, "input")).toEqual(["Bergen"]); // Mount sync dispatches input like any later sync
			expect(await docLogged(page, "change")).toEqual([]); // Not a user commit

			await update(page, {
				items: [{ value: "Bergen", label: "Trondheim" }],
			}); // Same key, new label text
			await expect(input).toHaveValue("Trondheim");
			expect(await docLogged(page, "input")).toEqual(["Bergen", "Trondheim"]);
			expect(await docLogged(page, "change")).toEqual([]); // Programmatic item change is not a user commit
		});

		test("clears prefilled input on mount in single mode when list exists but no item", async ({
			page,
		}) => {
			await resetDocLog(page);
			await render(page, { value: "Draft" });
			const input = page.locator("#input");

			await expect(input).toHaveValue(""); // Single mode always mirrors the item, and there is none
			await expect.poll(() => docLogged(page, "input")).toEqual([""]);
			expect(await docLogged(page, "change")).toEqual([]); // Not a user commit
		});

		test("keeps prefilled input on mount in multiple mode", async ({
			page,
		}) => {
			await resetDocLog(page);
			await render(page, { multiple: true, value: "Draft" });
			const input = page.locator("#input");

			await expect(input).toHaveValue("Draft"); // Filter text is never overwritten in multiple mode
			await settled(page); // Allow the deferred mount sync to run
			expect(await docLogged(page, "input")).toEqual([]); // No sync dispatched on mount
			expect(await docLogged(page, "change")).toEqual([]);
		});

		test("keeps prefilled input on mount without list", async ({ page }) => {
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
			expect(await logged(page, "input")).toEqual(["Bergen", "Trondheim", ""]);
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
			await expect(page.locator(OPT_TAG).nth(0)).toHaveAttribute("selected");

			await input.fill("Stavanger");
			await input.press("Enter");
			await expect(page.locator("u-combobox data")).toHaveText([
				"Bergen",
				"Stavanger",
			]);
		});
	});
};
