// Events and state: which input and change events a pick, commit, blur and programmatic item change dispatch. Part of the shared u-combobox suite, see ../u-combobox.suite.ts
import { afterRendered, docLogged, resetDocLog, settled } from "../../suite";
import { expect, test } from "../../test";
import { BERGEN, OSLO, type SuiteContext, update } from "./context";

export const eventsTests = ({
	OPT_TAG,
	IS_NATIVE,
	name,
	render,
	selectOption,
}: SuiteContext) => {
	test.describe(name("events and state"), () => {
		test("dispatches input only for the synced value on option click in single mode", async ({
			page,
		}) => {
			await render(page);
			await resetDocLog(page);
			const input = page.locator("#input");

			await input.pressSequentially("Ber");
			await selectOption(input, page.locator(OPT_TAG, { hasText: "Bergen" }));
			await expect(input).toHaveValue("Bergen");
			await expect
				.poll(() => docLogged(page, "input"))
				.toEqual(["B", "Be", "Ber", "Bergen"]); // The click input is stopped, the sync dispatches its own
			if (IS_NATIVE)
				expect((await docLogged(page, "change")).slice(-1)).toEqual(["Bergen"]); // The sync dispatches change last, after the change of the simulated native pick
			else expect(await docLogged(page, "change")).toEqual(["Bergen"]); // Only the sync dispatches change, as the pick was reverted and the text was unchanged
		});

		test("dispatches no change on an option click that keeps the text in multiple mode", async ({
			page,
		}) => {
			test.skip(
				IS_NATIVE,
				"The simulated native pick dispatches change itself",
			);
			await render(page, { multiple: true });
			await resetDocLog(page);
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.pressSequentially("Ber");
			await selectOption(input, page.locator(OPT_TAG, { hasText: "Bergen" }));
			await expect(items).toHaveText(["Bergen"]);
			await expect(input).toHaveValue("Ber");
			await afterRendered(page);
			expect(await docLogged(page, "input")).toEqual(["B", "Be", "Ber"]); // The click input is stopped
			expect(await docLogged(page, "change")).toEqual([]); // The text ends up unchanged, so no change
		});

		test("dispatches change only when the sync follows a user commit", async ({
			page,
		}) => {
			await render(page, { items: [BERGEN] });
			const input = page.locator("#input");
			const lastChange = () =>
				docLogged(page, "change").then((log) => log.slice(-1)); // Last, as the browser dispatches its own change on Enter and blur
			await expect(input).toHaveValue("Bergen");
			await resetDocLog(page);

			await update(page, { items: [OSLO] }); // Programmatic item change
			await expect(input).toHaveValue("Oslo");
			expect(await docLogged(page, "input")).toEqual(["Oslo"]);
			expect(await docLogged(page, "change")).toEqual([]); // Not a user commit

			await input.click();
			await input.fill("bergen"); // Differs in case from the label, so the sync writes "Bergen"
			await input.press("Enter");
			await expect(input).toHaveValue("Bergen");
			await expect.poll(lastChange).toEqual(["Bergen"]); // Enter is a user commit

			await resetDocLog(page);
			await input.fill("xyz");
			await input.blur();
			await expect(input).toHaveValue("Bergen"); // Blur falls back to the item
			await expect.poll(lastChange).toEqual(["Bergen"]); // Blur is a user commit, and the browser has already dispatched change with "xyz" on blur, so the last change must carry the final text

			await resetDocLog(page);
			await update(page, { items: [] }); // Programmatic removal
			await expect(input).toHaveValue("");
			expect(await docLogged(page, "input")).toEqual([""]);
			expect(await docLogged(page, "change")).toEqual([]);
		});

		test("does not dispatch change on a programmatic item change after a rejected Enter", async ({
			page,
		}) => {
			await render(page, { controlled: "manual" }); // Rejects every select
			const input = page.locator("#input");

			await input.click();
			await input.fill("Bergen");
			await input.press("Enter"); // Prevented, and the item is left unchanged
			await expect(input).toHaveValue("Bergen");
			await afterRendered(page); // The rejected commit expires after the render opportunity
			await resetDocLog(page);

			await update(page, { items: [OSLO] }); // Unrelated programmatic item change
			await expect(input).toHaveValue("Oslo");
			expect(await docLogged(page, "input")).toEqual(["Oslo"]);
			expect(await docLogged(page, "change")).toEqual([]); // Not a user commit, as the rejected commit has expired
		});

		test("handles blur after a pointerdown that ended in pointercancel", async ({
			page,
		}) => {
			// A touch that turns into a scroll fires pointercancel instead of pointerup, which must also release the pressed state
			await render(page, { items: [BERGEN] });
			const input = page.locator("#input");

			await input.click();
			await input.fill("xyz");
			const box = (await input.boundingBox()) as Record<string, number>;
			await page.mouse.move(box.x + 5, box.y + box.height / 2);
			await page.mouse.down(); // Pressed inside <u-combobox>
			await input.evaluate((el) =>
				el.dispatchEvent(
					new PointerEvent("pointercancel", {
						bubbles: true,
						composed: true,
					}),
				),
			);
			await input.evaluate((el) => (el as HTMLInputElement).blur());
			await expect(input).toHaveValue("Bergen"); // Blur is handled, falling back to the item
			await page.mouse.up();
		});

		test("handles blur after a press inside that is released outside without a click", async ({
			page,
		}) => {
			// Pressing a non-focusable part of <u-combobox> blurs the input, and dragging out releases without the click that would have refocused it
			await render(page, { items: [BERGEN] });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.fill("oslo");
			// Measured after the fill, as Android opens the list on focus, which grows the host below the input
			const host = (await page.locator("u-combobox").boundingBox()) as Record<
				string,
				number
			>;
			const box = (await input.boundingBox()) as Record<string, number>;
			await page.mouse.move(box.x + box.width + 10, box.y + box.height / 2); // Beside the input, on the host and not on the list
			await page.mouse.down();
			await expect(input).not.toBeFocused();
			await page.mouse.move(host.x + host.width / 2, host.y + host.height + 40); // Below the host, inside the viewport as Firefox drops events outside it
			await page.mouse.up(); // Released outside, so no click refocuses the input
			await expect(items).toHaveText(["Oslo"]); // Blur is handled once the press ends, matching the typed text
			await expect(input).toHaveValue("Oslo");
		});

		test("dispatches no input on option click in multiple mode", async ({
			page,
		}) => {
			await render(page, { multiple: true });
			await resetDocLog(page);
			const input = page.locator("#input");

			await input.pressSequentially("Ber");
			await selectOption(input, page.locator(OPT_TAG, { hasText: "Bergen" }));
			await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
			await expect(input).toHaveValue("Ber");
			await settled(page);
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

		test("selects option on click in type=email where selection is unsupported", async ({
			page,
		}) => {
			await render(page, { multiple: true, inputAttrs: { type: "email" } });
			const input = page.locator("#input");
			const items = page.locator("u-combobox data");

			await input.pressSequentially("B");
			await selectOption(input, page.locator(OPT_TAG, { hasText: "Bergen" }));
			await expect(items).toHaveText(["Bergen"]);
			await expect(input).toHaveValue("B");

			await update(page, { multiple: false });
			await expect(input).toHaveValue("Bergen"); // Synced through the native setter
			await selectOption(input, page.locator(OPT_TAG, { hasText: "Oslo" }));
			await expect(items).toHaveText(["Oslo"]);
			await expect(input).toHaveValue("Oslo");
		});
	});
};
