import { attr, IS_ANDROID, IS_FIREFOX, isBrowser, onMutation } from "../utils";

const KEY = "__uDetailsPolyfillSummarys";
declare global {
	interface Window {
		[KEY]?: () => void;
	}
}

// Polyfill for Android Firefox + Talkback which does announce role or state of details/summary
if (isBrowser() && IS_ANDROID && IS_FIREFOX && !window[KEY]) {
	const summaries = document.getElementsByTagName("summary"); // Ensure single instance on hot reloads
	const onMutations = () => {
		for (const summary of summaries) {
			const details = summary.parentElement as HTMLDetailsElement | null;
			attr(summary, "role", "button");
			attr(summary, "aria-expanded", `${!!details?.open}`);
		}
	};

	window[KEY] = onMutation(document, onMutations, {
		attributeFilter: ["open"],
		attributes: true,
		childList: true,
		subtree: true,
	});
}
