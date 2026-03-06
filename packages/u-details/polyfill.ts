import { attr, IS_ANDROID, IS_BROWSER, IS_FIREFOX, onMutation } from "../utils";

const KEY = "__uDetailsPolyfillSummarys";
declare global {
	interface Window {
		[KEY]?: () => void;
	}
}

// Polyfill for Android Firefox + Talkback which does announce role or state of details/summary
if (IS_BROWSER && IS_ANDROID && IS_FIREFOX && !window[KEY]) {
	const summaries = document.getElementsByTagName("summary"); // Ensure single instance on hot reloads
	const handleMutation = () => {
		for (const summary of summaries) {
			const details = summary.parentElement as HTMLDetailsElement | null;
			attr(summary, "role", "button");
			attr(summary, "aria-expanded", `${!!details?.open}`);
		}
	};

	window[KEY] = onMutation(document, handleMutation, {
		attributeFilter: ["open"],
		attributes: true,
		childList: true,
		subtree: true,
	});
}
