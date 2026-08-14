/**
 * feature-scan.js
 *
 * Scans built JS files, detects modern JavaScript features, matches them against
 * @mdn/browser-compat-data + caniuse-lite, and calculates a global "usage score"
 * (percentage of tracked global users whose browser supports the feature) plus the
 * required browser version and its release date for each feature.
 *
 * Detection:
 *   - JSHint W119 warnings   -> named ES *syntax* features (e.g. "Optional chaining")
 *   - JSHint.data() fields    -> globals, implieds & member usage (e.g. structuredClone,
 *                                MutationObserver, .append(), .closest(), .includes())
 *   - Acorn AST walking      -> built-in *API/method* usage JSHint misses (.flat(), .at(), ...)
 *
 * Usage:  node scripts/feature-scan.js
 * Deps (already installed):  jshint, acorn, @mdn/browser-compat-data, caniuse-lite
 */

/// <reference types="node" />

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import bcd from "@mdn/browser-compat-data" with { type: "json" };
import type {
	CompatData,
	CompatStatement,
	Identifier,
	SimpleSupportStatement,
} from "@mdn/browser-compat-data";
import { parse as acornParse } from "acorn";
import * as caniuse from "caniuse-lite";
// @ts-expect-error: no types for jshint
import { JSHINT } from "jshint";

type CaniuseAgentKey = keyof typeof caniuse.agents;
type SupportedBrowserName =
	| "chrome"
	| "chrome_android"
	| "edge"
	| "firefox"
	| "firefox_android"
	| "safari"
	| "safari_ios"
	| "samsunginternet_android"
	| "opera"
	| "opera_android"
	| "webview_android";
type RequiredBrowsers = Record<
	string,
	{ version: string; releaseDate: string | null }
>;

type JshintFeatureHit = {
	rawName: string;
	esversion: number | null;
	line: number | undefined;
};

/** A feature detected from JSHint.data() globals/implieds/member fields. */
type JshintDataHit = {
	name: string;
	bcd: string;
	line: number | null;
};

type AcornFeatureHit = {
	name: string;
	bcd: string;
	line: number | null;
};

type FeatureSource = "jshint-W119" | "jshint-data" | "acorn-ast" | "css-text";
type FeatureRecord = {
	feature: string;
	bcdPath: string;
	source: FeatureSource;
	esversion: number | null;
	occurrences: number;
	locations: { file: string; line: number | null | undefined }[];
};

type ReportFeature = FeatureRecord & {
	globalSupportScore: number;
	requiredBrowsers: RequiredBrowsers;
	mdn_url: string | null;
};

type AcornNode = {
	type?: string;
	loc?: { start: { line: number } };
	computed?: boolean;
	callee?: AcornNode;
	object?: AcornNode;
	property?: AcornNode;
	name?: string;
	[key: string]: unknown;
};

type AcornApiFeature = {
	name: string;
	bcd: string;
	member?: string;
	object?: string;
	global?: string;
};

const compatData = bcd as CompatData;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ------------------------------------------------------------------ *
 * CONFIG
 * ------------------------------------------------------------------ */

/** Glob patterns (relative to repo root) for the built JS files to scan. */
const SCAN_GLOBS = ["packages/*/dist/*.js"];

/** Where to write the JSON report. */
// const OUTPUT_FILE = resolve(ROOT, "feature-scan-report.json");

/**
 * Features to exclude from the report. Match against the canonical feature name
 * (the `feature` field in the output, e.g. "Optional chaining", "Array.prototype.flat").
 * Case-insensitive. Add strings here to silence known/accepted features.
 */
const EXCLUDE_FEATURES = [
	"HTMLDataElement",
	"userAgentData",
	"popover",
	"togglePopover",
	"attachInternals",
	"part",
	"replaceSync",
	"adoptedStyleSheets",
	"includes",
	"getRootNode",
	// "export",
	// "Object.entries",
	// "Arrow function syntax (=>)",
];

/** ESversion JSHint parses at — set low so it reports every modern feature via W119. */
const JSHINT_ESVERSION = 5;

/** Browsers (BCD keys) to resolve required version + release date for in the output. */
const BROWSERS: SupportedBrowserName[] = [
	"chrome",
	"chrome_android",
	"edge",
	"firefox",
	"firefox_android",
	"safari",
	"safari_ios",
	"samsunginternet_android",
	"opera",
	"opera_android",
	"webview_android",
];

/**
 * Skip browsers whose *total* global usage share is below this % when computing
 * the globalSupportScore. Set to 0 to include every browser.
 */
const MIN_BROWSER_USAGE = 0.1;

/* ------------------------------------------------------------------ *
 * FEATURE -> BCD MAPPING
 * ------------------------------------------------------------------ *
 * Maps a detected feature name to a path inside @mdn/browser-compat-data.
 * JSHint W119 names (the `a` field of the warning) and Acorn-detected API names
 * both resolve through this table. Unmapped features are reported separately so
 * this table can be extended.
 */

/** JSHint W119 feature-name -> BCD path. Keys are lower-cased for matching. */
const JSHINT_FEATURE_TO_BCD: Record<string, string> = {
	"arrow function syntax (=>)": "javascript.functions.arrow_functions",
	"arrow functions": "javascript.functions.arrow_functions",
	"async functions": "javascript.statements.async_function",
	"async generators":
		"javascript.functions.method_definitions.async_generator_methods",
	"binary and octal literals": "javascript.grammar.numeric_separators",
	"class syntax": "javascript.classes",
	"computed property names":
		"javascript.operators.object_initializer.computed_property_names",
	"default parameters": "javascript.functions.default_parameters",
	"destructuring assignment": "javascript.operators.destructuring",
	"dynamic import": "javascript.operators.import",
	"exponentiation operator": "javascript.operators.exponentiation",
	"for await": "javascript.statements.for_await_of",
	"for of": "javascript.statements.for_of",
	"for..of": "javascript.statements.for_of",
	"generator functions": "javascript.functions.generator_functions",
	"import.meta": "javascript.operators.import_meta",
	"logical assignment operators": "javascript.operators.logical_and_assignment",
	"module code": "javascript.statements.import",
	"nullish coalescing": "javascript.operators.nullish_coalescing",
	"numeric separators": "javascript.grammar.numeric_separators",
	"object spread property":
		"javascript.operators.spread.spread_in_object_literals",
	"optional chaining": "javascript.operators.optional_chaining",
	"private class fields": "javascript.classes.private_class_fields",
	"public class fields": "javascript.classes.public_class_fields",
	"rest operator": "javascript.functions.rest_parameters",
	"rest parameter syntax": "javascript.functions.rest_parameters",
	"spread operator": "javascript.operators.spread",
	"spread/rest operator": "javascript.operators.spread",
	"static class fields": "javascript.classes.static_class_fields",
	"template literal syntax": "javascript.grammar.template_literals",
	"the async/await": "javascript.operators.await",
	"the nullish coalescing operator": "javascript.operators.nullish_coalescing",
	bigint: "javascript.grammar.numeric_separators", // fallback-ish; overridden below
	class: "javascript.classes",
	const: "javascript.statements.const",
	destructuring: "javascript.operators.destructuring",
	export: "javascript.statements.export",
	import: "javascript.statements.import",
	let: "javascript.statements.let",
	yield: "javascript.operators.yield",
};

/**
 * Acorn-detected built-in API usage -> BCD path.
 * Each entry describes how to recognise a node and its canonical feature name.
 */
const ACORN_API_FEATURES: AcornApiFeature[] = [
	// Array.prototype instance methods (recognised by .name() call on any object)
	{
		name: "Array.prototype.flat",
		member: "flat",
		bcd: "javascript.builtins.Array.flat",
	},
	{
		name: "Array.prototype.flatMap",
		member: "flatMap",
		bcd: "javascript.builtins.Array.flatMap",
	},
	{
		name: "Array.prototype.at",
		member: "at",
		bcd: "javascript.builtins.Array.at",
	},
	{
		name: "Array.prototype.includes",
		member: "includes",
		bcd: "javascript.builtins.Array.includes",
	},
	{
		name: "Array.prototype.findLast",
		member: "findLast",
		bcd: "javascript.builtins.Array.findLast",
	},
	{
		name: "Array.prototype.findLastIndex",
		member: "findLastIndex",
		bcd: "javascript.builtins.Array.findLastIndex",
	},
	{
		name: "String.prototype.replaceAll",
		member: "replaceAll",
		bcd: "javascript.builtins.String.replaceAll",
	},
	{
		name: "String.prototype.matchAll",
		member: "matchAll",
		bcd: "javascript.builtins.String.matchAll",
	},
	{
		name: "String.prototype.at",
		member: "at",
		bcd: "javascript.builtins.String.at",
	},
	{
		name: "String.prototype.trimStart",
		member: "trimStart",
		bcd: "javascript.builtins.String.trimStart",
	},
	{
		name: "String.prototype.trimEnd",
		member: "trimEnd",
		bcd: "javascript.builtins.String.trimEnd",
	},
	// Static methods (recognised by Object.name / Promise.name / Array.name)
	{
		name: "Object.fromEntries",
		object: "Object",
		member: "fromEntries",
		bcd: "javascript.builtins.Object.fromEntries",
	},
	{
		name: "Object.hasOwn",
		object: "Object",
		member: "hasOwn",
		bcd: "javascript.builtins.Object.hasOwn",
	},
	{
		name: "Object.entries",
		object: "Object",
		member: "entries",
		bcd: "javascript.builtins.Object.entries",
	},
	{
		name: "Object.values",
		object: "Object",
		member: "values",
		bcd: "javascript.builtins.Object.values",
	},
	{
		name: "Array.from",
		object: "Array",
		member: "from",
		bcd: "javascript.builtins.Array.from",
	},
	{
		name: "Array.of",
		object: "Array",
		member: "of",
		bcd: "javascript.builtins.Array.of",
	},
	{
		name: "Promise.allSettled",
		object: "Promise",
		member: "allSettled",
		bcd: "javascript.builtins.Promise.allSettled",
	},
	{
		name: "Promise.any",
		object: "Promise",
		member: "any",
		bcd: "javascript.builtins.Promise.any",
	},
	// Globals (recognised by identifier call)
	{
		name: "structuredClone",
		global: "structuredClone",
		bcd: "api.structuredClone",
	},
	{
		name: "queueMicrotask",
		global: "queueMicrotask",
		bcd: "api.queueMicrotask",
	},
	{
		name: "requestIdleCallback",
		global: "requestIdleCallback",
		bcd: "api.Window.requestIdleCallback",
	},
];

/* ------------------------------------------------------------------ *
 * JSHINT.data() FEATURE MAPS
 * ------------------------------------------------------------------ *
 * JSHint.data() exposes three fields beyond the W119 warnings:
 *   - globals  : referenced predefined/global identifiers (e.g. "IntersectionObserver")
 *   - implieds : undeclared identifiers used (globals like "structuredClone" + locals)
 *   - member   : every accessed property/method name -> access count (e.g. "flat")
 *
 * We map names to BCD paths via allow-lists. Both modern APIs and universal
 * base interfaces/methods (HTMLElement, querySelector, ...) are included, so the
 * report is comprehensive. Extend these tables to broaden coverage further.
 */

/** Global / implied identifier name -> BCD path. */
const GLOBAL_TO_BCD: Record<string, string> = {
	structuredClone: "api.structuredClone",
	queueMicrotask: "api.queueMicrotask",
	requestIdleCallback: "api.Window.requestIdleCallback",
	IntersectionObserver: "api.IntersectionObserver",
	ResizeObserver: "api.ResizeObserver",
	MutationObserver: "api.MutationObserver",
	AbortController: "api.AbortController",
	AbortSignal: "api.AbortSignal",
	BroadcastChannel: "api.BroadcastChannel",
	CustomEvent: "api.CustomEvent",
	// Web Components / custom elements
	customElements: "api.Window.customElements",
	CSSStyleSheet: "api.CSSStyleSheet",
	// Universal DOM base interfaces
	Document: "api.Document",
	Element: "api.Element",
	HTMLElement: "api.HTMLElement",
	HTMLInputElement: "api.HTMLInputElement",
	HTMLDataElement: "api.HTMLDataElement",
	Node: "api.Node",
	Event: "api.Event",
	MouseEvent: "api.MouseEvent",
	Navigator: "api.Navigator",
	setTimeout: "api.setTimeout",
	clearTimeout: "api.clearTimeout",
	// ECMAScript built-ins
	Proxy: "javascript.builtins.Proxy",
	Reflect: "javascript.builtins.Reflect",
	Promise: "javascript.builtins.Promise",
	Symbol: "javascript.builtins.Symbol",
	Map: "javascript.builtins.Map",
	Set: "javascript.builtins.Set",
	WeakMap: "javascript.builtins.WeakMap",
	WeakSet: "javascript.builtins.WeakSet",
	WeakRef: "javascript.builtins.WeakRef",
	BigInt: "javascript.builtins.BigInt",
};

/**
 * Member / method name -> BCD path.
 * Matched against JSHint.data().member keys (property access names). Because a
 * bare name has no receiver, entries here are the ones whose name is a strong,
 * unambiguous signal of a modern feature.
 */
const MEMBER_TO_BCD: Record<string, string> = {
	// Array / String instance methods
	flat: "javascript.builtins.Array.flat",
	flatMap: "javascript.builtins.Array.flatMap",
	at: "javascript.builtins.Array.at",
	findLast: "javascript.builtins.Array.findLast",
	findLastIndex: "javascript.builtins.Array.findLastIndex",
	includes: "javascript.builtins.Array.includes",
	replaceAll: "javascript.builtins.String.replaceAll",
	matchAll: "javascript.builtins.String.matchAll",
	trimStart: "javascript.builtins.String.trimStart",
	trimEnd: "javascript.builtins.String.trimEnd",
	// Object / Promise static-ish members
	fromEntries: "javascript.builtins.Object.fromEntries",
	hasOwn: "javascript.builtins.Object.hasOwn",
	allSettled: "javascript.builtins.Promise.allSettled",
	// DOM methods (modern)
	replaceChildren: "api.Element.replaceChildren",
	toggleAttribute: "api.Element.toggleAttribute",
	getRootNode: "api.Node.getRootNode",
	closest: "api.Element.closest",
	append: "api.Element.append",
	prepend: "api.Element.prepend",
	after: "api.Element.after",
	before: "api.Element.before",
	scrollIntoView: "api.Element.scrollIntoView",
	requestSubmit: "api.HTMLFormElement.requestSubmit",
	showPicker: "api.HTMLInputElement.showPicker",
	attachShadow: "api.Element.attachShadow",
	attachInternals: "api.HTMLElement.attachInternals",
	adoptedStyleSheets: "api.ShadowRoot.adoptedStyleSheets",
	replaceSync: "api.CSSStyleSheet.replaceSync",
	togglePopover: "api.HTMLElement.togglePopover",
	popover: "api.HTMLElement.popover",
	part: "api.Element.part",
	isConnected: "api.Node.isConnected",
	takeRecords: "api.MutationObserver.takeRecords",
	userAgentData: "api.Navigator.userAgentData",
	shadowRoot: "api.Element.shadowRoot",
	composed: "api.Event.composed",
	// DOM methods (universal base interfaces)
	querySelector: "api.Element.querySelector",
	querySelectorAll: "api.Element.querySelectorAll",
	addEventListener: "api.EventTarget.addEventListener",
	removeEventListener: "api.EventTarget.removeEventListener",
	dispatchEvent: "api.EventTarget.dispatchEvent",
	appendChild: "api.Node.appendChild",
	insertBefore: "api.Node.insertBefore",
	removeChild: "api.Node.removeChild",
	contains: "api.Node.contains",
	getBoundingClientRect: "api.Element.getBoundingClientRect",
	getAttribute: "api.Element.getAttribute",
	setAttribute: "api.Element.setAttribute",
	removeAttribute: "api.Element.removeAttribute",
	hasAttribute: "api.Element.hasAttribute",
	createElement: "api.Document.createElement",
	getElementById: "api.Document.getElementById",
	textContent: "api.Node.textContent",
	insertAdjacentElement: "api.Element.insertAdjacentElement",
	observe: "api.MutationObserver.observe",
	disconnect: "api.MutationObserver.disconnect",
};

/**
 * Modern CSS features -> BCD path.
 * JSHint/Acorn cannot see CSS, so these are matched by scanning the raw file
 * text (the built components ship their styles as CSS-in-JS template strings).
 * Only features that (a) exist in BCD and (b) actually occur in the scanned
 * files are listed. This is a text scan, not a full CSS parser, so patterns are
 * kept specific to minimise false positives.
 */
const CSS_FEATURES: { name: string; bcd: string; pattern: RegExp }[] = [
	{ name: ":host", bcd: "css.selectors.host", pattern: /:host\b/g },
	{ name: ":is()", bcd: "css.selectors.is", pattern: /:is\(/g },
	{
		name: "::slotted()",
		bcd: "css.selectors.slotted",
		pattern: /::slotted\(/g,
	},
];

/* ------------------------------------------------------------------ *
 * HELPERS
 * ------------------------------------------------------------------ */

/** Resolve a dotted BCD path to its `__compat` object, or null. */

function bcdCompat(bcdPath: string): CompatStatement | null {
	const node = bcdPath
		.split(".")
		.reduce<Identifier | CompatData | undefined>(
			(acc, key) =>
				acc ? (acc as Record<string, Identifier>)[key] : undefined,
			compatData,
		);
	return node && "__compat" in node ? (node.__compat ?? null) : null;
}

/**
 * Normalise a BCD version_added value.
 * Returns { version: string|null, supported: boolean }.
 */
function normalizeVersion(
	added: SimpleSupportStatement["version_added"] | true | null | undefined,
): { version: string | null; supported: boolean } {
	if (added === true) return { version: null, supported: true }; // supported, version unknown/early
	if (added === false || added == null)
		return { version: null, supported: false };
	if (typeof added === "string") {
		// Handle ranged "≤80" style values
		const cleaned = added.replace(/^≤/, "").trim();
		if (cleaned === "preview") return { version: null, supported: false };
		return { version: cleaned, supported: true };
	}
	return { version: null, supported: false };
}

/** Unix seconds -> YYYY-MM-DD (or null). */
function toDate(unixSeconds: number | undefined): string | null {
	if (unixSeconds == null) return null;
	return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/** Compare two browser version strings numerically-ish (e.g. "13.1" vs "13"). */
function versionGte(a: string, b: string): boolean {
	const pa = String(a).split(".").map(Number);
	const pb = String(b).split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const x = pa[i] || 0;
		const y = pb[i] || 0;
		if (x > y) return true;
		if (x < y) return false;
	}
	return true; // equal counts as >=
}

/**
 * The combined caniuse `usage_global` of the in-scope browsers (those with a BCD
 * equivalent and >= MIN_BROWSER_USAGE) is < 100%, because caniuse spreads global
 * usage across *all* browsers — including untracked ones we intentionally ignore
 * (IE, UC, etc.) and versions below the threshold.
 *
 * To avoid features with universal support topping out at ~96-98%, we uniformly
 * rescale the in-scope population so its combined usage becomes exactly 100%.
 * "Uniform" means every in-scope version share (supported AND unsupported) is
 * multiplied by the same factor, keeping relative support realistic.
 *
 * Returns the scale factor `100 / includedShare`, computed once and cached.
 */
let usageScaleCache: number | null = null;
function getUsageScale(): number {
	if (usageScaleCache !== null) return usageScaleCache;
	let includedShare = 0;
	for (const agentKey of Object.keys(CANIUSE_TO_BCD) as CaniuseAgentKey[]) {
		const agent = caniuse.agents[agentKey];
		if (!agent) continue;
		let agentTotal = 0;
		for (const usage of Object.values(agent.usage_global || {})) {
			if (typeof usage === "number") agentTotal += usage;
		}
		if (agentTotal < MIN_BROWSER_USAGE) continue;
		includedShare += agentTotal;
	}
	usageScaleCache = includedShare > 0 ? 100 / includedShare : 1;
	return usageScaleCache;
}

/**
 * For a BCD compat object, compute:
 *  - requiredBrowsers: { browser: { version, releaseDate } }
 *  - globalSupportScore: % of global users on a version that supports the feature,
 *    across browsers that have a BCD equivalent and >= MIN_BROWSER_USAGE, with the
 *    in-scope population uniformly rescaled to sum to 100% (see getUsageScale).
 *
 * Browsers with no BCD equivalent are ignored entirely, so the score reflects
 * only browsers we can actually assess. Because of the rescaling, a feature with
 * universal support scores exactly 100%.
 */
function computeSupport(compat: CompatStatement): {
	requiredBrowsers: RequiredBrowsers;
	globalSupportScore: number;
} {
	const requiredBrowsers: RequiredBrowsers = {};

	// Resolve required version + release date for the configured display browsers.
	for (const browser of BROWSERS) {
		const support = compat.support?.[browser];
		if (!support) continue;
		const primary = Array.isArray(support) ? support[0] : support;
		const { version, supported } = normalizeVersion(primary?.version_added);
		if (!supported) continue;
		const agent = caniuse.agents[BCD_TO_CANIUSE[browser]];
		requiredBrowsers[browser] = {
			version: version ?? "unknown",
			releaseDate:
				version && agent?.release_date
					? toDate(agent.release_date[version])
					: null,
		};
	}

	// Score across every caniuse agent that maps to a BCD browser. Every in-scope
	// usage share is multiplied by `scale` so the assessable population sums to
	// 100% (uniform rescaling), removing the untracked-browser slack.
	const scale = getUsageScale();
	let supportedShare = 0;

	for (const [agentKey, bcdBrowser] of Object.entries(CANIUSE_TO_BCD) as [
		CaniuseAgentKey,
		SupportedBrowserName,
	][]) {
		const agent = caniuse.agents[agentKey];
		if (!agent) continue;

		// Total usage share for this browser across all its versions.
		let agentTotal = 0;
		for (const usage of Object.values(agent.usage_global || {})) {
			if (typeof usage === "number") agentTotal += usage;
		}
		// Ignore browsers below the usage threshold.
		if (agentTotal < MIN_BROWSER_USAGE) continue;

		const support = compat.support?.[bcdBrowser];
		if (!support) continue; // BCD says: no support data -> treated as unsupported
		const primary = Array.isArray(support) ? support[0] : support;
		const { version, supported } = normalizeVersion(primary?.version_added);
		if (!supported) continue;

		for (const [ver, usage] of Object.entries(agent.usage_global || {})) {
			if (typeof usage !== "number") continue;
			// version == null means supported since an unknown/early version -> count all.
			if (version == null || versionGte(ver, version)) {
				supportedShare += usage * scale;
			}
		}
	}

	// supportedShare is already a percentage of the rescaled (100%) population.
	const globalSupportScore = Math.min(100, supportedShare);

	return {
		requiredBrowsers,
		globalSupportScore: Math.round(globalSupportScore * 10) / 10,
	};
}

/**
 * caniuse-lite agent -> BCD browser key. Agents with no BCD equivalent
 * (ie, ie_mob, and_uc, and_qq, baidu, kaios, op_mini, bb) are intentionally
 * omitted and thus ignored in scoring.
 */
const CANIUSE_TO_BCD = {
	chrome: "chrome",
	and_chr: "chrome_android",
	edge: "edge",
	firefox: "firefox",
	and_ff: "firefox_android",
	safari: "safari",
	ios_saf: "safari_ios",
	samsung: "samsunginternet_android",
	opera: "opera",
	op_mob: "opera_android",
	android: "webview_android",
} satisfies Partial<Record<CaniuseAgentKey, SupportedBrowserName>>;

/** Map BCD browser keys -> caniuse-lite agent keys for release-date lookup. */
const BCD_TO_CANIUSE = {
	chrome: "chrome",
	chrome_android: "and_chr",
	edge: "edge",
	firefox: "firefox",
	firefox_android: "and_ff",
	safari: "safari",
	safari_ios: "ios_saf",
	samsunginternet_android: "samsung",
	opera: "opera",
	opera_android: "op_mob",
	webview_android: "android",
} satisfies Record<SupportedBrowserName, CaniuseAgentKey>;

/* ------------------------------------------------------------------ *
 * DETECTION
 * ------------------------------------------------------------------ */

/** Run JSHint and collect W119 syntax-feature warnings. */
function detectWithJshint(code: string): JshintFeatureHit[] {
	const found: JshintFeatureHit[] = [];
	JSHINT(code, {
		esversion: JSHINT_ESVERSION,
		module: true,
		browser: true,
		asi: true,
	});
	// for (const err of JSHINT.errors || [])
	// 	if (err?.code === "W119")
	// 		found.push({
	// 			rawName: String(err.a || "").trim(),
	// 			esversion: err.b ? Number(err.b) : null,
	// 			line: err.line,
	// 		});

	return found;
}

/**
 * Read JSHint.data() (must be called right after JSHINT() ran on the same code)
 * and derive features from its `globals`, `implieds` and `member` fields.
 *
 *   - globals + implieds -> global/constructor identifiers (GLOBAL_TO_BCD)
 *   - member             -> accessed property/method names (MEMBER_TO_BCD)
 */
function detectWithJshintData(): JshintDataHit[] {
	const found: JshintDataHit[] = [];
	const data = (typeof JSHINT.data === "function" ? JSHINT.data() : null) as {
		globals?: string[];
		implieds?: { name: string; line?: number[] }[];
		member?: Record<string, number>;
	} | null;
	if (!data) return found;

	const seenGlobals = new Set<string>();

	// globals: array of referenced predefined/global identifier names.
	for (const name of data.globals || []) {
		if (!Object.hasOwn(GLOBAL_TO_BCD, name)) continue;
		const bcd = GLOBAL_TO_BCD[name];
		if (!seenGlobals.has(name)) {
			seenGlobals.add(name);
			found.push({ name, bcd, line: null });
		}
	}

	// implieds: undeclared identifiers used (many are globals we care about).
	for (const imp of data.implieds || []) {
		const name = imp?.name;
		if (!name || !Object.hasOwn(GLOBAL_TO_BCD, name)) continue;
		const bcd = GLOBAL_TO_BCD[name];
		if (!seenGlobals.has(name)) {
			seenGlobals.add(name);
			found.push({ name, bcd, line: imp.line?.[0] ?? null });
		}
	}

	// member: map of accessed property/method name -> access count.
	for (const [name, count] of Object.entries(data.member || {})) {
		if (!Object.hasOwn(MEMBER_TO_BCD, name)) continue;
		const bcd = MEMBER_TO_BCD[name];
		// Preserve the access count as separate occurrences.
		for (let i = 0; i < (count || 1); i++) {
			found.push({ name, bcd, line: null });
		}
	}

	return found;
}

/**
 * Scan raw file text for modern CSS features (see CSS_FEATURES). Built components
 * embed their styles as CSS-in-JS strings, so a text scan is sufficient. Each
 * match counts as one occurrence.
 */
function detectCssFeatures(code: string): AcornFeatureHit[] {
	const found: AcornFeatureHit[] = [];
	for (const { name, bcd, pattern } of CSS_FEATURES) {
		pattern.lastIndex = 0;
		const count = (code.match(pattern) || []).length;
		for (let i = 0; i < count; i++) found.push({ name, bcd, line: null });
	}
	return found;
}
function detectWithAcorn(code: string): AcornFeatureHit[] {
	const found: AcornFeatureHit[] = [];
	let ast: AcornNode;
	try {
		ast = acornParse(code, {
			ecmaVersion: "latest",
			sourceType: "module",
			locations: true,
		}) as unknown as AcornNode;
	} catch {
		try {
			ast = acornParse(code, {
				ecmaVersion: "latest",
				sourceType: "script",
				locations: true,
			}) as unknown as AcornNode;
		} catch {
			return found; // unparseable, skip
		}
	}

	walk(ast, (node) => {
		if (node.type !== "CallExpression" && node.type !== "MemberExpression")
			return;
		const line = node.loc?.start.line ?? null;

		// Global identifier calls e.g. structuredClone(...)
		if (node.type === "CallExpression" && node.callee?.type === "Identifier") {
			const callee = node.callee;
			const g = ACORN_API_FEATURES.find((f) => f.global === callee.name);
			if (g) found.push({ name: g.name, bcd: g.bcd, line });
			return;
		}

		if (node.type !== "MemberExpression" || node.computed) return;
		const prop = node.property?.name;
		if (!prop) return;

		// Static method e.g. Object.fromEntries / Promise.any
		if (node.object?.type === "Identifier") {
			const objName = node.object.name;
			const stat = ACORN_API_FEATURES.find(
				(f) => f.object === objName && f.member === prop,
			);
			if (stat) {
				found.push({ name: stat.name, bcd: stat.bcd, line });
				return;
			}
		}

		// Instance method e.g. someArr.flat() — matched purely by method name
		const inst = ACORN_API_FEATURES.find(
			(f) => f.member === prop && !f.object && !f.global,
		);
		if (inst) found.push({ name: inst.name, bcd: inst.bcd, line });
	});

	return found;
}

/** Minimal recursive AST walker. */
function walk(node: AcornNode, visit: (node: AcornNode) => void): void {
	if (!node || typeof node.type !== "string") return;
	visit(node);
	for (const key of Object.keys(node)) {
		if (key === "loc" || key === "start" || key === "end") continue;
		const value = node[key];
		if (Array.isArray(value)) {
			for (const child of value) if (isAcornNode(child)) walk(child, visit);
		} else if (isAcornNode(value)) {
			walk(value, visit);
		}
	}
}

function isAcornNode(value: unknown): value is AcornNode {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as AcornNode).type === "string"
	);
}

/* ------------------------------------------------------------------ *
 * LOAD
 * ------------------------------------------------------------------ */

function load() {
	const excludeSet = new Set(EXCLUDE_FEATURES.map((f) => f.toLowerCase()));

	// Collect files
	const files: string[] = [];
	for (const pattern of SCAN_GLOBS) {
		for (const rel of fs.globSync(pattern, { cwd: ROOT })) files.push(rel);
	}
	files.sort();

	// feature key -> aggregate record
	const featureMap = new Map<string, FeatureRecord>();
	const unmatched = new Set<string>();

	const addOccurrence = (
		feature: string,
		bcdPath: string,
		source: FeatureSource,
		esversion: number | null,
		file: string,
		line: number | null | undefined,
	) => {
		if (excludeSet.has(feature.toLowerCase())) return;
		let rec = featureMap.get(feature);
		if (!rec) {
			rec = {
				feature,
				bcdPath,
				source,
				esversion,
				occurrences: 0,
				locations: [],
			};
			featureMap.set(feature, rec);
		}
		rec.occurrences += 1;
		if (rec.locations.length < 50) rec.locations.push({ file, line });
	};

	for (const rel of files) {
		const code = fs.readFileSync(path.resolve(ROOT, rel), "utf8");
		// --- JSHint syntax features (W119 warnings) ---
		for (const hit of detectWithJshint(code)) {
			const key = hit.rawName.toLowerCase();
			const bcdPath = JSHINT_FEATURE_TO_BCD[key];
			if (!bcdPath) {
				if (hit.rawName) unmatched.add(hit.rawName);
				continue;
			}
			addOccurrence(
				hit.rawName,
				bcdPath,
				"jshint-W119",
				hit.esversion,
				rel,
				hit.line,
			);
		}

		// --- JSHint.data() globals / implieds / member features ---
		// Must run directly after detectWithJshint (reads the same JSHINT.data()).
		for (const hit of detectWithJshintData()) {
			addOccurrence(hit.name, hit.bcd, "jshint-data", null, rel, hit.line);
		}

		// --- Acorn API features ---
		for (const hit of detectWithAcorn(code)) {
			addOccurrence(hit.name, hit.bcd, "acorn-ast", null, rel, hit.line);
		}

		// --- Modern CSS features (text scan of CSS-in-JS) ---
		for (const hit of detectCssFeatures(code)) {
			addOccurrence(hit.name, hit.bcd, "css-text", null, rel, hit.line);
		}
	}

	// Resolve support data
	const features: ReportFeature[] = [];
	for (const rec of featureMap.values()) {
		const compat = bcdCompat(rec.bcdPath);
		if (!compat) {
			unmatched.add(rec.feature);
			continue;
		}
		const { requiredBrowsers, globalSupportScore } = computeSupport(compat);
		features.push({
			feature: rec.feature,
			source: rec.source,
			esversion: rec.esversion,
			occurrences: rec.occurrences,
			globalSupportScore,
			requiredBrowsers,
			mdn_url: compat.mdn_url ?? null,
			bcdPath: rec.bcdPath,
			locations: rec.locations,
		});
	}

	// Sort riskiest (lowest support) first
	features.sort((a, b) => a.globalSupportScore - b.globalSupportScore);

	const report = {
		generatedAt: new Date().toISOString(),
		scannedFiles: files,
		summary: {
			totalFeatures: features.length,
			minGlobalSupport: features.length ? features[0].globalSupportScore : null,
			lowestFeature: features.length ? features[0].feature : null,
		},
		features,
		unmatchedFeatures: [...unmatched].sort(),
	};

	// writeFileSync(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
	// console.log(
	// 	`Scanned ${files.length} file(s), found ${features.length} matched feature(s).`,
	// );
	// if (unmatched.size)
	// 	console.log(
	// 		`Unmatched (extend the mapping table): ${[...unmatched].join(", ")}`,
	// 	);
	// console.log(`Report written to ${relative(ROOT, OUTPUT_FILE)}`);
	return report;
}

export default { load };
