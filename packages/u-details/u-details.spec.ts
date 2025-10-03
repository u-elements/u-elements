import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("index.html");
	await page.evaluate(() => {
		// Safari test runnner does falsely support hidden="until-found"
		document.body.innerHTML = `
			<style>u-details:not([open])::part(details-content){display:none}</style>
			<u-details><u-summary>Summary 1</u-summary><div>Details 1</div></u-details>
		`;
	});
});

test.describe("u-details", () => {
	test("matches snapshot", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `
        <u-details><u-summary id="summary-1">Summary 1</u-summary>Details 1</u-details>
        <u-details open><u-summary id="summary-2">Summary 2</u-summary>Details 2</u-details>
        <u-details><u-summary id="summary-3">Summary 3</u-summary>Details 3</u-details>`;
		});
		expect(await page.locator("body").innerHTML()).toMatchSnapshot("u-details");
	});

	test("is is defined", async ({ page }) => {
		const instances = await page.evaluate(() => {
			const getElement = (name: string) => document.querySelector(name);
			const getInstance = (name: string) => customElements.get(name) as never;

			return (
				getElement("u-details") instanceof getInstance("u-details") &&
				getElement("u-summary") instanceof getInstance("u-summary")
			);
		});

		expect(instances).toBeTruthy();
		await expect(page.locator("u-details")).toBeAttached();
		await expect(page.locator("u-summary")).toBeAttached();
	});

	test("sets up attributes", async ({ page }) => {
		const uDetails = page.locator("u-details");
		const uSummary = page.locator("u-summary");
		const content = page.locator("div");

		await expect(uDetails).not.toHaveAttribute("open");
		await expect(uSummary).toHaveRole("button");
		await expect(uSummary).toHaveAttribute("tabindex", "0");
		await expect(uSummary).toHaveAttribute("aria-expanded", "false");
		await expect(content).toBeHidden();
	});

	test("moves content to content slot when is prepended", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = "<u-details open></u-details>";
			const uDetails = document.querySelector("u-details");
			uDetails?.insertAdjacentHTML("afterbegin", "<u-summary>Sum</u-summary>");
			uDetails?.insertAdjacentHTML("afterbegin", "<div>Details 1</div>");
		});

		const summaryY = (await page.locator("u-summary").boundingBox())?.y || 0;
		const contentY = (await page.locator("div").boundingBox())?.y || 0;

		expect(summaryY).toBeLessThan(contentY);
	});

	test("handles open property and attributes change", async ({ page }) => {
		const uDetails = page.locator("u-details");
		const uSummary = page.locator("u-summary");
		const content = page.locator("div");

		await uDetails.evaluate((el) => {
			(el as HTMLDetailsElement).open = true;
		});
		await expect(uDetails).toHaveAttribute("open", "");
		await expect(uSummary).toHaveAttribute("aria-expanded", "true");
		await expect(content).toBeVisible();

		await uDetails.evaluate((el) => {
			(el as HTMLDetailsElement).open = false;
		});
		await expect(uDetails).not.toHaveAttribute("open");
		await expect(uSummary).toHaveAttribute("aria-expanded", "false");
		await expect(content).toBeHidden();

		await uDetails.evaluate((el) => el.setAttribute("open", "banana"));
		await expect(uDetails).toHaveJSProperty("open", true);
		await expect(uSummary).toHaveAttribute("aria-expanded", "true");
		await expect(content).toBeVisible();

		await uDetails.evaluate((el) => el.removeAttribute("open"));
		await expect(uDetails).not.toHaveAttribute("open");
		await expect(uSummary).toHaveAttribute("aria-expanded", "false");
		await expect(content).toBeHidden();
	});

	test("updates attributes on click", async ({ page }) => {
		const uDetails = page.locator("u-details");
		const uSummary = page.locator("u-summary");

		await uSummary.click();
		await expect(uDetails).toHaveJSProperty("open", true);
		await expect(uDetails).toHaveAttribute("open", "");
		await expect(uSummary).toHaveAttribute("aria-expanded", "true");

		await uSummary.press(" ");
		await expect(uDetails).toHaveJSProperty("open", false);
		await expect(uDetails).not.toHaveAttribute("open");
		await expect(uSummary).toHaveAttribute("aria-expanded", "false");
	});

	test("sets name property", async ({ page }) => {
		const uDetails = page.locator("u-details");
		await expect(uDetails).not.toHaveAttribute("name");
		await expect(uDetails).toHaveJSProperty("name", "");

		await uDetails.evaluate((el) => el.setAttribute("name", "group-1"));
		await expect(uDetails).toHaveJSProperty("name", "group-1");

		// Using HTMLFormElement since Typescript does not know HTMLDetailsElement has name property yet
		await uDetails.evaluate((el) => {
			(el as HTMLFormElement).name = "group-2";
		});
		await expect(uDetails).toHaveAttribute("name", "group-2");
	});

	test("closes other uDetails with same name attribute", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `
        <u-details name="group-1"><u-summary>Summary 1</u-summary>Details 1</u-details>
        <u-details name="group-1"><u-summary>Summary 2</u-summary>Details 2</u-details>`;
		});
		const uDetails = page.locator("u-details");
		const uSummary = page.locator("u-summary");

		await uSummary.nth(0).click();
		await expect(uDetails.nth(0)).toHaveJSProperty("open", true);
		await expect(uDetails.nth(1)).toHaveJSProperty("open", false);

		await uSummary.nth(1).click();
		await expect(uDetails.nth(0)).toHaveJSProperty("open", false);
		await expect(uDetails.nth(1)).toHaveJSProperty("open", true);
	});

	test("triggers toggle event", async ({ page }) => {
		const uDetails = page.locator("u-details");
		const uSummary = page.locator("u-summary");

		await uDetails.evaluate((el) =>
			el.addEventListener("toggle", (event) => {
				const details = event.currentTarget as HTMLElement;
				details.id = "clicked";
			}),
		);

		await uSummary.click();
		await expect(uDetails).toHaveAttribute("id", "clicked");
	});

	test("skips toggle event if changing open string", async ({ page }) => {
		const uDetails = page.locator("u-details");

		await uDetails.evaluate((el) =>
			el.addEventListener("toggle", (event) => {
				const details = event.currentTarget as HTMLElement;
				details.id = `${Number(details.id || 0) + 1}`;
			}),
		);

		expect(uDetails).not.toHaveAttribute("id");

		await uDetails.evaluate((el) => {
			(el as HTMLDetailsElement).open = true;
		});
		await expect(uDetails).toHaveJSProperty("open", true);
		await expect(uDetails).toHaveAttribute("id", "1");

		await uDetails.evaluate((el) => el.setAttribute("open", "banana"));
		await expect(uDetails).toHaveJSProperty("open", true);
		await expect(uDetails).toHaveAttribute("id", "1");
	});

	test("opens on beforematch", async ({ page }) => {
		const uDetails = page.locator("u-details");
		const content = page.locator("div");

		await expect(uDetails).toHaveJSProperty("open", false);
		await content.dispatchEvent("beforematch", { bubbles: true });
		await expect(uDetails).toHaveJSProperty("open", true);
	});
});
