// React harness page for the shared u-progress suite (packages/u-progress/u-progress.suite.ts).
// value and max are bound as props, which React writes as properties on the custom element
import "../../packages/u-progress/u-progress";
import {
	DEFAULTS,
	type HarnessConfig,
	labelId,
	progressAttrs,
} from "../../packages/u-progress/u-progress.harness";
import { customElement, type HarnessProps, mountHarness } from "./harness";

const UProgress = customElement("u-progress");

function Progress({ cfg }: HarnessProps<HarnessConfig>) {
	if (!cfg.mounted) return null;
	const progress = (
		<UProgress
			{...progressAttrs(cfg)}
			value={cfg.value}
			max={cfg.max}
			hidden={cfg.hidden}
		/>
	);

	return (
		<>
			{cfg.label === "for" && <label htmlFor={cfg.id}>{cfg.text}</label>}
			{cfg.label === "aria-labelledby" && (
				<span id={labelId(cfg)}>{cfg.text}</span>
			)}
			{cfg.label === "wrap" ? (
				// biome-ignore lint/a11y/noLabelWithoutControl: <u-progress> is a polyfill of <progress>
				<label>
					{cfg.text} {progress}
				</label>
			) : (
				progress
			)}
		</>
	);
}

mountHarness(DEFAULTS, Progress);
