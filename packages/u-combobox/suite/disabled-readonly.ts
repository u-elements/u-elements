// Disabled and readonly: every action is ignored, and the buttons re-sync when the state changes. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { logged, resetLog, settled } from "../../suite";
import { expect, test } from "../../test";
import { BERGEN, type SuiteContext, update } from "./context";

export const disabledReadonlyTests = ({
	OPT_TAG,
	IS_NATIVE,
	name,
	render,
	selectOption,
}: SuiteContext) => {
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
				await items.first().click({ position: { x: 2, y: 2 }, force: true }); // Force, as the item has pointer-events: none

				await update(page, { inputAttrs: {} });
				await expect(items.first()).toHaveAttribute("tabindex", "-1");
				await update(page, { inputAttrs: { [state]: "" } });

				if (state === "readonly") {
					await input.focus();
					await page.keyboard.press("Enter");
					await expect(items).toHaveCount(1); // No item added from prefilled value
				}
			});

			test(`treats a replacement as typing when ${state}`, async ({ page }) => {
				// input passes the inert gate so a sync can cache its text, but a pick fingerprint must not reach dispatchSelect while inert
				await render(page, {
					multiple: true,
					items: [BERGEN],
					value: "typed",
					inputAttrs: { [state]: "" },
				});
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");
				await resetLog(page, "input");

				await input.evaluate((el: HTMLInputElement) => {
					const data = "oslo-id";
					el.setRangeText(data, 0, el.value.length);
					el.dispatchEvent(
						new InputEvent("input", {
							bubbles: true,
							composed: true,
							data,
							inputType: "insertReplacementText",
						}),
					);
				});
				await expect(items).toHaveText(["Bergen"]); // Never a pick while inert
				await expect(input).toHaveValue("oslo-id"); // Kept as a consumer write
				expect(await logged(page, "input")).toEqual(["oslo-id"]); // Not suppressed
			});

			test(`caches the item text synced while ${state}, so a prevented pick or clear after enabling reverts to it`, async ({
				page,
			}) => {
				// The sync writes the text with setRangeText and dispatches input, but handleEvent drops the event while inert, so the cache must be refreshed by the sync itself
				await render(page, {
					controlled: "manual", // Prevents every select
					items: [BERGEN],
					clear: true,
					inputAttrs: { [state]: "" },
				});
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");
				await expect(input).toHaveValue("Bergen"); // Synced on mount while inert

				await input.evaluate((el: HTMLInputElement) => {
					el.disabled = el.readOnly = false;
				});
				await input.click();
				await selectOption(input, page.locator(OPT_TAG, { hasText: "Oslo" }));
				await expect(items).toHaveText(["Bergen"]); // Prevented
				await expect(input).toHaveValue("Bergen"); // Reverted to the synced text, not the mount value

				await page.locator('button[type="reset"]').click();
				await expect(items).toHaveText(["Bergen"]); // Prevented
				await expect(input).toHaveValue("Bergen"); // Restored to the synced text
			});

			test(`hides toggle when ${state}, and re-syncs buttons when toggled at runtime`, async ({
				page,
			}) => {
				await render(page, {
					clear: true,
					toggle: true,
					inputAttrs: { [state]: "" },
				});
				const input = page.locator("#input");
				const clear = page.locator('button[type="reset"]');
				const toggle = page.locator("button[aria-expanded]");
				const prop = state === "readonly" ? "readOnly" : "disabled";

				await expect(toggle).toHaveAttribute("hidden", ""); // Nothing can be toggled
				await input.evaluate((el, prop) => {
					(el as HTMLInputElement)[prop as "disabled"] = false;
				}, prop);
				if (IS_NATIVE)
					await expect(toggle).toHaveAttribute("hidden", ""); // Native datalist can not be opened programmatically
				else await expect(toggle).not.toHaveAttribute("hidden"); // Idle and interactive

				await input.fill("Hello");
				await expect(clear).not.toHaveAttribute("hidden");
				await input.evaluate((el, prop) => {
					(el as HTMLInputElement)[prop as "disabled"] = true;
				}, prop);
				await expect(clear).toHaveAttribute("hidden", ""); // Re-synced without any other mutation
				await expect(toggle).toHaveAttribute("hidden", "");
			});
		}

		test("ignores blur when readonly, also with programmatic text", async ({
			page,
		}) => {
			// A readonly input can be focused, so blur must be gated like every other action and never match or sync
			await render(page, {
				items: [BERGEN],
				inputAttrs: { readonly: "" },
			});
			await resetLog(page, "comboboxbeforematch");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");
			await expect(input).toHaveValue("Bergen"); // Synced on mount

			await input.evaluate((el: HTMLInputElement) => {
				el.value = "Oslo"; // Equal to an option label, which blur would otherwise match
			});
			await input.focus();
			await input.blur();
			await settled(page); // Blur commit is deferred one tick

			await expect(items).toHaveText(["Bergen"]); // Not replaced
			await expect(input).toHaveValue("Oslo"); // Not synced back to the item
			expect(await logged(page, "comboboxbeforematch")).toEqual([]);
		});
	});
};
