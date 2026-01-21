import { attr, IS_ANDROID, IS_BROWSER, IS_FIREFOX } from "../utils";

// Polyfill for Android Firefox + Talkback which does announce role or state of details/summary
if (IS_BROWSER && IS_ANDROID && IS_FIREFOX) {
	const summarys = document.getElementsByTagName("summary");
	const handleMutation = () => {
		for (const summary of summarys) {
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
