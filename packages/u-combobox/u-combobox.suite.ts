import { gotoHarness } from "../suite";
import { test } from "../test";
import { announcementsTests } from "./suite/announcements";
import { buttonsTests } from "./suite/buttons";
import { consumerEventsTests } from "./suite/consumer-events";
import { createContext } from "./suite/context";
import { disabledReadonlyTests } from "./suite/disabled-readonly";
import { eventsTests } from "./suite/events";
import { fingerprintingTests } from "./suite/fingerprinting";
import { formTests } from "./suite/form";
import { keyboardTests } from "./suite/keyboard";
import { modeChangesTests } from "./suite/mode-changes";
import { mountTests } from "./suite/mount";
import { multipleTests } from "./suite/multiple";
import { setupTests } from "./suite/setup";
import { singleTests } from "./suite/single";
import { withoutDatalistTests } from "./suite/without-datalist";
import type { HarnessPatch } from "./u-combobox.harness";

/**
 * Shared test suite for the harness pages (see u-combobox.harness.ts), run against
 * vanilla DOM (u-combobox.spec.ts) and each framework (u-combobox.frameworks.spec.ts).
 * Items are rendered from state, the input value is bound, and all events are handled
 * with the renderer's event bindings. Pure DOM tests (snapshot, shadow root host, moving
 * the element) live in u-combobox.spec.ts.
 *
 * The groups live in ./suite, one file per area, and share the helpers in ./suite/context.ts.
 * Every group runs with both native <datalist> and <u-datalist>, except the tests without a datalist.
 * Native <datalist> picks are simulated with setRangeText + InputEvent("insertReplacementText"),
 * as Playwright can not interact with the native suggestion popup.
 */

export type SuiteOptions = {
	url?: string; // Harness page, relative to the project baseURL
	defaults?: HarnessPatch; // Applied to every render, i.e. { controlled: false } to let the component manage items
};

export const comboboxSuite = ({
	url = "test.html?component=u-combobox",
	defaults = {},
}: SuiteOptions = {}) => {
	test.describe("harness", () => {
		test.beforeEach(({ page }) => gotoHarness(page, url));

		for (const LIST_TAG of ["u-datalist", "datalist"] as const) {
			const ctx = createContext(LIST_TAG, defaults);
			setupTests(ctx);
			singleTests(ctx);
			eventsTests(ctx);
			multipleTests(ctx);
			consumerEventsTests(ctx);
			fingerprintingTests(ctx);
			modeChangesTests(ctx);
			buttonsTests(ctx);
			mountTests(ctx);
			formTests(ctx);
			disabledReadonlyTests(ctx);
			keyboardTests(ctx);
			announcementsTests(ctx);
		}

		withoutDatalistTests(defaults);
	});
};
