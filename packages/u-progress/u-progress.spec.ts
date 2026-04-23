import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("test.html");
});

const mount = async (page: import("@playwright/test").Page, html: string) => {
	await page.evaluate((markup) => {
		document.body.innerHTML = markup;
	}, html);
};

test.describe
	.only("UHTMLProgressElement", () => {
		test("matches snapshot", async ({ page }) => {
			await mount(
				page,
				`<u-progress id="my-progress" value="5" max="10" aria-label="My progress"></u-progress>`,
			);
			expect(await page.locator("body").innerHTML()).toMatchSnapshot(
				"u-progress",
			);
		});
		test("exposes the expected interface", async ({ page }) => {
			await mount(page, `<u-progress value="5" max="10"></u-progress>`);

			const progress = page.locator("u-progress");
			const instance = await progress.evaluate((el) => {
				const instance = customElements.get("u-progress");
				return el instanceof (instance as CustomElementConstructor);
			});

			expect(instance).toBeTruthy();
			await expect(progress).toHaveJSProperty("value", 5);
			await expect(progress).toHaveJSProperty("max", 10);
			await expect(progress).toHaveJSProperty("position", 0.5);
			await expect(progress).toHaveAttribute("aria-valuenow", "50");
		});

		test("uses native defaults when attributes are missing", async ({
			page,
		}) => {
			await mount(page, `<u-progress></u-progress>`);

			const progress = page.locator("u-progress");

			await expect(progress).toHaveJSProperty("value", 0);
			await expect(progress).toHaveJSProperty("max", 1);
			await expect(progress).toHaveJSProperty("position", -1);
			await expect(progress).not.toHaveAttribute("aria-valuenow");
		});

		test("reflects value and max changes", async ({ page }) => {
			await mount(page, `<u-progress value="5" max="10"></u-progress>`);

			const progress = page.locator("u-progress");

			await expect(progress).toHaveJSProperty("value", 5);
			await expect(progress).toHaveJSProperty("max", 10);
			await expect(progress).toHaveJSProperty("position", 0.5);
			await expect(progress).toHaveAttribute("value", "5");
			await expect(progress).toHaveAttribute("max", "10");
			await expect(progress).toHaveAttribute("aria-valuemin", "0");
			await expect(progress).toHaveAttribute("aria-valuemax", "100");
			await expect(progress).toHaveAttribute("aria-busy", "false");
			await expect(progress).toHaveAttribute("aria-valuenow", "50");

			await progress.evaluate<void, HTMLProgressElement>((el) => {
				el.max = 20;
				el.value = 30;
			});

			await expect(progress).toHaveJSProperty("max", 20);
			await expect(progress).toHaveJSProperty("value", 20);
			await expect(progress).toHaveJSProperty("position", 1);
			await expect(progress).toHaveAttribute("aria-valuenow", "100");
		});

		test("falls back to indeterminate when value is removed", async ({
			page,
		}) => {
			await mount(page, `<u-progress value="5" max="10"></u-progress>`);

			const progress = page.locator("u-progress");

			await progress.evaluate<void, HTMLProgressElement>((el) =>
				el.removeAttribute("value"),
			);

			await expect(progress).toHaveJSProperty("value", 0);
			await expect(progress).toHaveJSProperty("position", -1);
			await expect(progress).toHaveAttribute("aria-busy", "true");
			await expect(progress).not.toHaveAttribute("value");
			await expect(progress).not.toHaveAttribute("aria-valuenow");
		});

		test("clamps position when value exceeds max", async ({ page }) => {
			await mount(page, `<u-progress value="30" max="20"></u-progress>`);

			const progress = page.locator("u-progress");

			await expect(progress).toHaveJSProperty("value", 20);
			await expect(progress).toHaveJSProperty("max", 20);
			await expect(progress).toHaveJSProperty("position", 1);
			await expect(progress).toHaveAttribute("aria-valuenow", "100");
		});

		test("rejects invalid value and max assignments", async ({ page }) => {
			await mount(page, `<u-progress value="5" max="10"></u-progress>`);

			const progress = page.locator("u-progress");

			await expect(
				progress.evaluate<void, HTMLProgressElement>((el) => {
					// @ts-expect-error testing native coercion
					el.value = "banana";
				}),
			).rejects.toThrow(/non-finite/i);

			await expect(
				progress.evaluate<void, HTMLProgressElement>((el) => {
					// @ts-expect-error testing native coercion
					el.max = "banana";
				}),
			).rejects.toThrow(/non-finite/i);

			await expect(progress).toHaveJSProperty("value", 5);
			await expect(progress).toHaveJSProperty("max", 10);
			await expect(progress).toHaveAttribute("aria-valuenow", "50");
		});

		test("coerces numeric strings", async ({ page }) => {
			await mount(page, `<u-progress></u-progress>`);

			const progress = page.locator("u-progress");

			await progress.evaluate<void, HTMLProgressElement>((el) => {
				el.value = "5" as never;
				el.max = "10" as never;
			});

			await expect(progress).toHaveJSProperty("value", 5);
			await expect(progress).toHaveJSProperty("max", 10);
			await expect(progress).toHaveJSProperty("position", 0.5);
			await expect(progress).toHaveAttribute("aria-valuenow", "50");
		});

		test("exposes associated labels", async ({ page }) => {
			await mount(
				page,
				`<label for="p">Label 1</label>
			<label>Label 2 <u-progress id="p" value="5" max="10"></u-progress></label>
			<label id="late-label" for="p">Label 3</label>`,
			);

			const progress = page.locator("u-progress");

			await expect(progress).toHaveJSProperty("labels.length", 3);
		});

		test("has the expected accessible role and name", async ({ page }) => {
			await mount(
				page,
				`<label for="p">Label 1</label><u-progress id="p" value="5" max="10"></u-progress>`,
			);

			const progress = page.locator("u-progress");
			const browser = test.info().project.name;
			const isIOS = browser === "Mobile Safari";

			await expect(progress).toHaveRole(isIOS ? "img" : "progressbar");
			await expect(progress).toHaveAccessibleName(
				isIOS ? "Label 1 (50%)" : "Label 1",
			);
		});

		test("normalizes invalid max to the default", async ({ page }) => {
			await mount(page, `<u-progress max="0"></u-progress>`);

			const progress = page.locator("u-progress");

			await expect(progress).toHaveJSProperty("max", 1);
			await expect(progress).toHaveJSProperty("position", -1);
			await expect(progress).toHaveAttribute("aria-busy", "true");
			await expect(progress).not.toHaveAttribute("aria-valuenow");
			await expect(progress).toHaveAttribute("style", /--percentage:\s*0%/);
		});

		test("updates computed position when max changes after value is set", async ({
			page,
		}) => {
			await mount(page, `<u-progress value="5" max="10"></u-progress>`);

			const progress = page.locator("u-progress");
			await progress.evaluate<void, HTMLProgressElement>((el) => {
				el.max = 20;
			});

			await expect(progress).toHaveJSProperty("position", 0.25);
			await expect(progress).toHaveAttribute("aria-valuenow", "25");
		});
	});
