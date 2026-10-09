import { expect, type Page, test } from "@playwright/test";
import { comboboxSuite } from "./u-combobox.suite";

/**
 * Runs the shared suite (u-combobox.suite.ts) against the vanilla DOM harness page
 * (frameworks/vanilla/test.u-combobox.html), uncontrolled by default so the component
 * manages its own <data> items, as controlled mode is covered by every framework suite.
 *
 * The tests below need raw DOM access and have no equivalent in the harness.
 */
comboboxSuite("Vanilla", {
	url: "frameworks/vanilla/test.u-combobox.html",
	defaults: { controlled: false },
});

declare global {
	interface Window {
		__log?: Record<string, string[]>;
	}
}

const setCaretStart = (input: HTMLInputElement) => {
	input.selectionStart = input.selectionEnd = 0;
};

const mount = (page: Page, html: string) =>
	page.evaluate((markup) => {
		document.body.innerHTML = markup;
	}, html);

// Log events dispatched on a selector, storing the target value at the time of the event
const listen = (page: Page, type: string, selector = "u-combobox") =>
	page.evaluate(
		([type, selector]) => {
			const el = document.querySelector(selector) as HTMLElement;
			window.__log = window.__log || {};
			window.__log[type] = [];
			el.addEventListener(type, (event) => {
				const target = event.target as HTMLInputElement;
				window.__log?.[type].push(
					typeof target?.value === "string" ? target.value : "",
				);
			});
		},
		[type, selector] as const,
	);

const logged = (page: Page, type: string) =>
	page.evaluate((type) => window.__log?.[type] || [], type);

test.describe("DOM", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("test.html");
	});

	test("matches snapshot", async ({ page }) => {
		await mount(page, "<u-combobox></u-combobox>");
		expect(await page.locator("body").innerHTML()).toMatchSnapshot(
			"u-combobox",
		);
	});

	for (const [LIST_TAG, OPT_TAG] of [
		["u-datalist", "u-option"],
		["datalist", "option"],
	]) {
		// data-nofilter so option visibility does not depend on the typed text
		const combobox = (attrs = "") => `
			<label for="input">Label</label>
			<u-combobox ${attrs}>
				<input id="input" list="list">
				<${LIST_TAG} id="list" data-nofilter>
					<${OPT_TAG} value="oslo-id" label="Oslo">Oslo</${OPT_TAG}>
					<${OPT_TAG}>Bergen</${OPT_TAG}>
					<${OPT_TAG} value="Trondheim">Trondheim</${OPT_TAG}>
				</${LIST_TAG}>
			</u-combobox>`;

		test.describe(`DOM (${LIST_TAG})`, () => {
			test("keeps typed text when frameworks re-write attributes", async ({
				page,
			}) => {
				await mount(page, combobox());
				const input = page.locator("#input");

				await input.pressSequentially("bergen");
				await expect(input).toHaveValue("bergen");

				// Controlled inputs (i.e. React) sync the value attribute on every keystroke
				await input.evaluate((el) => el.setAttribute("value", "bergen"));
				// Frameworks (i.e. Vue) re-write unchanged option values on every render
				await page
					.locator(OPT_TAG)
					.first()
					.evaluate((el) => {
						el.setAttribute("value", el.getAttribute("value") || "");
					});
				await page.waitForTimeout(100); // Give a wrongly triggered sync time to run
				await expect(input).toHaveValue("bergen"); // Neither write is a state change, so a sync must not revert the typed text
			});

			test("syncs item text into a replaced input in single mode", async ({
				page,
			}) => {
				await mount(
					page,
					combobox().replace(
						"<input",
						'<data value="Bergen">Bergen</data><input',
					),
				);
				await expect(page.locator("#input")).toHaveValue("Bergen");

				// Keyed re-renders can replace the input element itself
				await page.evaluate(() => {
					const prev = document.getElementById("input") as HTMLInputElement;
					const next = document.createElement("input");
					next.id = "input";
					prev.replaceWith(next);
				});
				const input = page.locator("#input");
				await expect(input).toHaveValue("Bergen"); // The new control receives the item text

				await input.evaluate((el) => {
					(el as HTMLInputElement).value = "typed"; // Programmatic changes are detected on the new control
				});
				await input.fill("");
				await input.press("Enter");
				await expect(page.locator("u-combobox data")).toHaveCount(0);
			});

			test("works after being moved in the DOM", async ({ page }) => {
				await mount(page, `${combobox("data-multiple")}<div id="other"></div>`);
				await listen(page, "comboboxbeforeselect");
				const input = page.locator("#input");

				await page.evaluate(() => {
					const combobox = document.querySelector("u-combobox") as Element;
					document.getElementById("other")?.append(combobox);
				});
				await input.fill("Bergen");
				await input.press("Enter");
				await expect(page.locator("u-combobox data")).toHaveText(["Bergen"]);
				expect(await logged(page, "comboboxbeforeselect")).toHaveLength(1);
			});

			// <u-datalist> before 3.0.0 picked an option by dispatching beforeinput, writing input.value through the
			// prototype setter (patched by u-combobox to detect programmatic input) and dispatching input.
			// Before 2.0.3 the events had an empty inputType, 2.0.3 used insertReplacementText
			for (const inputType of ["", "insertReplacementText"]) {
				const legacy = `legacy <u-datalist> ${inputType ? "2.0.3" : "before 2.0.3"}`;
				const legacyPick = ([value, inputType]: readonly string[]) => {
					const input = document.getElementById("input") as HTMLInputElement;
					const init = {
						bubbles: true,
						composed: true,
						data: value,
						inputType,
					};
					const proto = HTMLInputElement.prototype;
					input.dispatchEvent(new InputEvent("beforeinput", init));
					Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(
						input,
						value,
					);
					input.dispatchEvent(new InputEvent("input", init));
					input.dispatchEvent(new Event("change", { bubbles: true }));
				};

				test(`${legacy} pick adds item and keeps typed text in multiple mode`, async ({
					page,
				}) => {
					await mount(page, combobox("data-multiple"));
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.pressSequentially("Ber");
					await page.evaluate(legacyPick, ["oslo-id", inputType] as const);
					await expect(items).toHaveText(["Oslo"]);
					await expect(input).toHaveValue("Ber"); // The setter write of the pick is not cached as typed text

					await page.evaluate(legacyPick, ["oslo-id", inputType] as const);
					await expect(items).toHaveCount(0); // Toggled off
					await expect(input).toHaveValue("Ber");
				});

				test(`${legacy} prevented pick reverts to typed text in single mode`, async ({
					page,
				}) => {
					await mount(page, combobox());
					await listen(page, "comboboxbeforeselect");
					const input = page.locator("#input");
					const items = page.locator("u-combobox data");

					await input.pressSequentially("Ber");
					await page.evaluate(legacyPick, ["oslo-id", inputType] as const);
					await expect(items).toHaveText(["Oslo"]);
					await expect(input).toHaveValue("Oslo"); // Accepted pick syncs the input

					await page.evaluate(() => {
						document
							.querySelector("u-combobox")
							?.addEventListener("comboboxbeforeselect", (e) =>
								e.preventDefault(),
							);
					});
					await input.fill("Tron");
					await page.evaluate(legacyPick, ["Trondheim", inputType] as const);
					await page.waitForTimeout(100); // Give a wrongly cached value time to surface
					await expect(items).toHaveText(["Oslo"]); // Prevented
					await expect(input).toHaveValue("Tron"); // Reverted to the typed text, not the option value
					expect(await logged(page, "comboboxbeforeselect")).toHaveLength(2);
				});
			}

			test("works inside a shadow root", async ({ page }) => {
				await mount(page, `<div id="host"></div>`);
				await page.evaluate((markup) => {
					const host = document.getElementById("host") as HTMLElement;
					host.attachShadow({ mode: "open" }).innerHTML = markup;
				}, combobox("data-multiple"));
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");

				await input.fill("Bergen");
				await input.press("Enter");
				await expect(items).toHaveText(["Bergen"]);

				await input.fill("");
				await input.evaluate(setCaretStart);
				await input.press("ArrowLeft");
				await expect(items.first()).toBeFocused();
				await items.first().press("Backspace");
				await expect(items).toHaveCount(0);
				await expect(input).toBeFocused();
			});
		});
	}
});
