// Vanilla harness page for the shared u-progress suite (packages/u-progress/u-progress.suite.ts),
// see ./harness.ts for how the DOM is patched in place like a framework would.
import "../../packages/u-progress/u-progress";
import {
	DEFAULTS,
	type HarnessConfig,
	labelId,
	progressAttrs,
} from "../../packages/u-progress/u-progress.harness";
import { create, type Instance, mountHarness, setAttr } from "./harness";

type State = {
	progress: HTMLProgressElement | null;
	label: HTMLElement | null; // The <label> or <span> rendered for the label mode, if any
	text: Text | null; // Its text node, patched in place like a framework patches a text binding
};
type Inst = Instance<HarnessConfig, State>;

const sync = ({ cfg, progress, label, text }: Inst) => {
	if (!progress) return;
	for (const [name, value] of Object.entries(progressAttrs(cfg)))
		setAttr(progress, name, value);
	if (progress.value !== cfg.value) progress.value = cfg.value as number; // Properties, like frameworks write them. null removes the attribute
	if (progress.max !== cfg.max) progress.max = cfg.max as number;
	if (progress.hidden !== cfg.hidden) progress.hidden = cfg.hidden;
	if (label && cfg.label === "for") setAttr(label, "for", cfg.id);
	if (label && cfg.label === "aria-labelledby")
		setAttr(label, "id", labelId(cfg));
	const want = cfg.label === "wrap" ? `${cfg.text} ` : cfg.text;
	if (text && text.data !== want) text.data = want;
};

mountHarness<HarnessConfig, State>(DEFAULTS, {
	structural: ["label"], // The label element is re-rendered when the mode changes, like a framework replaces a conditional element. Its text is patched in place
	init: () => ({ progress: null, label: null, text: null }),
	unmount: (inst) => {
		inst.progress = inst.label = inst.text = null;
	},
	mount: (inst) => {
		const { cfg } = inst;
		const progress = create("u-progress") as HTMLProgressElement;
		inst.progress = progress;

		const nodes: Element[] = [];
		if (cfg.label === "for") inst.label = create("label");
		if (cfg.label === "aria-labelledby") inst.label = create("span");
		if (cfg.label === "wrap") inst.label = create("label");
		if (inst.label) {
			inst.text = document.createTextNode("");
			inst.label.append(inst.text);
			nodes.push(inst.label);
		}
		if (cfg.label === "wrap") inst.label?.append(progress);
		else nodes.push(progress);
		sync(inst);
		return nodes;
	},
	update: (inst) => sync(inst),
});
