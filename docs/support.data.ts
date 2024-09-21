import type { CompatStatement } from "@mdn/browser-compat-data";
import caniuse from "caniuse-lite";
import bcd from "@mdn/browser-compat-data/forLegacyNode";
import no from "caniuse-lite/data/regions/NO";
// import { JSHINT } from "jshint";
// import path from "node:path";
// import fs from "node:fs";

const usageNorway = caniuse.region(no);
const intlDate = new Intl.DateTimeFormat("en", {
	month: "long",
	year: "numeric",
});

// Both MDN and caniuse compatible agents, with sorted releases
const agents: Record<
	string,
	{
		caniuseKey: string;
		name: string;
		releases: [string, number | undefined][];
		usage: Record<string, number | undefined>;
	}
> = {};

for (const [agent, data] of Object.entries(caniuse.agents)) {
	if (!data) continue;
	const { browser, release_date = [], usage_global } = data;
	const releases = Object.entries(release_date)
		.filter(([, release]) => release)
		.sort(([, a = 0], [, b = 0]) => a - b);

	const mdnAgent = Object.entries(bcd.browsers).find(([, { name }]) => {
		return name === browser;
	})?.[0];

	if (mdnAgent)
		agents[agent] = agents[mdnAgent] = {
			caniuseKey: agent,
			name: browser,
			releases,
			usage: usage_global,
		};
}

function getBrowserSupport(feature: CompatStatement, region = {}) {
	const stats = feature.support;
	const total = { yes: 0, no: 0 };
	const supports: Record<
		string,
		{ date: string; percentage: number; version: number }
	> = {};

	const toPercentage = (sup: { yes: number; no: number }) =>
		(sup.yes / (sup.yes + sup.no)) * 100;

	for (const [browser, versions] of Object.entries(stats)) {
		const added =
			"version_added" in versions &&
			(Number.parseFloat(`${versions.version_added}`) ||
				Number.POSITIVE_INFINITY);

		const agent = agents[browser];
		const usage = region[agent?.caniuseKey] || agent?.usage;
		const support = { yes: 0, no: 0, version: 0, date: "" };

		if (!usage) continue;
		for (const [version, release] of agent.releases) {
			const noSupport = added
				? Number.parseFloat(version?.split("-").pop() || "") < added
				: versions[version] === "n";

			const supportKey = noSupport ? "no" : "yes";
			const percentage = Number.parseFloat(usage[version]) || 0;

			total[supportKey] += percentage;
			support[supportKey] += percentage;

			if (!noSupport && !support.date) {
				support.version = Number.parseFloat(version);
				support.date = intlDate.format((release ?? 0) * 1000);
			}
		}
		supports[agent.name] = {
			date: support.date,
			percentage: toPercentage(support),
			version: support.version,
		};
	}

	return {
		total: toPercentage(total),
		agents: supports,
	};
}

function getFeatureName(feature?: CompatStatement) {
	return (
		feature?.description?.replace(/<[^>]+>/g, "") ||
		feature?.mdn_url
			?.split("/")
			.slice(-2)
			.join(".")
			.replace(/^(API|Global_Objects)\./g, "")
			.replace(/^(EventTarget)\./g, "Element.")
			.replace(/^(Global_attributes)\./g, "Element.") ||
		""
	);
}

export default {
	load() {
		const features = [
			bcd.api.CSSStyleDeclaration.setProperty,
			bcd.api.CustomElementRegistry,
			bcd.api.CustomEvent,
			bcd.api.Document.createElement,
			bcd.api.Document.getElementById,
			bcd.api.Document.querySelector,
			bcd.api.Document.querySelectorAll,
			bcd.api.Element.append,
			bcd.api.Element.attachShadow,
			bcd.api.Element.blur_event,
			bcd.api.Element.click_event,
			bcd.api.Element.closest,
			bcd.api.Element.focus_event,
			bcd.api.Element.focusin_event,
			bcd.api.Element.focusout_event,
			bcd.api.Element.getAttribute,
			bcd.api.Element.getBoundingClientRect,
			bcd.api.Element.getElementsByTagName,
			bcd.api.Element.hasAttribute,
			bcd.api.Element.input_event,
			bcd.api.Element.insertAdjacentElement,
			bcd.api.Element.keydown_event,
			bcd.api.Element.matches,
			bcd.api.Element.mousedown_event,
			bcd.api.Element.mouseup_event,
			bcd.api.Element.prepend,
			bcd.api.Element.querySelector,
			bcd.api.Element.querySelectorAll,
			bcd.api.Element.remove,
			bcd.api.Element.removeAttribute,
			bcd.api.Element.setAttribute,
			bcd.api.Element.slot,
			bcd.api.Event,
			bcd.api.EventTarget.addEventListener,
			bcd.api.EventTarget.dispatchEvent,
			bcd.api.EventTarget.removeEventListener,
			bcd.api.HTMLElement.focus,
			bcd.api.HTMLElement.hidden,
			bcd.api.HTMLInputElement.selectionEnd,
			bcd.api.KeyboardEvent.key,
			bcd.api.MutationObserver,
			bcd.api.Node.contains,
			bcd.api.Node.getRootNode,
			bcd.api.ShadowRoot,
			bcd.api.clearTimeout,
			bcd.api.setTimeout,
			bcd.css.selectors.host,
			bcd.css.selectors.hostfunction,
			bcd.css.selectors.scope,
			bcd.javascript.builtins.Array.find,
			bcd.javascript.builtins.Array.from,
			bcd.javascript.builtins.Array.includes,
			bcd.javascript.builtins.Array.indexOf,
			bcd.javascript.builtins.Array.map,
			bcd.javascript.builtins.Array.map,
			bcd.javascript.builtins.Array.some,
			bcd.javascript.builtins.Math,
			bcd.javascript.builtins.Number.isFinite,
			bcd.javascript.builtins.Number.isNaN,
			bcd.javascript.builtins.Number.parseFloat,
			bcd.javascript.builtins.Object.defineProperty,
			bcd.javascript.builtins.Object.entries,
			bcd.javascript.builtins.Object.getOwnPropertyDescriptor,
			bcd.javascript.builtins.RegExp.test,
			bcd.javascript.builtins.String.includes,
			bcd.javascript.builtins.String.replace,
			bcd.javascript.builtins.String.trim,
			bcd.javascript.builtins.WeakMap,
			bcd.javascript.classes.static,
			bcd.javascript.functions.get,
			bcd.javascript.functions.set,
			bcd.javascript.grammar.template_literals,
			bcd.javascript.operators.optional_chaining,
			bcd.javascript.operators.spread,
			bcd.javascript.statements.for_of,
		].map(({ __compat: feature }) => ({
			world: getBrowserSupport(feature as CompatStatement),
			norway: getBrowserSupport(feature as CompatStatement, usageNorway),
			name: getFeatureName(feature),
		}));

		// Create object of supported browsers
		const browsers = {};
		for (const feature of features)
			for (const [name, browser] of Object.entries(feature.world.agents)) {
				const prevVersion = browsers[name]?.version ?? 0;
				if (browser.version > prevVersion) browsers[name] = browser;
			}
		// function isObject(item: unknown) {
		// 	return item && typeof item === "object" && !Array.isArray(item);
		// }

		// function mergeDeep(target: object, ...sources: object[]) {
		// 	if (!sources.length) return target;
		// 	const source = sources.shift();

		// 	if (isObject(target) && isObject(source)) {
		// 		for (const key in source) {
		// 			if (isObject(source[key])) {
		// 				if (!target[key]) Object.assign(target, { [key]: {} });
		// 				mergeDeep(target[key], source[key]);
		// 			} else {
		// 				Object.assign(target, { [key]: source[key] });
		// 			}
		// 		}
		// 	}

		// 	return mergeDeep(target, ...sources);
		// }

		// const flattenBCD = (obj: object, path: string[] = [], flat = {}) => {
		// 	for (const [key, val] of Object.entries(obj)) {
		// 		if (key === "__compat") flat[path.join(".")] = val;
		// 		else flattenBCD(val, path.concat(key), flat);
		// 	}
		// 	return flat;
		// };

		// const miniBCD = Object.entries(
		// 	flattenBCD({
		// 		...bcd.api,
		// 		...bcd.javascript,
		// 		...bcd.css.selectors,
		// 	}),
		// );

		// const jshint: Record<string, object> = {};
		// const pkgsPath = path.resolve(__dirname, "../packages");
		// fs.readdirSync(pkgsPath)
		// 	.map((pkgName) => path.resolve(pkgsPath, pkgName, `dist/${pkgName}.js`))
		// 	.filter((pkgDistFile) => fs.existsSync(pkgDistFile))
		// 	.map((pkgDistFile) => {
		// 		JSHINT(String(fs.readFileSync(pkgDistFile)), { esversion: 11 });
		// 		const { functions, options, errors, globals, ...rest } = JSHINT.data();
		// 		mergeDeep(jshint, rest);
		// 	});

		return {
			// jshint: Object.keys(jshint.member).map((key) =>
			// 	miniBCD.filter(([path]) => path.endsWith(key)).map(([path]) => path),
			// ),
			browsers,
			features: features
				.filter((a) => a.world.total !== 100)
				.sort((a, b) => a.world.total - b.world.total),
		};
	},
};
