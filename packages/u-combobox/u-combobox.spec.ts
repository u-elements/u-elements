import type { Page } from "@playwright/test";
import { settled } from "../suite";
import { expect, test } from "../test";
import { comboboxSuite } from "./u-combobox.suite";

/**
 * Runs the shared suite (u-combobox.suite.ts) against the vanilla DOM harness page
 * (frameworks/vanilla/test.html?component=u-combobox), uncontrolled by default so the component
 * manages its own <data> items, as controlled mode is covered by every framework suite.
 *
 * The tests below need raw DOM access and have no equivalent in the harness.
 */
comboboxSuite({
	url: "frameworks/vanilla/test.html?component=u-combobox",
	defaults: { controlled: false },
});

declare global {
	interface Window {
		__log?: Record<string, string[]>;
		__root: ShadowRoot; // Set by the shadow root tests, as locators can not reach into a closed shadow root
	}
}

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

	test("works alongside another version on the same page", async ({ page }) => {
		// Load a second copy of the package with its own utils, version and tag, like two separately bundled versions.
		// Vite serves a URL with a query as its own module instance
		const missing: string[] = [];
		const url = "/packages/u-combobox/u-combobox.ts?version=2";
		await page.route(`**${url}`, async (route) => {
			const response = await route.fetch();
			let body = await response.text();
			for (const [from, to] of [
				['from "/packages/utils.ts"', 'from "/packages/utils.ts?version=2"'],
				["`_uComboboxes", "`_uComboboxes-2-"],
				['define("u-combobox"', 'define("u-combobox-2"'],
			]) {
				if (!body.includes(from)) missing.push(from);
				body = body.replace(from, to);
			}
			await route.fulfill({ response, body });
		});
		await page.evaluate(async (url) => {
			await import(url);
		}, url);
		expect(missing).toEqual([]); // Fails loudly if the served module changed shape, instead of testing one version twice

		const combobox = (tag: string, n: number) => `
			<${tag} data-multiple>
				<input id="input-${n}" list="list-${n}">
				<u-datalist id="list-${n}">
					<u-option>Oslo</u-option>
					<u-option>Bergen</u-option>
				</u-datalist>
				<button type="reset"></button>
			</${tag}>`;
		await mount(page, combobox("u-combobox", 1) + combobox("u-combobox-2", 2));
		const input1 = page.locator("#input-1");
		const input2 = page.locator("#input-2");
		const items1 = page.locator("u-combobox data");
		const items2 = page.locator("u-combobox-2 data");

		// <u-datalist> picks through the shared utils copy, while version 2 has its own. A pick must keep the
		// typed text in both, which breaks if a version mistakes the setValue write for a programmatic one
		await input1.pressSequentially("Os");
		await page.locator("#list-1 u-option", { hasText: "Oslo" }).click();
		await expect(items1).toHaveText(["Oslo"]);
		await expect(input1).toHaveValue("Os");
		await expect(items2).toHaveCount(0);
		await expect(input2).toHaveValue("");

		await input2.pressSequentially("Be");
		await page.locator("#list-2 u-option", { hasText: "Bergen" }).click();
		await expect(items2).toHaveText(["Bergen"]);
		await expect(input2).toHaveValue("Be");
		await expect(items1).toHaveText(["Oslo"]);
		await expect(input1).toHaveValue("Os");

		// Programmatic writes pass through both patched value setters, and only reach the owning version
		const clear1 = page.locator('u-combobox button[type="reset"]');
		const clear2 = page.locator('u-combobox-2 button[type="reset"]');
		await input1.evaluate((el: HTMLInputElement) => {
			el.value = "";
		});
		await expect(clear1).toBeHidden();
		await expect(clear2).toBeVisible();
		await input2.evaluate((el: HTMLInputElement) => {
			el.value = "";
		});
		await expect(clear2).toBeHidden();
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
				await settled(page); // Give a wrongly triggered sync its chance to run
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

			test("falls back after a prevented clear or blur select that re-rendered the unchanged item as a new <data>", async ({
				page,
			}) => {
				await mount(
					page,
					combobox()
						.replace("<input", '<data value="oslo-id">Oslo</data><input')
						.replace(
							"</u-combobox>",
							'<button type="reset"></button></u-combobox>',
						),
				);
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");
				await expect(input).toHaveValue("Oslo");

				// A controlled handler can prevent the select and re-render the unchanged item as a new node (i.e. Angular *ngFor without trackBy)
				await page.evaluate(() => {
					document
						.querySelector("u-combobox")
						?.addEventListener("comboboxbeforeselect", (e) => {
							e.preventDefault();
							const data = (e.target as Element).querySelector("data");
							data?.replaceWith(data.cloneNode(true));
						});
				});

				await page.locator('u-combobox button[type="reset"]').click();
				await expect(items).toHaveText(["Oslo"]); // Prevented
				await expect(input).toHaveValue("Oslo"); // Reverted to the text before the clear, as the removal was rejected and the item is unchanged

				await input.fill("Bergen");
				await input.blur();
				await expect(items).toHaveText(["Oslo"]);
				await expect(input).toHaveValue("Oslo"); // Falls back to the item, as the match was rejected and the item is unchanged
			});

			test("dispatches input events shaped like the browser", async ({
				page,
			}) => {
				await mount(
					page,
					combobox().replace(
						"</u-combobox>",
						'<button type="reset"></button></u-combobox>',
					),
				);
				const input = page.locator("#input");
				await input.evaluate((el) => {
					window.__log = { input: [] };
					el.addEventListener("input", (e) => {
						const { inputType, data } = e as InputEvent;
						window.__log?.input.push(`${inputType}:${data}`);
					});
				});

				await input.fill("bergen");
				await input.press("Enter"); // Matches, then the sync writes the item text
				await expect(input).toHaveValue("Bergen");
				const pick = await logged(page, "input");
				expect(pick[pick.length - 1]).toBe("insertText:Bergen"); // Inserts carry the text

				await page.locator('u-combobox button[type="reset"]').click();
				await expect(page.locator("u-combobox data")).toHaveCount(0);
				await expect(input).toHaveValue("");
				expect((await logged(page, "input")).slice(pick.length)).toEqual([
					"deleteContentBackward:null", // Deletions carry no data
				]);
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

			// A <u-datalist> pick writes the option value with setRangeText and dispatches an untrusted input with insertReplacementText, like Firefox does for native <datalist>.
			// No beforeinput is involved, as no browser dispatches one for a pick. <u-datalist> before 3.0.0 wrote through the prototype setter instead, which is cached as
			// programmatic text, so the typed text would not be restored. That is why <u-combobox> 3.0.0 requires <u-datalist> 3.0.0
			test("takes an untrusted insertReplacementText with an option value for a pick and restores the typed text", async ({
				page,
			}) => {
				await mount(page, combobox("data-multiple"));
				const input = page.locator("#input");
				const items = page.locator("u-combobox data");

				await input.pressSequentially("Ber");
				await page.evaluate(() => {
					const input = document.getElementById("input") as HTMLInputElement;
					const init = {
						bubbles: true,
						data: "oslo-id",
						inputType: "insertReplacementText",
					};
					input.setRangeText("oslo-id", 0, input.value.length, "end");
					input.dispatchEvent(new InputEvent("input", init));
				});
				await expect(items).toHaveText(["Oslo"]); // Picked
				await expect(input).toHaveValue("Ber"); // Reverted to the typed text, as the option value was only written by the pick

				await page.evaluate(() => {
					const input = document.getElementById("input") as HTMLInputElement;
					const init = {
						bubbles: true,
						data: "oslo-id",
						inputType: "insertReplacementText",
					};
					Object.getOwnPropertyDescriptor(
						HTMLInputElement.prototype,
						"value",
					)?.set?.call(input, "oslo-id"); // Like <u-datalist> before 3.0.0, which is cached as programmatic text
					input.dispatchEvent(new InputEvent("input", init));
				});
				await expect(items).toHaveCount(0); // Toggled off, as the event is still a pick
				await expect(input).toHaveValue("oslo-id"); // Reverted to the cached text, which the setter write replaced
			});

			// Driven through window.__root with the keyboard and mouse, as locators can not reach into a closed shadow root
			for (const mode of ["open", "closed"] as const) {
				test(`works inside a ${mode} shadow root`, async ({ page }) => {
					await mount(page, `<div id="host"></div>`);
					await page.evaluate(
						([markup, mode]) => {
							const host = document.getElementById("host") as HTMLElement;
							window.__root = host.attachShadow({ mode });
							window.__root.innerHTML = markup;
						},
						[combobox("data-multiple"), mode] as const,
					);
					// Helpers run in the page, as a closed shadow root is only reachable through the kept reference
					const value = () =>
						page.evaluate(
							() =>
								(window.__root.getElementById("input") as HTMLInputElement)
									.value,
						);
					const items = () =>
						page.evaluate(() =>
							Array.from(window.__root.querySelectorAll("data"), (el) =>
								el.textContent?.trim(),
							),
						);
					const focused = () =>
						page.evaluate(() => window.__root.activeElement?.nodeName);

					await page.evaluate(() =>
						(window.__root.getElementById("input") as HTMLInputElement).focus(),
					);
					await page.keyboard.type("Bergen");
					await page.keyboard.press("Enter");
					await expect.poll(items).toEqual(["Bergen"]);

					// Option pick is intercepted before the datalist value reaches the input
					if (LIST_TAG === "u-datalist") {
						await page.evaluate(() =>
							(
								window.__root.getElementById("input") as HTMLInputElement
							).select(),
						);
						await page.keyboard.type("Ber");
						await expect.poll(value).toBe("Ber");
						await expect
							.poll(() =>
								page.evaluate(
									() => window.__root.getElementById("list")?.hidden,
								),
							)
							.toBe(false);
						const [x, y] = await page.evaluate(() => {
							const option = window.__root.querySelector("u-option") as Element;
							const rect = option.getBoundingClientRect();
							return [rect.x + rect.width / 2, rect.y + rect.height / 2];
						});
						await page.mouse.click(x, y);
						await expect.poll(items).toEqual(["Bergen", "Oslo"]);
						await expect.poll(value).toBe("Ber"); // Typed text is kept, not the option value
					}

					await page.evaluate(() => {
						const input = window.__root.getElementById(
							"input",
						) as HTMLInputElement;
						input.value = "";
						input.selectionStart = input.selectionEnd = 0;
					});
					await page.keyboard.press("ArrowLeft");
					await expect.poll(focused).toBe("DATA"); // Last item is focused
					await page.keyboard.press("Backspace"); // Removes the last item, focus moves to the previous item or the input
					const isList = LIST_TAG === "u-datalist";
					await expect.poll(items).toEqual(isList ? ["Bergen"] : []);
					await expect.poll(focused).toBe(isList ? "DATA" : "INPUT");
				});
			}
		});
	}
});
