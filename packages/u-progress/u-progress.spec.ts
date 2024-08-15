import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("index.html");
	await page.evaluate(() => {
		document.body.innerHTML = `<u-progress value="5" max="10" aria-label="My progress"></u-progress>`;
	});
});

test.describe("u-progress", () => {
	test("matches snapshot", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-progress id="my-progress" value="5" max="10" aria-label="My progress"></u-progress>`;
		});
		expect(await page.locator("body").innerHTML()).toMatchSnapshot(
			"u-progress",
		);
	});

	test("is is defined", async ({ page }) => {
		const uProgress = page.locator("u-progress");
		const instance = await uProgress.evaluate(
			(el) => el instanceof (customElements.get("u-progress") as never),
		);

		expect(instance).toBeTruthy();
		await expect(uProgress).toBeAttached();
		await expect(uProgress).toHaveJSProperty("max", 10);
	});

	test("sets up attributes", async ({ page }) => {
		const browser = test.info().project.name;
		const asImage = browser === "Mobile Safari" || browser === "Firefox";
		const uProgress = page.locator("u-progress");

		await expect(uProgress).toHaveAttribute("aria-valuemin", "0");
		await expect(uProgress).toHaveAttribute("aria-valuemax", "100");
		await expect(uProgress).toHaveAttribute("aria-busy", "false");
		await expect(uProgress).toHaveRole(asImage ? "img" : "progressbar");
		await expect(uProgress).toHaveAttribute(
			asImage ? "aria-label" : "aria-valuenow",
			asImage ? /My progress\s+50%/ : "50",
		);
		await expect(uProgress).toHaveAccessibleName(
			asImage ? /My progress\s+50%/ : "My progress",
		);

		await uProgress.evaluate<void, HTMLProgressElement>((el) =>
			el.removeAttribute("value"),
		);
		await expect(uProgress).toHaveAttribute("aria-busy", "true");
	});

	test("sets up properties", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<label for="my-progress">Label 1</label>
      <label>Label 2<u-progress id="my-progress" value="5" max="10"></u-progress><label>
      <label>Label 3</label>`;
		});

		const uProgress = page.locator("u-progress");
		const labels = await uProgress.evaluate<number, HTMLProgressElement>(
			(el) => el.labels.length,
		);

		await expect(uProgress).toHaveJSProperty("position", 0.5);
		await expect(uProgress).toHaveJSProperty("value", 5);
		await expect(uProgress).toHaveJSProperty("max", 10);
		expect(labels).toBe(2);
	});

	test("calculates position and percentage", async ({ page }) => {
		const uProgress = page.locator("u-progress");

		await expect(uProgress).toHaveJSProperty("position", 0.5);
		await expect(uProgress).toHaveJSProperty("value", 5);
		await expect(uProgress).toHaveJSProperty("max", 10);

		await uProgress.evaluate<void, HTMLProgressElement>((el) => {
			el.max = 20;
		});

		await expect(uProgress).toHaveJSProperty("position", 0.25);
		await expect(uProgress).toHaveJSProperty("value", 5);
		await expect(uProgress).toHaveJSProperty("max", 20);

		await uProgress.evaluate<void, HTMLProgressElement>((el) => {
			el.value = 10;
		});

		await expect(uProgress).toHaveJSProperty("position", 0.5);
		await expect(uProgress).toHaveJSProperty("value", 10);
		await expect(uProgress).toHaveJSProperty("max", 20);
	});

	test("handles invalid numeric value and max", async ({ page }) => {
		const uProgress = page.locator("u-progress");

		expect(
			uProgress.evaluate<boolean, HTMLProgressElement>((el) => {
				try {
					// @ts-expect-error Because we are testing
					el.max = "banana";
				} catch {
					return true;
				}
				return false;
			}),
		).toBeTruthy();
		await expect(uProgress).toHaveJSProperty("max", 10);

		await uProgress.evaluate<void, HTMLProgressElement>((el) => {
			// @ts-expect-error Because we are testing
			el.value = el.max = null;
		});

		await expect(uProgress).toHaveJSProperty("value", null);
		await expect(uProgress).toHaveJSProperty("max", 1);
	});
});
