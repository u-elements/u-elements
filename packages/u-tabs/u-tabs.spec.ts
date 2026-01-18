import { expect, test } from "@playwright/test";
import type { UHTMLTabElement, UHTMLTabsElement } from "./u-tabs";

const attrLabelledby = () => {
	const IS_ANDROID = test.info().project.name === "Mobile Chrome";
	return IS_ANDROID ? "data-labelledby" : "aria-labelledby";
};

test.beforeEach(async ({ page }) => {
	await page.goto("index.html");
	await page.evaluate(() => {
		document.body.innerHTML = `<u-tabs>
      <u-tablist>
        <u-tab>Tab 1</u-tab>
        <u-tab>Tab 2</u-tab>
      </u-tablist>
      <u-tabpanel>Panel 1</u-tabpanel>
      <u-tabpanel>Panel 2</u-tabpanel>
    </u-tabs>`;
	});
});

test.describe("u-tabs", () => {
	test("matches snapshot", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab id="tab-2">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>`;
		});
		expect(await page.locator("body").innerHTML()).toMatchSnapshot("u-tabs");
	});

	test("is is defined", async ({ page }) => {
		const instances = await page.evaluate(() => {
			const getElement = (name: string) => document.querySelector(name);
			const getInstance = (name: string) => customElements.get(name) as never;

			return (
				getElement("u-tabs") instanceof getInstance("u-tabs") &&
				getElement("u-tablist") instanceof getInstance("u-tablist") &&
				getElement("u-tab") instanceof getInstance("u-tab") &&
				getElement("u-tabpanel") instanceof getInstance("u-tabpanel")
			);
		});

		expect(instances).toBeTruthy();
		await expect(page.locator("u-tabs")).toBeAttached();
		await expect(page.locator("u-tablist")).toBeAttached();
		await expect(page.locator("u-tab")).toHaveCount(2);
		await expect(page.locator("u-tabpanel")).toHaveCount(2);
	});

	test("sets up attributes", async ({ page }) => {
		const uTabs = page.locator("u-tabs");
		const uTablist = page.locator("u-tablist");
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTablist).toHaveRole("tablist");
		await expect(uTab0).toHaveRole("tab");
		await expect(uTab1).toHaveRole("tab");
		await expect(uTab0).toHaveAttribute("tabindex", "0");
		await expect(uTab1).toHaveAttribute("tabindex", "-1");
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveAttribute("aria-selected", "false");
		await expect(uTabpanel0).toHaveRole("tabpanel");
		await expect(uTabpanel1).toHaveRole("tabpanel");
		await expect(uTabpanel0).toHaveJSProperty("hidden", false);
		await expect(uTabpanel1).toHaveAttribute("hidden", "");
		await expect(uTab0).toHaveAttribute(
			"aria-controls",
			(await uTabpanel0.getAttribute("id")) || "",
		);
		await expect(uTabpanel0).toHaveAttribute(
			attrLabelledby(),
			(await uTab0.getAttribute("id")) || "",
		);

		await uTabs.evaluate<void, UHTMLTabsElement>((el) => {
			el.selectedIndex = 1;
		});

		await expect(uTab0).toHaveAttribute("tabindex", "-1");
		await expect(uTab1).toHaveAttribute("tabindex", "0");
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
		await expect(uTabpanel0).toHaveAttribute("hidden", "");
		await expect(uTabpanel1).toHaveJSProperty("hidden", false);
		await expect(uTab1).toHaveAttribute(
			"aria-controls",
			(await uTabpanel1.getAttribute("id")) || "",
		);
		await expect(uTabpanel1).toHaveAttribute(
			attrLabelledby(),
			(await uTab1.getAttribute("id")) || "",
		);
	});

	test("sets up properties", async ({ page }) => {
		const checks = await page.evaluate(() => {
			const uTabs = document.querySelector("u-tabs");
			return {
				panelsLength: uTabs?.panels.length,
				panelsNodeList: uTabs?.panels instanceof NodeList,
				selectedIndex: uTabs?.selectedIndex,
				tabList: uTabs?.tabList === document.querySelector("u-tablist"),
				tabsLength: uTabs?.tabs.length,
				tabsNodeList: uTabs?.tabs instanceof NodeList,
			};
		});
		expect(checks).toMatchObject({
			panelsLength: 2,
			panelsNodeList: true,
			selectedIndex: 0,
			tabList: true,
			tabsLength: 2,
			tabsNodeList: true,
		});

		expect(
			await page.evaluate(() => {
				const uTablist = document.querySelector("u-tablist");
				return uTablist?.tabsElement === document.querySelector("u-tabs");
			}),
		).toBeTruthy();

		expect(
			await page.evaluate(() => {
				const uTab = document.querySelector("u-tab");
				return (
					uTab?.tabsElement === document.querySelector("u-tabs") &&
					uTab?.tabList === document.querySelector("u-tablist") &&
					uTab?.panel === document.querySelector("u-tabpanel") &&
					uTab?.selected &&
					uTab?.index === 0
				);
			}),
		).toBeTruthy();

		expect(
			await page.evaluate(() => {
				const uPanel = document.querySelector("u-tabpanel");
				return (
					uPanel?.tabsElement === document.querySelector("u-tabs") &&
					uPanel?.tabs[0] === document.querySelector("u-tab") &&
					uPanel?.tabs instanceof NodeList
				);
			}),
		).toBeTruthy();

		expect(
			await page.evaluate(() => {
				document.body.innerHTML = "<u-tabpanel></u-tabpanel>";
				return document.querySelector("u-tabpanel")?.tabs.length;
			}),
		).toBe(0);
	});

	test("updates attributes on selected prop change", async ({ page }) => {
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel0).toHaveJSProperty("hidden", false);
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel1).toHaveJSProperty("hidden", true);
		await expect(uTab1).toHaveAttribute("aria-selected", "false");

		await uTab1.evaluate<void, UHTMLTabElement>((el) => {
			el.selected = true;
		});

		await expect(uTab0).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel0).toHaveJSProperty("hidden", true);
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel1).toHaveJSProperty("hidden", false);
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
	});

	test("updates attributes on selectedIndex prop change", async ({ page }) => {
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel0).toHaveJSProperty("hidden", false);
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel1).toHaveJSProperty("hidden", true);
		await expect(uTab1).toHaveAttribute("aria-selected", "false");

		await page.evaluate(() => {
			const uTabs = document.querySelector("u-tabs");
			if (uTabs) uTabs.selectedIndex = 1;
		});

		await expect(uTab0).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel0).toHaveJSProperty("hidden", true);
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel1).toHaveJSProperty("hidden", false);
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
	});

	test("skips invalid selectedIndex prop change", async ({ page }) => {
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel0).toHaveJSProperty("hidden", false);
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel1).toHaveJSProperty("hidden", true);
		await expect(uTab1).toHaveAttribute("aria-selected", "false");

		await page.evaluate(() => {
			const uTabs = document.querySelector("u-tabs");
			if (uTabs) uTabs.selectedIndex = 999;
		});

		await expect(uTab0).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel0).toHaveJSProperty("hidden", false);
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel1).toHaveJSProperty("hidden", true);
		await expect(uTab1).toHaveAttribute("aria-selected", "false");
	});

	test("updates attributes on aria-selected change", async ({ page }) => {
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel0).toHaveJSProperty("hidden", false);
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel1).toHaveJSProperty("hidden", true);
		await expect(uTab1).toHaveAttribute("aria-selected", "false");

		await uTab1.evaluate((el) => el.setAttribute("aria-selected", "true"));

		await expect(uTab0).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel0).toHaveJSProperty("hidden", true);
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel1).toHaveJSProperty("hidden", false);
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
	});

	test("updates attributes on click", async ({ page }) => {
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel0).toHaveJSProperty("hidden", false);
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel1).toHaveJSProperty("hidden", true);
		await expect(uTab1).toHaveAttribute("aria-selected", "false");

		await uTab1.click();

		await expect(uTab0).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel0).toHaveJSProperty("hidden", true);
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel1).toHaveJSProperty("hidden", false);
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
	});

	test("respects aria-selected attribute", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab aria-selected="true">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>`;
		});
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel0).toHaveJSProperty("hidden", true);
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel1).toHaveJSProperty("hidden", false);
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
	});

	test("respects only last aria-selected attribute", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab aria-selected="true">Tab 1</u-tab>
          <u-tab aria-selected="true">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>`;
		});
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveJSProperty("tabIndex", -1);
		await expect(uTabpanel0).toHaveJSProperty("hidden", true);
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveJSProperty("tabIndex", 0);
		await expect(uTabpanel1).toHaveJSProperty("hidden", false);
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
	});

	test("respects id attributes", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab id="tab-2">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>`;
		});

		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveAttribute("id", "tab-1");
		await expect(uTab1).toHaveAttribute("id", "tab-2");
		await expect(uTab0).toHaveAttribute("aria-controls", "panel-1");
		await expect(uTabpanel0).toHaveAttribute(attrLabelledby(), "tab-1");
		await expect(uTabpanel0).toHaveAttribute("id", "panel-1");
		await expect(uTabpanel1).toHaveAttribute("id", "panel-2");

		await uTab0.evaluate((el) => {
			el.id = "tab-1-changed";
		});
		await expect(uTabpanel0).toHaveAttribute(attrLabelledby(), "tab-1-changed");
	});

	test("respects aria-controls attributes", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-2">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>`;
		});

		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTabpanel1 = page.locator("u-tabpanel").nth(1);

		await expect(uTab0).toHaveAttribute("aria-controls", "panel-2");
		await expect(uTab1).toHaveAttribute("aria-controls", "panel-1");
		await expect(uTabpanel1).toHaveAttribute(attrLabelledby(), "tab-1");
	});

	test("respects multiple tabs for same panel", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-1">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 2</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 3</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
      </u-tabs>`;
		});

		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTab2 = page.locator("u-tab").nth(2);
		const uTabpanel0 = page.locator("u-tabpanel").nth(0);

		expect(
			await page.evaluate(() => {
				const uTabs = document.querySelector("u-tabs");
				return (
					uTabs?.tabs[0].panel === uTabs?.tabs[1].panel &&
					uTabs?.tabs[1].panel === uTabs?.tabs[2].panel
				);
			}),
		);

		await uTab0.evaluate<void, UHTMLTabElement>((el) => {
			el.selected = true;
		});
		await expect(uTab0).toHaveAttribute("aria-selected", "true");
		await expect(uTab1).toHaveAttribute("aria-selected", "false");
		await expect(uTab2).toHaveAttribute("aria-selected", "false");
		await expect(uTabpanel0).toBeVisible();

		await uTab1.evaluate<void, UHTMLTabElement>((el) => {
			el.selected = true;
		});
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveAttribute("aria-selected", "true");
		await expect(uTab2).toHaveAttribute("aria-selected", "false");
		await expect(uTabpanel0).toBeVisible();

		await uTab2.evaluate<void, UHTMLTabElement>((el) => {
			el.selected = true;
		});
		await expect(uTab0).toHaveAttribute("aria-selected", "false");
		await expect(uTab1).toHaveAttribute("aria-selected", "false");
		await expect(uTab2).toHaveAttribute("aria-selected", "true");
		await expect(uTabpanel0).toBeVisible();
	});

	test("respects external tabpanels", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-1">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-2">Tab 2</u-tab>
          <u-tab id="tab-2" aria-controls="panel-3">Tab 3</u-tab>
        </u-tablist>
      </u-tabs>
      <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
      <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      <u-tabpanel id="panel-3">Panel 3</u-tabpanel>`;
		});

		const uTabpanel = page.locator("u-tabpanel");

		await expect(uTabpanel).toHaveCount(3);
		await expect(uTabpanel.nth(0)).toHaveJSProperty("hidden", false);
		await expect(uTabpanel.nth(1)).toHaveJSProperty("hidden", true);
		await expect(uTabpanel.nth(2)).toHaveJSProperty("hidden", true);
	});

	test("handles dynamically added tabs", async ({ page }) => {
		const uTab = page.locator("u-tab");

		await expect(uTab.nth(0)).toHaveAttribute("aria-selected", "true");

		await page.evaluate(() => {
			const uTablist = document.querySelector("u-tablist");
			uTablist?.insertAdjacentHTML("afterbegin", "<u-tab>Tab 0</u-tab>");
		});
		await expect(uTab.nth(1)).toHaveAttribute("aria-selected", "true");

		await uTab.nth(0).click();
		await expect(uTab.nth(0)).toHaveAttribute("aria-selected", "true");
	});

	test("handles nested DOM and nested instances", async ({ page }) => {
		expect(
			await page.evaluate(() => {
				document.body.innerHTML = `<u-tabs>
          <u-tablist>
            <u-tab>Tab 1</u-tab>
            <div><u-tab>Tab 2</u-tab></div>
          </u-tablist>
          <div><u-tabpanel>Panel 1</u-tabpanel></div>
          <u-tabpanel>
            <u-tabs>
              <u-tablist><u-tab>Nested tab 1</u-tab></u-tablist>
              <u-tabpanel>Nested panel 1</u-tabpanel>
            </u-tabs>
          </u-tabpanel>
        </u-tabs>`;

				const uTabs = document.querySelectorAll("u-tabs");
				return (
					uTabs[0].tabs.length === 2 &&
					uTabs[0].panels.length === 2 &&
					uTabs[1].tabs.length === 1 &&
					uTabs[1].panels.length === 1
				);
			}),
		).toBeTruthy();
	});

	test("handles incomplete DOM instances", async ({ page }) => {
		expect(
			await page.evaluate(() => {
				document.body.innerHTML =
					"<u-tabs></u-tabs><u-tab></u-tab><u-tabpanel></u-tabpanel>";
				return (
					document.querySelector("u-tabs")?.tabList === null &&
					document.querySelector("u-tab")?.tabsElement === null &&
					document.querySelector("u-tab")?.index === 0 &&
					document.querySelector("u-tabpanel")?.tabsElement === null
				);
			}),
		).toBeTruthy();
	});

	test("respectes event.preventDefault", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab aria-selected="true">Tab 2</u-tab>
        </u-tablist>
      </u-tabs>`;
		});
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);

		await uTab0.evaluate((el) =>
			el.addEventListener("click", (event) => event.preventDefault()),
		);
		await uTab0.click();
		await expect(uTab1).toHaveJSProperty("selected", true);
	});

	test("handles keyboard arrow navigation", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
          <u-tab>Tab 3</u-tab>
        </u-tablist>
      </u-tabs>
      <button>Test</button>`;
		});
		const uTab0 = page.locator("u-tab").nth(0);
		const uTab1 = page.locator("u-tab").nth(1);
		const uTab2 = page.locator("u-tab").nth(2);

		await uTab0.focus();
		await expect(uTab0).toBeFocused();
		await expect(uTab0).toHaveJSProperty("selected", true);

		await uTab0.press("ArrowRight");
		await expect(uTab1).toBeFocused();
		await expect(uTab1).toHaveJSProperty("selected", false);

		await uTab1.press("ArrowLeft");
		await expect(uTab0).toBeFocused();
		await expect(uTab0).toHaveJSProperty("selected", true);

		await uTab0.press("ArrowDown");
		await expect(uTab1).toBeFocused();

		await uTab1.press("ArrowUp");
		await expect(uTab0).toBeFocused();

		await uTab0.press("End");
		await expect(uTab2).toBeFocused();

		await uTab2.press("ArrowRight");
		await expect(uTab0).toBeFocused();

		await uTab0.press("ArrowLeft");
		await expect(uTab2).toBeFocused();

		await uTab2.press("Home");
		await expect(uTab0).toBeFocused();

		await uTab0.press("z");
		await expect(uTab0).toBeFocused();

		await uTab0.press("End");
		await uTab2.press(" ");
		await expect(uTab2).toHaveJSProperty("selected", true);
	});

	test("sets tabindex on panels without interactive element as first child", async ({
		page,
	}) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
        </u-tablist>
				<u-tabpanel>Non interactive</u-tabpanel>
				<u-tabpanel><a href="#">Interactive</a></u-tabpanel>
      </u-tabs>`;
		});
		const uTabpanel = page.locator("u-tabpanel");
		await expect(uTabpanel.nth(0)).toHaveAttribute("tabindex", "0");
		await expect(uTabpanel.nth(1)).not.toHaveAttribute("tabindex");
	});

	test("handles DOM changes", async ({ page }) => {
		await page.evaluate(() => {
			document.body.innerHTML = `<u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab id="tab-2" aria-selected="true">Tab 2</u-tab>
        </u-tablist>
				<u-tabpanel>Panel 1</u-tabpanel>
      </u-tabs>`;
		});
		const uTab = page.locator("u-tab");
		const uTabpanel = page.locator("u-tabpanel");
		await expect(uTab.nth(0)).toHaveAttribute("tabindex", "-1");
		await expect(uTab.nth(1)).toHaveAttribute("tabindex", "0");
		await expect(uTabpanel.nth(0)).toHaveAttribute("hidden");
		await expect(uTabpanel.nth(1)).toBeHidden();

		await page.evaluate(() => {
			document.body
				.querySelector("u-tabs")
				?.insertAdjacentHTML(
					"beforeend",
					'<u-tabpanel id="panel-2">Panel 2</u-tabpanel>',
				);
		});
		await expect(uTab.nth(1)).toHaveAttribute("aria-controls", "panel-2");
		await expect(uTabpanel.nth(1)).toHaveAttribute(attrLabelledby(), "tab-2");

		await page.evaluate(() => {
			const panel = document.getElementById("panel-2");
			if (panel) document.body.append(panel);
		});

		await expect(uTab.nth(1)).toHaveAttribute("aria-controls", "panel-2");
		await expect(uTabpanel.nth(1)).toHaveAttribute(attrLabelledby(), "tab-2");

		await uTab.nth(0).click();
		await expect(uTabpanel.nth(0)).not.toHaveAttribute("hidden");
		await uTab.nth(1).click();
		await expect(uTabpanel.nth(0)).toHaveAttribute("hidden");

		await page.evaluate(() => {
			document.getElementById("panel-2")?.removeAttribute("id");
		});

		await expect(uTabpanel.nth(0)).toHaveAttribute("hidden");
		await expect(uTabpanel.nth(1)).toHaveAttribute("hidden");
	});
});
