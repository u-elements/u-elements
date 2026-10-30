export const isBrowser = () =>
	typeof window !== "undefined" &&
	typeof window.document !== "undefined" &&
	typeof window.navigator !== "undefined"; // Dynamic since Jest+jsdom tests can unmount document live

// Bad, but needed
const IS_BROWSER = isBrowser(); // Cache this since it's used in many places and can be dynamic in tests
const AGENT = IS_BROWSER ? navigator.userAgent : "";
const IS_SAMSUNGINTERNET = /samsungbrowser/i.test(AGENT); // Samsung Internet on Android
export const IS_ANDROID = /android/i.test(AGENT);
export const IS_FIREFOX = /firefox/i.test(AGENT);
export const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(AGENT);
export const IS_IOS =
	/iPad|iPhone|iPod/.test(AGENT) ||
	(/Macintosh/.test(AGENT) && IS_BROWSER && navigator.maxTouchPoints > 1); // iPadOS 13+ sends a Mac user agent by default
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
 * getFocused
 * @description Helper to get focused element, since testing environments such as jest/jsdom does not support .matches(":focus") or .matches(":focus-within")
 * @param node The target node
 * @return The Element with focus in the current root
 */
export const getFocused = (node: Node) => getRoot(node).activeElement;

/**
 * getInputLabel
 * @description Get the screen reader label of an element from aria-labelledby, aria-label or <label> elements, in that order like the accessible name computation
 * @param element The target element to get accessible label from
 * @param label Optional aria-label to use instead of the attribute, i.e. when the element rewrites it. Pass null for none
 * @param labelledby Optional aria-labelledby to use instead of the attribute, i.e. when the element removes it. Pass null for none
 * @return string
 */
export const getInputLabel = (
	el: Element,
	label = attr(el, "aria-label"),
	by = attr(el, "aria-labelledby"),
) =>
	[
		join(by?.split(" ").map((id) => text(getById(el, id)))),
		label?.trim(),
		join(Array.from((el as HTMLInputElement).labels || [], text)),
	].find(Boolean) || "";
// biome-ignore lint: using innerText to only get visual text
const text = (el?: HTMLElement | null) => el?.innerText?.trim() || "";
const join = (texts?: string[]) => texts?.filter(Boolean).join(" ");
const getById = (el: Element, id: string) =>
	getRoot(el).getElementById(id.trim() || "-");

/**
 * useId
 * @return A generated unique ID
 */
declare global {
	interface Window {
		uElementsId?: Record<string, number>; // Use a global counter to ensure this works even when loading multiple packages
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
 * @param {string} value The new value
 * @param {string} [inputType] The inputType of the input event. Omit to never trigger input event
 * @param {boolean} [change] Whether to dispatch change after input, but is skipped if input is reverted
 */
declare global {
	interface Window {
		_uSetValue?: boolean; // true while setValue writes, so u-combobox can tell it from a programmatic write. On window, as each package bundles its own utils.
	}
}

export const setValue = (
	input: HTMLInputElement,
	value: string,
	inputType?: string,
	change?: boolean,
) => {
	let last = input.value; // Text as of the last change, like the browser tracks it: the value before the write, or the value at a change dispatched by an input handler
	const data = inputType === "insertText" ? value : null; // Align with web standard
	const event = { bubbles: true, composed: true, data, inputType };
	const proto = HTMLInputElement.prototype; // Using the prototype setter, as React tracks writes to input.value and would then skip onChange (https://stackoverflow.com/a/46012210)
	const onChange = () => (last = input.value);

	window._uSetValue = true;
	try {
		Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(input, value);
	} finally {
		window._uSetValue = false; // In finally, so a throw does not leave u-combobox ignoring every later programmatic write
	}
	if (inputType) {
		on(input, "change", onChange, true); // Capture, so a change stopped by a handler on the input still counts
		input.dispatchEvent(new InputEvent("input", event));
		off(input, "change", onChange, true);
	}
	if (change && input.value !== last) dispatchChange(input); // Only if the value ended up changed, as an input handler may have reverted it, or already dispatched change for it
};

/**
 * onFocusLeave
 * @description Run callback once focus has left, also after a press inside that is released outside without a click.
 * Pressing something inside with tabindex="-1" blurs before the click refocuses, so a press defers the check until
 * pointerup or pointercancel, then one tick, letting the click refocus first. A drag out releases without a click and still runs the check.
 * In Samsung Internet, focus landing on <body> does not count as leaving, as it moves keyboard focus to <body> while TalkBack is on a listbox.
 * Not on all of Android, as a tap on dead space also lands on <body>, and that must still count as leaving in Chrome
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
	let pending: ReturnType<typeof setTimeout> | undefined; // One check per settle, as two focusouts inside one task must not run fn twice
	let unPress: (() => void) | undefined; // Between pointerdown inside and pointerup or pointercancel
	const check = () => {
		clearTimeout(pending);
		pending = setTimeout(() => {
			pending = undefined;
			if (isInside(getFocused(el))) return;
			if (IS_SAMSUNGINTERNET && document.activeElement === document.body)
				return; // Focus went nowhere, see description. document.activeElement, as getFocused returns null for a shadow root when focus is outside it
			fn();
		}, 0); // Delay to allow focus to be set on new element
	};
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
		clearTimeout(pending);
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
 * getText
 * @description Get text content of a node, trimmed and with fallback to empty string
 * @param {Node | null | undefined} el Element to get text from
 * @return {string} Trimmed text content or empty string
 */
export const getText = (el?: Node | null) => el?.textContent?.trim() || "";

/**
 * srText
 * @description Get a screen reader text from the --sr-<key> CSS custom property, so consumers can translate through CSS.
 * Inherited, so a translation can be set once on :root or :lang(). The value must be a quoted string, as it is also used as alternative text in content.
 * Read on demand, as the computed style can not be observed for changes
 */
export const srText = (el: Element, key: string, fallback: string): string => {
	const value = getComputedStyle(el).getPropertyValue(`--sr-${key}`).trim();
	const quote = value[0];
	const quoted = (quote === '"' || quote === "'") && value.endsWith(quote);
	const text = quoted ? value.slice(1, -1).replace(/\\(.)/g, "$1") : value; // Unquote and unescape \" \' and \\
	return text || fallback;
};

/**
 * ariaNotify
 * @description Creates a aria-live element for announcements. Needed since VO is flaky on announcing aria-live inside ShadowDOM
 * @param {string} text Optional text to announce
 */
let LIVE: HTMLElement;
let LIVE_SR_FIX = 0; // Ensure screen reader announcing by alternating non-breaking-space suffix
let LIVE_CLEAR: ReturnType<typeof setTimeout> | number = 0;
export const ariaNotify = (text?: string) => {
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
		LIVE_CLEAR = setTimeout(ariaNotify, !IS_MAC && IS_FIREFOX ? 2000 : 300, ""); // Clear after 300ms to allow announcement, but prevent screen reader from finding the text in <body>
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
let RENDER_PORT: MessagePort | undefined; // Shared channel, created on first use so SSR never touches MessageChannel, and closed once drained
export const afterRender = (callback: () => void) => {
	if (typeof MessageChannel === "undefined") {
		Promise.resolve().then(() => setTimeout(callback)); // Fallback if JSDOM or environments without MessageChannel
		return;
	}
	if (!RENDER_PORT) {
		const { port1, port2 } = new MessageChannel();
		port1.onmessage = () => {
			const callback = RENDER_QUEUE.shift();
			if (!RENDER_QUEUE.length) {
				port1.close(); // Cleanup before callback in case callback throws.
				port2.close(); // Cleanup needed on Node (i.e. jsdom tests), as a started port keeps Node alive
				RENDER_PORT = undefined;
			}
			callback?.();
		};
		RENDER_PORT = port2;
	}
	RENDER_QUEUE.push(callback);
	Promise.resolve().then(() => RENDER_PORT?.postMessage(0));
};
