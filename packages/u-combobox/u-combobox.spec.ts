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
			test("keeps typing match when frameworks re-write attributes", async ({
				page,
			}) => {
				await mount(page, combobox());
				const input = page.locator("#input");
				const match = page.locator(OPT_TAG).nth(1);

				await input.pressSequentially("bergen");
				await expect(match).toHaveAttribute("selected");

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
				await expect(match).toHaveAttribute("selected"); // Neither write is a state change, so the match must survive
				await expect(input).toHaveValue("bergen");
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
