import { gotoHarness, harnessHelpers } from "../suite";
import { expect, test } from "../test";
import type { HarnessConfig, LabelMode } from "./u-progress.harness";

/**
 * Shared test suite for the u-progress harness pages (see u-progress.harness.ts), run against vanilla
 * DOM (u-progress.spec.ts) and each framework (u-progress.frameworks.spec.ts). Covers what a framework
 * can interfere with: value and max written as properties, null for indeterminate, and labels rendered
 * in the ways frameworks render them. Component logic is covered by u-progress.spec.ts.
 */

export type SuiteOptions = {
	url?: string; // Harness page, relative to the project baseURL
};

const { render, update } = harnessHelpers<HarnessConfig>();

export const progressSuite = ({
	url = "test.html?component=u-progress",
}: SuiteOptions = {}) => {
	test.describe("harness", () => {
		test.beforeEach(({ page }) => gotoHarness(page, url));

		test("reflects value and max bound as numbers and strings", async ({
			page,
		}) => {
			await render(page, { value: 5, max: 10 });
			const progress = page.locator("u-progress");

			await expect(progress).toHaveJSProperty("value", 5);
			await expect(progress).toHaveJSProperty("max", 10);
			await expect(progress).toHaveJSProperty("position", 0.5);
			await expect(progress).toHaveAttribute("value", "5");
			await expect(progress).toHaveAttribute("max", "10");
			await expect(progress).toHaveAttribute("aria-valuenow", "50");
			await expect(progress).toHaveAttribute("aria-busy", "false");
			await expect(progress).toHaveAttribute("style", /--percentage:\s*50%/);

			await update(page, { value: "7.5" }); // Strings are coerced like the native element does
			await expect(progress).toHaveJSProperty("value", 7.5);
			await expect(progress).toHaveAttribute("aria-valuenow", "75");

			await update(page, { max: "20" });
			await expect(progress).toHaveJSProperty("max", 20);
			await expect(progress).toHaveJSProperty("position", 0.375);
			await expect(progress).toHaveAttribute("aria-valuenow", "38");
		});

		test("updates as the value changes from state", async ({ page }) => {
			await render(page, { value: 0, max: 4 });
			const progress = page.locator("u-progress");

			for (const value of [1, 2, 3, 4]) {
				await update(page, { value });
				await expect(progress).toHaveAttribute(
					"aria-valuenow",
					`${value * 25}`,
				);
				await expect(progress).toHaveAttribute(
					"style",
					new RegExp(`--percentage:\\s*${value * 25}%`),
				);
			}
			await expect(progress).toHaveJSProperty("position", 1);
		});

		test("is indeterminate when value is null, from mount and from an update", async ({
			page,
			framework,
		}) => {
			const indeterminate = async () => {
				const progress = page.locator("u-progress");
				await expect(progress).not.toHaveAttribute("value");
				await expect(progress).toHaveJSProperty("position", -1);
				await expect(progress).toHaveAttribute("aria-busy", "true");
				await expect(progress).not.toHaveAttribute("aria-valuenow");
			};

			await render(page, { value: null });
			await indeterminate();

			await update(page, { value: 3 });
			await expect(page.locator("u-progress")).toHaveAttribute(
				"aria-valuenow",
				"30",
			);
			await expect(page.locator("u-progress")).toHaveAttribute(
				"aria-busy",
				"false",
			);

			await update(page, { value: null });
			if (framework === "preact") {
				// Preact only special cases null for a native <progress>, and never writes a null value prop to other elements,
				// so a Preact consumer removes the attribute through a ref to go back to indeterminate
				await expect(page.locator("u-progress")).toHaveAttribute("value", "3");
				return;
			}
			await indeterminate();
		});

		test("is labelled through every label pattern", async ({ page }) => {
			await render(page, { label: "for" });
			const progress = page.locator("u-progress");
			const isIOS = test.info().project.name === "Mobile Safari";
			const name = (text: string) => (isIOS ? `${text} (50%)` : text);

			await expect(progress).toHaveAccessibleName(name("Loading"));
			expect(
				await progress.evaluate((el: HTMLProgressElement) => el.labels.length),
			).toBe(1);

			for (const label of ["wrap", "aria-label", "aria-labelledby"] as const) {
				await update(page, { label, text: `Label ${label}` }); // The label element is replaced, so the name is read from the new one
				await expect(progress).toHaveAccessibleName(name(`Label ${label}`));
				await expect(progress).toHaveAttribute("aria-label", /^Label/);
				await expect(progress).not.toHaveAttribute("aria-labelledby"); // Resolved to aria-label, as iOS needs the percentage in the name
			}

			await update(page, { label: "aria-label", text: "Changed" }); // Only the attribute changes
			await expect(progress).toHaveAccessibleName(name("Changed"));
		});

		test("recomputes the label when the value changes", async ({ page }) => {
			await render(page, { label: "aria-label", value: 2, max: 10 });
			const progress = page.locator("u-progress");
			const isIOS = test.info().project.name === "Mobile Safari";

			await expect(progress).toHaveAccessibleName(
				isIOS ? "Loading (20%)" : "Loading",
			);
			await update(page, { value: 9 });
			await expect(progress).toHaveAccessibleName(
				isIOS ? "Loading (90%)" : "Loading",
			);
			await expect(progress).toHaveAttribute("aria-valuenow", "90");
		});

		test("hides and shows from state", async ({ page }) => {
			await render(page);
			const progress = page.locator("u-progress");

			await expect(progress).toBeVisible();
			await update(page, { hidden: true });
			await expect(progress).toBeHidden();
			await update(page, { hidden: false });
			await expect(progress).toBeVisible();
		});

		test("works after unmount and remount", async ({ page }) => {
			await render(page, { value: 3, max: 4 });
			const progress = page.locator("u-progress");

			await update(page, { mounted: false });
			await expect(progress).toHaveCount(0);
			await update(page, { mounted: true });
			await expect(progress).toHaveAttribute("aria-valuenow", "75");
			await expect(progress).toHaveAttribute("role", /progressbar|img/);
			await update(page, { value: 4 });
			await expect(progress).toHaveAttribute("aria-valuenow", "100");
		});

		test("handles multiple u-progress on same page", async ({ page }) => {
			await render(page, [
				{ value: 1, max: 4 },
				{ id: "second", value: 3, max: 4, label: "aria-label", text: "Other" },
			]);
			const first = page.locator("#progress");
			const second = page.locator("#second");

			await expect(first).toHaveAttribute("aria-valuenow", "25");
			await expect(second).toHaveAttribute("aria-valuenow", "75");
			await update(page, { value: 2 }, 1);
			await expect(second).toHaveAttribute("aria-valuenow", "50");
			await expect(first).toHaveAttribute("aria-valuenow", "25");
		});

		test("keeps the id used by the label when written from state", async ({
			page,
		}) => {
			await render(page, { id: "custom", label: "for" });
			const progress = page.locator("u-progress");
			await expect(progress).toHaveAttribute("id", "custom");
			expect(
				await progress.evaluate((el: HTMLProgressElement) =>
					Array.from(el.labels, (label) => label.textContent?.trim()),
				),
			).toEqual(["Loading"]);
		});
	});
};

export type { LabelMode };
