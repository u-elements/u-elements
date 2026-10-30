import type { Page } from "@playwright/test";
import { countCalls } from "../suite";
import { expect, test } from "../test";
import { progressSuite } from "./u-progress.suite";

// Runs the shared suite (u-progress.suite.ts) against the vanilla DOM harness page (frameworks/vanilla/test.html?component=u-progress).
// The tests below need raw DOM access and have no equivalent in the harness
progressSuite({ url: "frameworks/vanilla/test.html?component=u-progress" });

const mount = async (page: Page, html: string) => {
	await page.evaluate((markup) => {
		document.body.innerHTML = markup;
	}, html);
};

test.describe("UHTMLProgressElement", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("test.html");
	});

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

	test("uses native defaults when attributes are missing", async ({ page }) => {
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

		await progress.evaluate((node) => {
			const el = node as HTMLProgressElement;
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

	test("clamps value and max to valid values", async ({ page }) => {
		await mount(page, `<u-progress value="-30" max=".5"></u-progress>`);

		const progress = page.locator("u-progress");

		await expect(progress).toHaveJSProperty("value", 0);
		await expect(progress).toHaveJSProperty("max", 1);
		await expect(progress).toHaveJSProperty("position", 0);
		await expect(progress).toHaveAttribute("aria-valuenow", "0");
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
			progress.evaluate((node) => {
				const el = node as HTMLProgressElement;
				// @ts-expect-error testing native coercion
				el.value = "banana";
			}),
		).rejects.toThrow(/non-finite/i);

		await expect(
			progress.evaluate((node) => {
				const el = node as HTMLProgressElement;
				// @ts-expect-error testing native coercion
				el.max = "banana";
			}),
		).rejects.toThrow(/non-finite/i);

		await expect(progress).toHaveJSProperty("value", 5);
		await expect(progress).toHaveJSProperty("max", 10);
		await expect(progress).toHaveAttribute("aria-valuenow", "50");
	});

	test("removes value and max when set to null or undefined", async ({
		page,
	}) => {
		await mount(page, `<u-progress value="5" max="10"></u-progress>`);
		const progress = page.locator("u-progress");

		await progress.evaluate((node) => {
			const el = node as HTMLProgressElement;
			el.value = null as never; // Frameworks write null and undefined through the property, i.e. value={undefined} for indeterminate
		});
		await expect(progress).not.toHaveAttribute("value");
		await expect(progress).toHaveJSProperty("position", -1);
		await expect(progress).toHaveAttribute("aria-busy", "true");
		await expect(progress).not.toHaveAttribute("aria-valuenow");

		await progress.evaluate((node) => {
			const el = node as HTMLProgressElement;
			el.max = undefined as never;
		});
		await expect(progress).not.toHaveAttribute("max");
		await expect(progress).toHaveJSProperty("max", 1);
	});

	test("settles after mount and after a change instead of re-syncing itself", async ({
		page,
	}) => {
		// The element re-syncs once after frameworks have rendered (see afterRender in attributeChangedCallback).
		// That re-sync must not schedule itself again, which would keep every connected element busy forever
		const calls = await countCalls(
			page,
			"u-progress",
			"attributeChangedCallback",
		);
		await mount(
			page,
			`<label for="p">Loading</label><u-progress id="p" value="5" max="10"></u-progress>`,
		);
		await page.waitForTimeout(100); // Past the scheduled re-sync
		const mounted = await calls();
		expect(mounted).toBeLessThan(20); // Upgrade, connect, the attributes the element writes itself and one re-sync
		await page.waitForTimeout(200);
		expect(await calls()).toBe(mounted); // Nothing scheduled itself again

		await page.locator("u-progress").evaluate((node) => {
			(node as HTMLProgressElement).value = 7;
		});
		await page.waitForTimeout(100);
		const changed = await calls();
		expect(changed - mounted).toBeLessThan(10);
		await page.waitForTimeout(200);
		expect(await calls()).toBe(changed);
	});

	test("coerces numeric strings", async ({ page }) => {
		await mount(page, `<u-progress></u-progress>`);

		const progress = page.locator("u-progress");

		await progress.evaluate((node) => {
			const el = node as HTMLProgressElement;
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
		const labelsCount = await progress.evaluate(
			(el) => (el as HTMLProgressElement).labels.length,
		);

		expect(labelsCount).toBe(3);
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

	test("joins the text of every <label>", async ({ page }) => {
		await mount(
			page,
			`<label for="p">Label 1</label>
			<label for="p">Label 2</label>
			<u-progress id="p" value="5" max="10"></u-progress>`,
		);
		const isIOS = test.info().project.name === "Mobile Safari";
		await expect(page.locator("u-progress")).toHaveAccessibleName(
			isIOS ? "Label 1 Label 2 (50%)" : "Label 1 Label 2",
		);
	});

	test("prefers aria-labelledby over aria-label over <label>", async ({
		page,
	}) => {
		const progress = page.locator("u-progress");
		const isIOS = test.info().project.name === "Mobile Safari";
		const cases = [
			['aria-label="Aria" aria-labelledby="heading"', "Heading"],
			['aria-label="Aria"', "Aria"],
			["", "Label"],
		];

		for (const [attrs, name] of cases) {
			await mount(
				page,
				`<h2 id="heading">Heading</h2>
				<label for="p">Label</label>
				<u-progress id="p" value="5" max="10" ${attrs}></u-progress>`,
			); // Separate mounts, so each case is read from markup
			await expect(progress).toHaveAccessibleName(
				isIOS ? `${name} (50%)` : name,
			);
		}
	});

	test("falls back when aria-labelledby is removed or changed", async ({
		page,
	}) => {
		await mount(
			page,
			`<h2 id="heading">Heading</h2>
			<h3 id="other">Other</h3>
			<label for="p">Label</label>
			<u-progress id="p" value="5" max="10" aria-label="Aria" aria-labelledby="heading"></u-progress>`,
		);
		const progress = page.locator("u-progress");
		const isIOS = test.info().project.name === "Mobile Safari";
		const name = (text: string) => (isIOS ? `${text} (50%)` : text);

		await expect(progress).toHaveAccessibleName(name("Heading"));
		await expect(progress).toHaveAttribute("aria-labelledby", "p"); // Self-reference, so the name comes from aria-label
		await progress.evaluate((el) =>
			el.setAttribute("aria-labelledby", "other"),
		);
		await expect(progress).toHaveAccessibleName(name("Other"));
		await progress.evaluate((el) => el.removeAttribute("aria-labelledby")); // The referenced elements stay, so only the removal can change the name
		await expect(progress).toHaveAccessibleName(name("Aria"));
		await expect(progress).not.toHaveAttribute("aria-labelledby");
		await progress.evaluate((el) => el.removeAttribute("aria-label"));
		await expect(progress).toHaveAccessibleName(name("Label"));
	});

	test("keeps the self-reference when the id changes", async ({ page }) => {
		await mount(
			page,
			`<h2 id="heading">Heading</h2>
			<u-progress id="p" value="5" max="10" aria-labelledby="heading"></u-progress>`,
		);
		const progress = page.locator("u-progress");

		await progress.evaluate((el) => {
			el.id = "renamed";
		});
		await expect(progress).toHaveAttribute("aria-labelledby", "renamed");
		await expect(progress).toHaveAccessibleName(/^Heading/);
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
		await progress.evaluate((node) => {
			const el = node as HTMLProgressElement;
			el.max = 20;
		});

		await expect(progress).toHaveJSProperty("position", 0.25);
		await expect(progress).toHaveAttribute("aria-valuenow", "25");
	});
});
