import type { Page } from "@playwright/test";
import {
	afterRendered,
	gotoHarness,
	harnessHelpers,
	logged,
	resetLog,
} from "../suite";
import { expect, test } from "../test";
import type { UHTMLTabsElement } from "./u-tabs";
import { type HarnessConfig, PANELS, TABS } from "./u-tabs.harness";

/**
 * Shared test suite for the u-tabs harness pages (see u-tabs.harness.ts), run against vanilla DOM
 * (u-tabs.spec.ts) and each framework (u-tabs.frameworks.spec.ts). Covers what a framework can
 * interfere with: tabs and panels keyed from state, aria-selected bound from state, conditional
 * panels, property writes and click handler ordering. Component logic is covered by u-tabs.spec.ts.
 */

export type SuiteOptions = {
	url?: string; // Harness page, relative to the project baseURL
};

const { render, update } = harnessHelpers<HarnessConfig>();

const attrLabelledby = () =>
	test.info().project.name === "Mobile Chrome"
		? "data-labelledby"
		: "aria-labelledby";

const selectedIndex = (page: Page) =>
	page
		.locator("u-tabs")
		.first()
		.evaluate((el: UHTMLTabsElement) => el.selectedIndex);

export const tabsSuite = ({
	url = "test.html?component=u-tabs",
}: SuiteOptions = {}) => {
	test.describe("harness", () => {
		test.beforeEach(({ page }) => gotoHarness(page, url));

		test("renders tabs and panels from state with roles and associations", async ({
			page,
		}) => {
			await render(page);
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await expect(page.locator("u-tablist")).toHaveRole("tablist");
			await expect(tabs).toHaveCount(3);
			await expect(panels).toHaveCount(3);
			await expect(tabs.nth(0)).toHaveRole("tab");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(0)).toHaveAttribute("tabindex", "0");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
			await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
			await expect(panels.nth(0)).toHaveRole("tabpanel");
			await expect(panels.nth(0)).toBeVisible();
			await expect(panels.nth(1)).toBeHidden();
			await expect(panels.nth(2)).toBeHidden();
			await expect(tabs.nth(0)).toHaveAttribute(
				"aria-controls",
				(await panels.nth(0).getAttribute("id")) || "",
			);
			await expect(panels.nth(0)).toHaveAttribute(
				attrLabelledby(),
				(await tabs.nth(0).getAttribute("id")) || "",
			);
		});

		test("selects on click and keyboard in uncontrolled mode, and dispatches click to the framework", async ({
			page,
		}) => {
			await render(page);
			await resetLog(page, "click");
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await tabs.nth(1).click();
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
			await expect(panels.nth(1)).toBeVisible();
			await expect(panels.nth(0)).toBeHidden();
			expect(await logged(page, "click")).toHaveLength(1); // The framework handler on <u-tab> received the click

			await tabs.nth(1).press("ArrowRight");
			await expect(tabs.nth(2)).toBeFocused();
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "false"); // Focus moves without selecting
			await tabs.nth(2).press("Enter");
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
			await expect(panels.nth(2)).toBeVisible();
			expect(await logged(page, "click")).toHaveLength(2); // Enter is forwarded as a click, which the framework handler also receives
		});

		test("renders aria-selected from state in controlled mode", async ({
			page,
		}) => {
			await render(page, { controlled: true, selected: "b" });
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
			await expect(panels.nth(1)).toBeVisible();
			await expect(panels.nth(0)).toBeHidden();

			await tabs.nth(2).click(); // Handler writes state, the framework renders aria-selected
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
			await expect(panels.nth(2)).toBeVisible();
			await expect(panels.nth(1)).toBeHidden();

			await update(page, { selected: "a" }); // Programmatic state change
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "false");
			await expect(panels.nth(0)).toBeVisible();
			await expect(panels.nth(2)).toBeHidden();
			expect(await selectedIndex(page)).toBe(0);
		});

		test("respects aria-selected=false on every tab from state", async ({
			page,
		}) => {
			await render(page, { controlled: true, selected: null });
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			for (const index of [0, 1, 2]) {
				await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "false"); // Not selected automatically, as every tab specifies aria-selected
				await expect(panels.nth(index)).toBeHidden();
			}
			await expect(tabs.nth(0)).toHaveAttribute("tabindex", "0"); // Reachable by keyboard without being selected
			await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
			await expect(tabs.nth(2)).toHaveAttribute("tabindex", "-1");
			expect(await selectedIndex(page)).toBe(-1);

			await tabs.nth(1).click(); // Handler writes state, the framework renders aria-selected
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0");
			await expect(tabs.nth(0)).toHaveAttribute("tabindex", "-1");
			await expect(panels.nth(1)).toBeVisible();
		});

		test("deselects every tab when state clears the selection", async ({
			page,
		}) => {
			await render(page, { controlled: true, selected: "b" });
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");
			await expect(panels.nth(1)).toBeVisible();

			await update(page, { selected: null }); // Only the selected tab is re-rendered, with aria-selected="false"
			for (const index of [0, 1, 2]) {
				await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "false");
				await expect(panels.nth(index)).toBeHidden();
			}
			await expect(tabs.nth(0)).toHaveAttribute("tabindex", "0"); // The first enabled tab stays reachable by keyboard
			await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
			expect(await selectedIndex(page)).toBe(-1);
		});

		test("selects with Enter and Space through the framework handler in controlled mode", async ({
			page,
		}) => {
			await render(page, { controlled: true, selected: "a" });
			const tabs = page.locator("u-tab");

			await tabs.nth(0).focus();
			await tabs.nth(0).press("ArrowRight");
			await expect(tabs.nth(1)).toBeFocused();
			await tabs.nth(1).press("Enter"); // Forwarded as a click, so the framework handler writes state
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(page.locator("u-tabpanel").nth(1)).toBeVisible();

			await tabs.nth(1).press("ArrowRight");
			await tabs.nth(2).press(" ");
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
		});

		test("writes selectedIndex through the property", async ({
			page,
			framework,
		}) => {
			// React, Vue and Solid write properties once the children exist, while Svelte, Preact and Angular write them on the
			// empty element before rendering the tabs, so the initial index is lost like it would be for a native <select>.
			// Qwik writes unknown props as attributes, so the property is never set
			const initial = ["vanilla", "react", "vue", "solid"].includes(framework)
				? 1
				: 0;
			await render(page, { selectedIndex: 1 });
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await expect(tabs.nth(initial)).toHaveAttribute("aria-selected", "true");
			await expect(panels.nth(initial)).toBeVisible();
			if (framework === "qwik") return;

			await update(page, { selectedIndex: 2 }); // Written to the connected element, so every framework but Qwik selects
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
			await expect(panels.nth(2)).toBeVisible();
		});

		test("renders only the selected panel", async ({ page }) => {
			await render(page, {
				controlled: true,
				selected: "a",
				onlySelectedPanel: true,
				ids: true,
			});
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await expect(panels).toHaveCount(1);
			await expect(panels).toHaveAttribute("id", "panel-a");
			await expect(panels).toBeVisible();
			await expect(panels).toHaveAttribute(attrLabelledby(), "tab-a");
			await expect(tabs.nth(0)).toHaveAttribute("aria-controls", "panel-a");

			await tabs.nth(1).click(); // State changes, the framework replaces the panel
			await expect(panels).toHaveCount(1);
			await expect(panels).toHaveAttribute("id", "panel-b");
			await expect(panels).toBeVisible();
			await expect(panels).toHaveAttribute("aria-hidden", "false");
			await expect(panels).toHaveAttribute(attrLabelledby(), "tab-b");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toHaveAttribute("aria-controls", "panel-b");
			await expect(tabs.nth(0)).toHaveAttribute("aria-controls", "panel-a"); // Explicit ids are kept also for the unmounted panel
		});

		test("associates panels rendered outside u-tabs by id", async ({
			page,
		}) => {
			await render(page, { ids: true, panelsOutside: true });
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await expect(page.locator("u-tabs u-tabpanel")).toHaveCount(0);
			await expect(panels).toHaveCount(3);
			await expect(panels.nth(0)).toBeVisible();
			await expect(panels.nth(1)).toBeHidden();
			await expect(panels.nth(0)).toHaveAttribute(attrLabelledby(), "tab-a");

			await tabs.nth(1).click();
			await expect(panels.nth(1)).toBeVisible();
			await expect(panels.nth(0)).toBeHidden();
			await expect(panels.nth(1)).toHaveAttribute(attrLabelledby(), "tab-b");
		});

		test("follows the keyed tab when tabs are added and reordered", async ({
			page,
		}) => {
			await render(page, { ids: true });
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await tabs.nth(1).click();
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

			await update(page, {
				tabs: [{ key: "d", label: "Tab D" }, ...TABS],
				panels: [{ key: "d", text: "Panel D" }, ...PANELS],
			}); // Prepended, so the selected tab moves to index 2
			await expect(tabs).toHaveCount(4);
			await expect(tabs.nth(2)).toHaveAttribute("id", "tab-b");
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
			await expect(page.locator("#panel-b")).toBeVisible();
			await expect(page.locator("#panel-d")).toBeHidden();
			expect(await selectedIndex(page)).toBe(2);

			await update(page, {
				tabs: [...TABS].reverse(),
				panels: [...PANELS].reverse(),
			}); // Reordered and D removed, b is still the selected tab
			await expect(tabs).toHaveCount(3);
			await expect(tabs.nth(1)).toHaveAttribute("id", "tab-b");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(panels).toHaveCount(3);
			await expect(page.locator("#panel-b")).toBeVisible();
			await expect(page.locator("#panel-c")).toBeHidden();
			await expect(page.locator("#panel-a")).toBeHidden();
		});

		test("selects another tab from state when the selected tab is removed", async ({
			page,
		}) => {
			await render(page, { ids: true, controlled: true, selected: "b" });
			const tabs = page.locator("u-tab");

			await update(page, {
				tabs: TABS.filter((tab) => tab.key !== "b"),
				panels: PANELS.filter((panel) => panel.key !== "b"),
				selected: "c",
			});
			await expect(tabs).toHaveCount(2);
			await expect(tabs.nth(1)).toHaveAttribute("id", "tab-c");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
			await expect(page.locator("#panel-c")).toBeVisible();
			await expect(page.locator("#panel-a")).toBeHidden();
		});

		test("prevents selection from the click handler", async ({
			page,
			framework,
		}) => {
			// The tablist handles click on itself, so a handler attached to the element prevents the selection. React, Solid and
			// Svelte delegate click to their root or document, which in bubble phase runs after the tablist, so they must use capture
			const isDelegated = ["react", "solid", "svelte"].includes(framework);
			await render(page, { preventClick: true });
			const tabs = page.locator("u-tab");

			await tabs.nth(1).click();
			await afterRendered(page);
			await expect(tabs.nth(1)).toHaveAttribute(
				"aria-selected",
				`${isDelegated}`,
			);
			await expect(tabs.nth(0)).toHaveAttribute(
				"aria-selected",
				`${!isDelegated}`,
			);
		});

		test("ignores unchanged attributes rewritten by a re-render", async ({
			page,
		}) => {
			await render(page, { ids: true, controlled: true, selected: "a" });
			const tabs = page.locator("u-tab");
			const panels = page.locator("u-tabpanel");

			await tabs.nth(1).click();
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await update(page, { rewrite: 1 }); // Re-render with the same id, aria-controls and aria-selected values
			await afterRendered(page);
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
			await expect(panels.nth(1)).toBeVisible();
			await expect(panels.nth(0)).toBeHidden();
			await expect(panels.nth(1)).toHaveAttribute(attrLabelledby(), "tab-b");
		});

		test("disables and enables a tab from state", async ({ page }) => {
			await render(page);
			const tabs = page.locator("u-tab");
			const disable = (disabled: boolean) =>
				update(page, {
					tabs: TABS.map((tab) =>
						tab.key === "b" ? { ...tab, disabled } : tab,
					),
				});

			await disable(true);
			await expect(tabs.nth(1)).toHaveAttribute("aria-disabled", "true");
			await tabs.nth(1).click({ force: true });
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");

			await disable(false);
			await expect(tabs.nth(1)).not.toHaveAttribute("aria-disabled", "true");
			await tabs.nth(1).click();
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
		});

		test("renders a nested u-tabs inside a panel", async ({ page }) => {
			await render(page, { nested: true });
			const outer = page.locator("u-tabs").first();
			const nested = page.locator("u-tabs u-tabs");
			const outerTabs = page.locator("u-tabs > u-tablist > u-tab");
			const nestedTabs = nested.locator("u-tab");

			await expect(nested).toHaveCount(1);
			await expect(nestedTabs).toHaveCount(2);
			expect(
				await outer.evaluate((el: UHTMLTabsElement) => [
					el.tabs.length,
					el.panels.length,
				]),
			).toEqual([3, 3]); // Nested tabs and panels are not part of the outer instance
			await expect(nestedTabs.nth(0)).toHaveAttribute("aria-selected", "true");
			await expect(nested.locator("u-tabpanel").nth(0)).toBeVisible();

			await nestedTabs.nth(1).click();
			await expect(nestedTabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(nested.locator("u-tabpanel").nth(1)).toBeVisible();
			await expect(outerTabs.nth(0)).toHaveAttribute("aria-selected", "true"); // Outer selection unchanged

			await outerTabs.nth(1).click();
			await expect(outerTabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(nested).toBeHidden(); // Inside the now hidden first panel
		});

		test("works after unmount and remount", async ({ page }) => {
			await render(page, { controlled: true, selected: "b" });
			const tabs = page.locator("u-tab");

			await update(page, { mounted: false });
			await expect(page.locator("u-tabs")).toHaveCount(0);

			await update(page, { mounted: true });
			await expect(tabs).toHaveCount(3);
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(page.locator("u-tabpanel").nth(1)).toBeVisible();

			await tabs.nth(2).click();
			await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
			await expect(page.locator("u-tabpanel").nth(2)).toBeVisible();
		});

		test("handles multiple u-tabs on same page", async ({ page }) => {
			await render(page, [{ controlled: true, selected: "a" }, { ids: true }]);
			const first = page.locator("u-tabs").nth(0);
			const second = page.locator("u-tabs").nth(1);

			await second.locator("u-tab").nth(2).click();
			await expect(second.locator("u-tab").nth(2)).toHaveAttribute(
				"aria-selected",
				"true",
			);
			await expect(first.locator("u-tab").nth(0)).toHaveAttribute(
				"aria-selected",
				"true",
			); // Other instance untouched

			await update(page, { selected: "b" }, 0);
			await expect(first.locator("u-tab").nth(1)).toHaveAttribute(
				"aria-selected",
				"true",
			);
			await expect(second.locator("u-tab").nth(2)).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});
	});
};
