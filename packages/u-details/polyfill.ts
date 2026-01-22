import { attr, IS_ANDROID, IS_BROWSER, IS_FIREFOX } from "../utils";

const KEY = "__uDetailsPolyfillSummarys";
declare global {
	interface Window {
		[KEY]?: HTMLCollection;
	}
}

// Polyfill for Android Firefox + Talkback which does announce role or state of details/summary
if (IS_BROWSER && IS_ANDROID && IS_FIREFOX && !window[KEY]) {
	window[KEY] = document.getElementsByTagName("summary"); // Ensure single instance on hot reloads
	const handleMutation = () => {
		if (window[KEY])
			for (const summary of window[KEY]) {
				const details = summary.parentElement as HTMLDetailsElement | null;
				attr(summary, "role", "button");
				attr(summary, "aria-expanded", `${!!details && !!details.open}`);
			}
	};

	requestAnimationFrame(handleMutation); // Initial run
	new MutationObserver(handleMutation).observe(document, {
		attributeFilter: ["open"],
		attributes: true,
		childList: true,
		subtree: true,
	});
}
