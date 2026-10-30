/**
 * Shared helpers for the u-combobox suite files (see ../u-combobox.suite.ts). Every group runs with both
 * native <datalist> and <u-datalist>, so each group takes a SuiteContext made for one list tag.
 */
import type { Locator, Page } from "@playwright/test";
import { harnessHelpers } from "../../suite";
import { expect } from "../../test";
import type { HarnessConfig, HarnessPatch } from "../u-combobox.harness";

export const { render: renderHarness, update } =
	harnessHelpers<HarnessConfig>();

export const BERGEN = { value: "Bergen", label: "Bergen" } as const;
export const OSLO = { value: "oslo-id", label: "Oslo" } as const;

export const setCaretStart = (input: Node) => {
	(input as HTMLInputElement).selectionStart = (
		input as HTMLInputElement
	).selectionEnd = 0;
};

export type ListTag = "u-datalist" | "datalist";

export type SuiteContext = {
	LIST_TAG: ListTag;
	OPT_TAG: "u-option" | "option";
	IS_NATIVE: boolean;
	name: (group: string) => string; // Group title suffixed with the list tag
	render: (page: Page, cfg?: HarnessPatch | HarnessPatch[]) => Promise<void>; // Render with the list tag and the suite defaults applied
	selectOption: (input: Locator, opt: Locator) => Promise<void>; // Pick an option like a user would
};

export const createContext = (
	LIST_TAG: ListTag,
	defaults: HarnessPatch,
): SuiteContext => {
	const IS_NATIVE = LIST_TAG === "datalist";
	return {
		LIST_TAG,
		OPT_TAG: IS_NATIVE ? "option" : "u-option",
		IS_NATIVE,
		name: (group) => `${group} (${LIST_TAG})`,
		render: (page, cfg = {}) =>
			renderHarness(page, cfg, { listTag: LIST_TAG, ...defaults }),
		selectOption: async (input, opt) => {
			if (IS_NATIVE) {
				// A real native <datalist> pick updates the value inside the browser without
				// going through the (patched) HTMLInputElement.prototype.value setter.
				const optElement = await opt.elementHandle();
				await input.evaluate((input: HTMLInputElement, opt: Element) => {
					const inputType = "insertReplacementText";
					const data = (opt as HTMLOptionElement).value;
					const event = { bubbles: true, composed: true, data, inputType };
					const type = input.type; // Types without selection support (i.e. email) can not use setRangeText, so write the value as type="text"

					input.type = "text";
					input.setRangeText(data, 0, input.value.length);
					input.type = type;
					input.dispatchEvent(new InputEvent("input", event));
					input.dispatchEvent(new Event("change", { bubbles: true }));
				}, optElement);
			} else {
				await expect(opt).toBeVisible();
				await opt.click();
			}
		},
	};
};
