export const isBrowser = () =>
	typeof window !== "undefined" &&
	typeof window.document !== "undefined" &&
	typeof window.navigator !== "undefined"; // Dynamic since Jest+jsdom tests can unmount document live

// Bad, but needed
const IS_BROWSER = isBrowser(); // Cache this since it's used in many places and can be dynamic in tests
const AGENT = IS_BROWSER ? navigator.userAgent : "";
export const IS_ANDROID = /android/i.test(AGENT);
export const IS_FIREFOX = /firefox/i.test(AGENT);
export const IS_IOS = /iPad|iPhone|iPod/.test(AGENT);
export const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(AGENT);
export const IS_MAC =
	IS_BROWSER &&
	// @ts-expect-error Typescript has not implemented userAgentData yet https://stackoverflow.com/a/71392474
	/^Mac/i.test(navigator.userAgentData?.platform || navigator.platform);

export const SUPPORTS_CONSTRUCTED_CSS =
	IS_BROWSER && window.CSSStyleSheet && document.adoptedStyleSheets;

// Constants for better compression and control
export const EVENT_ONCE = { once: true, capture: true, passive: true };
export const DISPLAY_BLOCK = ":host(:not([hidden])) { display: block }";
export const FOCUS_OUTLINE = `outline: 1px dotted; outline: 5px auto Highlight; outline: 5px auto -webkit-focus-ring-color`; // Outline styles in order: fallback, Mozilla, WebKit
export const SAFE_LABELLEDBY = `${IS_ANDROID ? "data" : "aria"}-labelledby`; // Android <=13 incorrectly reads labelledby instead of content
export const SAFE_MULTISELECTABLE = `${IS_ANDROID ? "data" : "aria"}-multiselectable`; // Android TalkBack does not fully support aria-multiselectable

// UHTMLElement definition to use on Node, as server does not have HTMLElement
export const UHTMLElement =
	typeof HTMLElement === "undefined"
		? (class {} as typeof HTMLElement)
		: HTMLElement;

/**
 * attr
 * @description Utility to quickly get, set and remove attributes
 * @param el The Element to read/write attributes from
 * @param name The attribute name to get, set or remove, or a object to set multiple attributes
 * @param value A valid attribute value or null to remove attribute
 */
export const attr = (
	el: Element,
	name: string,
	value?: string | null,
): string | null => {
	if (value === undefined) return el.getAttribute(name);
	if (value === null) el.removeAttribute(name);
	else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
	return null;
};

/**
 * on
 * @param el The Element to use as EventTarget
 * @param types A space separated string of event types
 * @param listener An event listener function or listener object
 */
export const on = (
	el: Node | Window | ShadowRoot,
	...rest: Parameters<typeof Element.prototype.addEventListener>
): (() => void) => {
	const [types, ...options] = rest;
	for (const type of types.split(" ")) el.addEventListener(type, ...options);
	return () => off(el, ...rest);
};

/**
 * off
 * @param el The Element to use as EventTarget
 * @param types A space separated string of event types
 * @param listener An event listener function or listener object
 */
export const off = (
	el: Node | Window | ShadowRoot,
	...rest: Parameters<typeof Element.prototype.removeEventListener>
): void => {
	const [types, ...options] = rest;
	for (const type of types.split(" ")) el.removeEventListener(type, ...options);
};

/**
 * attachStyle
 * @param el The Element to scope styles for
 * @param css The css to inject
 */
export const attachStyle = (el: Element, css: string) => {
	const root = el.shadowRoot || el.attachShadow({ mode: "open" }); // Respects Declarative Shadow DOM
	if (!root.querySelector("slot")) root.appendChild(tag("slot"));
	if (!root.querySelector("style")) {
		if (!SUPPORTS_CONSTRUCTED_CSS) root.appendChild(tag("style", null, css));
		else {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(css);
			root.adoptedStyleSheets = [sheet];
		}
	}
	return root;
};

/**
 * MutationObserver wrapper with automatic cleanup
 * @return new MutationObserver
 */
export const onMutation = <T extends Node>(
	el: T,
	callback: (el: T, records?: MutationRecord[]) => void,
	options: MutationObserverInit,
) => {
	const observer = new MutationObserver((records) => {
		if (!isBrowser() || !el.isConnected) return cleanup(); // Stop observing if element is removed from DOM or document is removed by JSDOM tests
		callback(el, records);
	});
	const cleanup = Object.assign(() => observer.disconnect(), {
		takeRecords: () => observer.takeRecords(), // Expose takeRecords - useful if mutating a attribute that is observed
	});
	callback(el); // Initial is run instantly to make test markup predictable
	observer.observe(el, options); // Observe after initial callback to avoid additional triggering
	return cleanup;
};

/**
 * getRoot
 * @description Helper for better compatibility
 * @param node The target node
 * @return The root document fragment or shadow root
 */
export const getRoot = (node: Node): Document | ShadowRoot => {
	const root = node.getRootNode?.() || node.ownerDocument;
	return root instanceof Document || root instanceof ShadowRoot
		? root
		: document;
};

/**
 * getFocusedElement
 * @description Helper to get focused element, since testing environments such as jest/jsdom does not support .matches(":focus") or .matches(":focus-within")
 * @param node The target node
 * @return The Element with focus in the current root
 */
export const getFocused = (node: Node) => getRoot(node).activeElement;

/**
 * getInputLabel
 * @description Get the screen reader label or an element from aria-label, aria-labelledby or <label> elements
 * @param element The target element to get accessible label from
 * @return string
 */
export const getInputLabel = (el: Element) => {
	const label = attr(el, "aria-label") || "";
	const labels = attr(el, "aria-labelledby")?.split(" ") || [];
	return [
		...labels.map((id) => document.getElementById(id.trim() || "-")), // Get all labelledby elements
		...Array.from((el as HTMLInputElement).labels || []), // Get all <label> elements
	]
		.reduce((acc, el) => acc || el?.innerText?.trim() || "", label)
		.trim();
};

/**
 * useId
 * @return A generated unique ID
 */
declare global {
	interface Window {
		uElementsId?: Record<string, number>; // Use a global counter to ensure this works even when loading designsystemet multiple times
	}
}

export const useId = (el?: Element | null) => {
	if (!el || !IS_BROWSER) return null;
	if (!window.uElementsId) window.uElementsId = {}; // In case of multiple instances of utils, ensure global counter
	if (!el.id) {
		const node = el.nodeName.toLowerCase();
		if (!window.uElementsId[node]) window.uElementsId[node] = 1;
		el.id = `:${node}${window.uElementsId[node]++}`;
	}
	return el.id;
};

/**
 * tag
 * @description creates element and assigns properties
 * @param taName The tagname of element to create
 * @param props Optional properties to add to the element
 * @return HTMLElement with props
 */
const hasOwn = IS_BROWSER ? Object.prototype.hasOwnProperty : () => false;
export const tag = <TagName extends keyof HTMLElementTagNameMap>(
	tagName: TagName,
	attrs?: Record<string, string> | null,
	content?: string | null,
): HTMLElementTagNameMap[TagName] => {
	const el = document.createElement(tagName);
	if (content) el.textContent = content;
	if (attrs)
		for (const key in attrs)
			if (hasOwn.call(attrs, key)) attr(el, key, attrs[key]);
	return el;
};

/**
 * customElements.define
 * @description Defines a customElement if running in browser and if not already registered
 * Scoped/named "customElements.define" so @custom-elements-manifest/analyzer can find tag names
 */
export const customElements = {
	define: (name: string, instance: CustomElementConstructor) =>
		!isBrowser() ||
		window.customElements.get(name) ||
		window.customElements.define(name, instance),
};

/**
 * dispatchChange
 * @description Dispatch change like the browser does when a user commits a value
 * @param {HTMLInputElement} input Input element to dispatch change on
 */
export const dispatchChange = (input: HTMLInputElement) =>
	input.dispatchEvent(new Event("change", { bubbles: true }));

/**
 * setValue
 * @description Set input value like the browser does on user input
 * @param {HTMLInputElement} input Input element to set value on
 * @param {string} data The new value
 * @param {inputType} type of the new event, pass false if silent. Required, as an empty inputType is what picks from <u-datalist> before 2.0.3 look like
 * @param {boolean} change Whether to dispatch change after input. Defaults to true unless silent. Pass false for syncs that are not user commits (i.e. mount, programmatic item changes, form reset).
 * Like the browser, change is only dispatched if the value differs from the text as of the last change: the value before the write, or the value at a change an input handler
 * dispatched meanwhile. An input handler may revert the write (i.e. <u-combobox> reverting a datalist pick), or rewrite it and commit it itself (i.e. <u-combobox> syncing a re-picked item)
 * @param {boolean} cancelable Whether a consumer can prevent beforeinput to reject the edit, like the native event. Defaults to true.
 * Pass false for writes that mirror already confirmed state (i.e. <u-combobox> syncing the input to its item), as the veto point for those is the select, not the edit
 * @return {boolean} false if a consumer prevented beforeinput, in which case the value is left untouched and no input or change is dispatched
 */
// Trigger value change in React compatible manner https://stackoverflow.com/a/46012210
export const setValue = (
	input: HTMLInputElement,
	data: string,
	type: string | false,
	change = type !== false,
	cancelable = true,
) => {
	const silent = type === false;
	const event = { bubbles: true, composed: true, data, inputType: type || "" };
	const before = { ...event, cancelable }; // beforeinput is cancelable like the native event, so a consumer can reject the edit
	const inputType = input.selectionEnd === null && input.type; // Input types without selection support (i.e. 'email', 'number', 'date') do not support setRangeText, so temporarily switch to text
	let last = input.value; // Text as of the last change, like the browser tracks it: the value before the write, or the value at a change dispatched by an input handler
	const onChange = () => {
		last = input.value;
	};

	if (!silent && !input.dispatchEvent(new InputEvent("beforeinput", before)))
		return false;
	if (inputType) input.type = "text";
	input.setRangeText(data, 0, input.value.length, "end"); // Using setRangeText to not touch HTMLInputElement.prototype, aligning with browser standard
	if (inputType) input.type = inputType; // Revert to original input type
	if (!silent) {
		input.addEventListener("change", onChange, true); // Capture, so a change stopped by a handler on the input still counts
		input.dispatchEvent(new InputEvent("input", event));
		input.removeEventListener("change", onChange, true);
	}
	if (change && input.value !== last) dispatchChange(input); // Only if the value ended up changed, as an input handler may have reverted it, or already dispatched change for it
	return true;
};

/**
 * onFocusLeave
 * @description Run callback once focus has left, also after a press inside that is released outside without a click.
 * Pressing something inside with tabindex="-1" blurs before the click refocuses, so a press defers the check until
 * pointerup or pointercancel, then one tick, letting the click refocus first. A drag out releases without a click and still runs the check
 * @param {Node} el Element or root to listen on. Also what counts as inside, unless isInside is given
 * @param {Function} fn Runs when the focused element is no longer inside
 * @param {Function} [isInside] Optional predicate, i.e. to also count a connected input outside el
 * @return {Function} Cleanup function unbinding the listeners
 */
export const onFocusLeave = (
	el: Node,
	fn: () => void,
	isInside = (node: Node | null) => el.contains(node),
) => {
	let hasBlurred: true | undefined; // focusout inside happened while pressed, so check once the press ends
	let unPress: (() => void) | undefined; // Between pointerdown inside and pointerup or pointercancel
	const check = () => setTimeout(() => isInside(getFocused(el)) || fn(), 0); // Delay to allow focus to be set on new element
	const cancel = () => {
		if (hasBlurred) check();
		unPress?.();
		unPress = hasBlurred = undefined;
	};
	const handle = (e: Event) => {
		if (!isInside(e.target as Node)) return; // Only presses and blurs inside count
		if (e.type === "focusout") {
			if (!unPress) check();
			else hasBlurred = true; // Defer check to the end of the press
		} else if (!unPress)
			unPress = on(document, "pointerup pointercancel", cancel, EVENT_ONCE);
	};
	const unHandle = on(el, "pointerdown focusout", handle, true); // Capture, as focusout of a descendant is handled before frameworks and the datalist
	return () => {
		unHandle();
		unPress?.();
	};
};

/**
 * declarativeShadowRoot
 * @description Helper to create a declarative shadow root template string
 * @param {string} style CSS string to inject in shadow root
 * @param {string} slot Optional slot markup to include in shadow root, defaults to <slot></slot>
 * @return {string} Template string for declarative shadow root
 */
export const declarativeShadowRoot = (style: string, slot = "<slot></slot>") =>
	`<template shadowrootmode="open">${slot}<style>${style}</style></template>`;

/**
 * preventSubmit
 * @description Temporarily removes form association on input to prevent form submission, without preventing event.
 * Note: input.form is null while the association is removed (16ms). This is intentional, as Firefox submits if restored earlier
 * @param {HTMLInputElement} input Input element to prevent submit on
 */
export const preventSubmit = (input: HTMLInputElement) => {
	const form = attr(input, "form");
	if (form === "#") return; // If holding Enter, avoid restoring # value
	attr(input, "form", "#"); // Temporarily remove form association to prevent submit on enter
	setTimeout(restoreSubmit, 16, input, form); // Restore form association on after 16ms (Firefox needs the delay)
};
const restoreSubmit = (input: HTMLInputElement, form: string | null) =>
	attr(input, "form", form);

/**
 * getText
 * @description Get text content of a node, trimmed and with fallback to empty string
 * @param {Node | null | undefined} el Element to get text from
 * @return {string} Trimmed text content or empty string
 */
export const getText = (el?: Node | null) => el?.textContent?.trim() || "";

/**
 * speak
 * @description Creates a aria-live element for announcements. Needed since VO is flaky on announcing aria-live inside ShadowDOM
 * @param {string} text Optional text to announce
 */
let LIVE: HTMLElement;
let LIVE_SR_FIX = 0; // Ensure screen reader announcing by alternating non-breaking-space suffix
let LIVE_CLEAR: ReturnType<typeof setTimeout> | number = 0;
export const speak = (text?: string) => {
	if (!LIVE) {
		LIVE = tag("div", { "aria-live": "assertive" });
		LIVE.style.overflow = "hidden";
		LIVE.style.position = "fixed";
		LIVE.style.whiteSpace = "nowrap";
		LIVE.style.width = "1px";
	}
	if (!LIVE.isConnected) document.body.appendChild(LIVE);
	if (text === undefined) return; // Only prepare the live region, keep any pending clear so a previous announcement does not stay in <body>
	clearTimeout(LIVE_CLEAR);
	if (text === "") LIVE.textContent = ""; // Clear announcement immediately if empty string
	if (text) {
		LIVE.textContent = `${text}${LIVE_SR_FIX++ % 2 ? "\u{A0}" : ""}`; // Non-breaking space to ensure screen reader announces
		LIVE_CLEAR = setTimeout(speak, !IS_MAC && IS_FIREFOX ? 2000 : 300, ""); // Clear after 300ms to allow announcement, but prevent screen reader from finding the text in <body>
	}
	// Note: Narrator has a minor "hiccup" when using aria-live, as it starts announcing native commands first
	// Note: Firefox with NVDA needs 2000ms to fully announce
};

/**
 * afterRender
 * @description Run after frameworks have rendered asynchronously.
 * Vue, Svelte and Angular render in the next microtask, while React queue rendering by posting to MessageChannel in the next microtask.
 * Waiting one microtask and then posting to MessageChannel, ensures compatibility with all frameworks.
 * setTimeout and requestAnimationFrame does not guarantee ordering, and can therefore be unreliable with React.
 * @param {void} callback
 */
const RENDER_QUEUE: (() => void)[] = []; // One callback per posted message, so each keeps its own place after the renders queued before it
let RENDER_PORT: MessagePort | undefined; // Shared channel, created on first use so SSR never touches MessageChannel
export const afterRender = (callback: () => void) => {
	if (!RENDER_PORT) {
		const { port1, port2 } = new MessageChannel();
		port1.onmessage = () => RENDER_QUEUE.shift()?.(); // Messages arrive in post order, so the oldest callback is always the one posted for
		RENDER_PORT = port2;
	}
	RENDER_QUEUE.push(callback);
	Promise.resolve().then(() => RENDER_PORT?.postMessage(0));
};
