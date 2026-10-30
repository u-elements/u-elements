/**
 * Harness config for the u-progress framework test pages (frameworks/<name>/test.html?component=u-progress).
 *
 * Each framework page renders <u-progress> with value and max bound from state, and a label rendered
 * the way the config says, see packages/harness.ts for the window.harness contract the shared suite
 * (u-progress.suite.ts) drives.
 *
 * Top level must stay free of DOM access, as the suite imports the presets in Node.
 */

export type LabelMode = "for" | "wrap" | "aria-label" | "aria-labelledby";

export type HarnessConfig = {
	id: string;
	value: number | string | null; // Bound as a property by most frameworks. null means indeterminate
	max: number | string | null;
	label: LabelMode | null;
	text: string; // Label text
	hidden: boolean;
	attrs: Record<string, string>; // Extra attributes on <u-progress>
	mounted: boolean;
};
export type HarnessPatch = Partial<HarnessConfig>;

export const DEFAULTS: HarnessConfig = {
	id: "progress",
	value: 5,
	max: 10,
	label: "for",
	text: "Loading",
	hidden: false,
	attrs: {},
	mounted: false,
};

export const labelId = (cfg: HarnessConfig) => `${cfg.id}-label`;

// Attributes for <u-progress> besides value and max, which the pages bind directly so null reaches the property.
// undefined removes the attribute in every framework
export const progressAttrs = (cfg: HarnessConfig) => ({
	id: cfg.id,
	"aria-label": cfg.label === "aria-label" ? cfg.text : undefined,
	"aria-labelledby": cfg.label === "aria-labelledby" ? labelId(cfg) : undefined,
	...cfg.attrs,
});
