// Event fingerprinting: how a pick is told apart from typing, autofill, spell check and synthetic events, and what a prevented pick or match leaves in the input. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { logged, resetLog } from "../../suite";
import { expect, test } from "../../test";
import { OPTIONS } from "../u-combobox.harness";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const fingerprintingTests = ({
	OPT_TAG,
	IS_NATIVE,
	name,
	render,
	selectOption,
}: SuiteContext) => {
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

		test("treats a synthetic input without inputType as typing", async ({
			page,
		}) => {
			// Mimics @testing-library fireEvent.beforeInput(input) followed by fireEvent.input(input, { target: { value } }).
			// An untrusted event without inputType is never a pick, also when the value is an option value
			await render(page, { multiple: true });
			await resetLog(page, "input");
			const input = page.locator("#input");

			await input.evaluate((el) => {
				const input = el as HTMLInputElement;
				const proto = HTMLInputElement.prototype;
				input.dispatchEvent(new InputEvent("beforeinput", { bubbles: true }));
				Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(
					input,
					"Bergen", // An option value, which a flagged pick would select
				);
				input.dispatchEvent(new InputEvent("input", { bubbles: true }));
			});
			await expect(input).toHaveValue("Bergen"); // Not reverted
			await expect(page.locator("u-combobox data")).toHaveCount(0);
			expect(await logged(page, "input")).toEqual(["Bergen"]); // Propagated to consumer
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

		test("treats insertReplacementText equal to an option value as a pick", async ({
			page,
		}) => {
			// An untrusted insertReplacementText is what a <u-datalist> pick dispatches, and the only way a test can simulate a native <datalist> pick.
			// A Firefox spell check correction to a word that happens to be an option value dispatches the same event, but trusted, which is only a pick
			// with native <datalist>. That can not be simulated, as a test can not dispatch trusted events
			await render(page);
			await resetLog(page, "comboboxbeforeselect");
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.click();
			await input.fill("Trondhiem");
			await input.evaluate((el) => {
				const input = el as HTMLInputElement;
				const data = "Trondheim"; // Corrected to an option value
				const init = {
					bubbles: true,
					data,
					inputType: "insertReplacementText",
				};
				input.setRangeText(data, 0, input.value.length, "end");
				input.dispatchEvent(new InputEvent("input", init));
			});
			await expect(items).toHaveText(["Trondheim"]); // Picked
			await expect(input).toHaveValue("Trondheim"); // Synced to the item in single mode
			expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);
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

			await selectOption(input, page.locator(OPT_TAG, { hasText: "Bergen" }));
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
};
