import fs from "node:fs";
import path from "node:path";
import type { CompatStatement } from "@mdn/browser-compat-data";
import bcd from "@mdn/browser-compat-data/forLegacyNode";
import caniuse from "caniuse-lite";
import no from "caniuse-lite/data/regions/NO";
import { JSHINT } from "jshint";

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

	const toFloat = (value: unknown) =>
		Number.parseFloat(`${value}`.replace(/[^\d.]+/g, ""));

	const toPercentage = (sup: { yes: number; no: number }) =>
		(sup.yes / (sup.yes + sup.no)) * 100;

	for (const [browser, versions] of Object.entries(stats)) {
		const added =
			"version_added" in versions &&
			(toFloat(versions.version_added) || Number.POSITIVE_INFINITY);

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

function isObject(item: unknown) {
	return item && typeof item === "object" && !Array.isArray(item);
}

function mergeDeep(target: object, ...sources: object[]) {
	if (!sources.length) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
}

function flattenBCDName(...name: string[]) {
	return name
		.slice(-2)
		.join(".")
		.replace(/^HTML\S+Element\./, "HTMLElement.")
		.replace(/^window\./i, "")
		.toLowerCase();
}

function flattenBCD(obj: object, path: string[] = [], flat = {}) {
	for (const [key, val] of Object.entries(obj)) {
		if (key !== "__compat") flattenBCD(val, path.concat(key), flat);
		else if (val.status.standard_track && path.length > 1) {
			flat[flattenBCDName(...path)] = val;
		}
	}
	return flat;
}

const miniBCD = flattenBCD({
	...bcd.api,
	...bcd.javascript,
	...bcd.css.selectors,
});

// Features we _know_ are not strictly needed
const skip = [
	"array.entries",
	"attr.name",
	"attr.value",
	"document.append",
	"document.children",
	"document.hidden",
	"document.prepend",
	"document.title",
	"element.checkvisibility", // Ignored because support is optional
	"element.part",
	"function.name",
	"htmlelement.popovertargetelement", // Ignored because support is optional
	"htmlelement.popover", // Ignored because support is optional
	"htmlelement.togglepopover", // Ignored because support is optional
	"htmlelement.inputmode", // Ignored because support is optional
	"htmlelement.action",
	"htmlelement.autocomplete",
	"htmlelement.disabled",
	"htmlelement.item",
	"htmlelement.label",
	"htmlelement.labels",
	"htmlelement.length",
	"htmlelement.list",
	"htmlelement.remove",
	"htmlelement.max",
	"htmlelement.min",
	"htmlelement.name",
	"htmlelement.open",
	"htmlelement.options",
	"htmlelement.position",
	"htmlelement.selected",
	"htmlelement.selectionend",
	"htmlelement.target",
	"htmlelement.text",
	"htmlelement.title",
	"htmlelement.tostring",
	"htmlelement.type",
	"htmlelement.value",
	"htmlelement.assign",
	"length",
	"name",
	"navigator.useragentdata",
];

export default {
	load() {
		const jshint: Record<string, object> = {};
		const pkgsPath = path.resolve(__dirname, "../packages");
		fs.readdirSync(pkgsPath)
			.map((pkgName) => path.resolve(pkgsPath, pkgName, `dist/${pkgName}.js`))
			.filter((pkgDistFile) => fs.existsSync(pkgDistFile))
			.map((pkgDistFile) => {
				JSHINT(String(fs.readFileSync(pkgDistFile)), { esversion: 11 });
				const { _functions, _options, _errors, ...rest } = JSHINT.data();
				mergeDeep(jshint, rest);
			});

		const globals = [
			"Array",
			"Boolean",
			"CSSStyleDeclaration",
			"Element",
			"Event",
			"KeyboardEvent",
			"MouseEvent",
			"EventTarget",
			"Function",
			"HTMLElement",
			"Node",
			"Number",
			"RegExp",
			"String",
		]
			.concat(jshint.globals as string[])
			.concat((jshint.implieds as { name: string }[]).map(({ name }) => name))
			.map((name) => name.toLowerCase())
			.filter((val, idx, all) => all.indexOf(val) === idx) // Make unique
			.sort();

		const found: [string, CompatStatement][] = [];
		Object.keys(jshint.member).map((key) => {
			for (const global of globals) {
				const path = flattenBCDName(global, key);
				if (miniBCD[path]) found.push([path, miniBCD[path]]);
			}
		});

		const features = found
			.filter(([path]) => !skip.includes(path))
			.filter(([path]) => path.split(".")[0] !== path.split(".")[1]) // Remove document.document, array.array etc
			.map(([, feature]) => feature)
			.concat(
				bcd.css.selectors.host.__compat as CompatStatement,
				bcd.css.selectors.hostfunction.__compat as CompatStatement,
				bcd.css.selectors.scope.__compat as CompatStatement,
			)
			.map((feature) => ({
				world: getBrowserSupport(feature),
				norway: getBrowserSupport(feature, usageNorway),
				name: getFeatureName(feature),
			}));

		// Create object of supported browsers
		const browsers = {};
		for (const feature of features)
			for (const [name, browser] of Object.entries(feature.world.agents)) {
				const prevVersion = browsers[name]?.version ?? 0;
				if (browser.version > prevVersion) browsers[name] = browser;
			}

		return {
			browsers,
			features: features
				.filter((feat) => feat.world.total < 99.9)
				.sort((a, b) => a.world.total - b.world.total),
		};
	},
};
