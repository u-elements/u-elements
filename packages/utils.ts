export const IS_BROWSER =
	typeof window !== "undefined" &&
	typeof window.document !== "undefined" &&
	typeof window.navigator !== "undefined";

// Bad, but needed
const agent = IS_BROWSER ? navigator.userAgent : "";
export const IS_ANDROID = /android/i.test(agent);
export const IS_FIREFOX = /firefox/i.test(agent);
export const IS_IOS = /iPad|iPhone|iPod/.test(agent);
export const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(agent);
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
	if (value === undefined) return el.getAttribute(name) ?? null; // Fallback to null only if el is undefined
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

export function debounce<T extends unknown[]>(
	callback: (...args: T) => void,
	delay: number,
) {
	let timer: ReturnType<typeof setTimeout>;

	return function (this: unknown, ...args: T) {
		clearTimeout(timer);
		timer = setTimeout(() => callback.apply(this, args), delay);
	};
}

/**
 * attachStyle
 * @param el The Element to scope styles for
 * @param css The css to inject
 */
export const attachStyle = (el: Element, css: string) => {
	if (!el.shadowRoot) el.attachShadow({ mode: "open" }).append(tag("slot"));
	if (SUPPORTS_CONSTRUCTED_CSS) {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(css);
		(el.shadowRoot as ShadowRoot).adoptedStyleSheets = [sheet];
	} else el.shadowRoot?.append(tag("style", undefined, css));
};

/**
 * Speed up MutationObserver by debouncing and only running when page is visible
 * @return new MutaionObserver
 */
export const onMutation = (
	el: Node,
	callback: (mutations: MutationRecord[], observer: MutationObserver) => void,
	options: MutationObserverInit,
) => {
	const queue: MutationRecord[] = [];
	const clear = () => (queue.length = 0);
	const onFrame = () => {
		if (!el.isConnected) return cleanup(); // If using JSDOM, the document might have been removed
		callback(queue, observer);
		cleanup.takeRecords();
	};
	const observer = new MutationObserver((mutations) => {
		if (!queue.length) requestAnimationFrame(onFrame); // requestAnimationFrame only runs when page is visible
		queue.push(...mutations);
	});
	const cleanup = () => clear() || observer.disconnect();
	cleanup.takeRecords = () => clear() || observer.takeRecords();
	observer.observe(el, options);
	requestAnimationFrame(onFrame); // Initial run when page is visible and rendered
	return cleanup;
};

/**
 * asButton
 * @description Helper to forward Enter and Space keyboard events to click events (typically used on role="button")
 * @param event Any event object
 * @return Whether the event should be forwarded to a click
 */
export const asButton = (event: Partial<KeyboardEvent>): boolean => {
	const isClick = event.key === " " || event.key === "Enter";
	if (isClick) event.preventDefault?.(); // Prevent scroll
	if (isClick && event.target instanceof HTMLElement)
		event.target.dispatchEvent(new MouseEvent("click", event)); // Forward to real click
	return isClick;
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
 * @description Helper to get focused element within same root
 * @param node The target node
 * @return The root document fragment or shadow root
 */
export const getFocused = (node: Node): Element | null =>
	getRoot(node).activeElement;

/**
 * getLabel
 * @description Get the screen reader label or an element from aria-label, aria-labelledby or <label> elements
 * @param element The target element to get accessible label from
 * @return string
 */
export const getLabel = (el: Element) => {
	const label = attr(el, "aria-label") || "";
	const labels = attr(el, "aria-labelledby")?.split(" ") || [];
	return [
		...labels.map((id) => document.getElementById(id.trim() || "-")), // Get all labelledby elements
		...Array.from((el as HTMLInputElement).labels || []), // Get all <label> elements
	].reduce((acc, el) => acc || el?.innerText?.trim() || "", label);
};

/**
 * useId
 * @return A generated unique ID
 */
let id = 0;
export const useId = (el?: Element | null) => {
	if (!el) return null;
	if (!el.id) el.id = `:${el.nodeName.toLowerCase()}${(++id).toString(32)}`;
	return el.id;
};

/**
 * tag
 * @description creates element and assigns properties
 * @param taName The tagname of element to create
 * @param props Optional properties to add to the element
 * @return HTMLElement with props
 */
export const tag = <TagName extends keyof HTMLElementTagNameMap>(
	tagName: TagName,
	attrs?: Record<string, string>,
	content?: string | null,
): HTMLElementTagNameMap[TagName] => {
	const el = document.createElement(tagName);
	if (content) el.textContent = content;
	if (attrs) for (const [key, val] of Object.entries(attrs)) attr(el, key, val);
	return el;
};

/**
 * customElements.define
 * @description Defines a customElement if running in browser and if not already registered
 * Scoped/named "customElements.define" so @custom-elements-manifest/analyzer can find tag names
 */
export const customElements = {
	define: (name: string, instance: CustomElementConstructor) =>
		!IS_BROWSER ||
		window.customElements.get(name) ||
		window.customElements.define(name, instance),
};

// Trigger value change in React compatible manor https://stackoverflow.com/a/46012210
export const setValue = (input: HTMLInputElement, data: string, type = "") => {
	const event = { bubbles: true, composed: true, data, inputType: type };
	const proto = HTMLInputElement.prototype;

	input.dispatchEvent(new InputEvent("beforeinput", event));
	Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(input, data);
	input.dispatchEvent(new InputEvent("input", event));
	input.dispatchEvent(new Event("change", { bubbles: true }));
};

/**
 * isPointerDown
 * @description Prevent unwanted "blur" events when pressing something with tabIndex=-1
 * @param {Event} [event] Optional event to set mousedown/up state
 * @return {boolean} Whether mouse is currently down
 */
// Prevent loosing focus on mousedown on <data> despite tabIndex -1
let IS_PRESS = false;
export const isPointerDown = (e?: Event) => {
	if (e?.type === "pointerup") IS_PRESS = false;
	if (e?.type === "pointerdown") {
		IS_PRESS = true;
		on(document, "pointerup", isPointerDown, EVENT_ONCE); // pointerup is "composed" so it also bubbles from ShadowDOM up to document
	}
	return IS_PRESS;
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
 * @description Temporarily removes form association on input to prevent form submission, without preventing event
 * @param {HTMLInputElement} input Input element to prevent submit on
 */
export const preventSubmit = (input: HTMLInputElement) => {
	const form = attr(input, "form");
	attr(input, "form", "#"); // Temporarily remove form association to prevent submit on enter
	requestAnimationFrame(() => attr(input, "form", form)); // Restore form association on next frame
};

/**
 * getText
 * @description Get text content of a node, trimmed and with fallback to empty string
 * @param {Node} el Element to get text from
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
	clearTimeout(LIVE_CLEAR);
	if (!LIVE) {
		LIVE = tag("div", { "aria-live": "assertive" });
		LIVE.style.overflow = "hidden";
		LIVE.style.position = "fixed";
		LIVE.style.whiteSpace = "nowrap";
		LIVE.style.width = "1px";
	}
	if (!LIVE.isConnected) document.body.append(LIVE);
	if (text === "") LIVE.textContent = ""; // Clear announcement immediately if empty string
	if (text) {
		LIVE.textContent = `${text}${LIVE_SR_FIX++ % 2 ? "\u{A0}" : ""}`; // Non-breaking space to ensure screen reader announces
		LIVE_CLEAR = setTimeout(speak, !IS_MAC && IS_FIREFOX ? 2000 : 300, ""); // Clear after 300ms to allow announcement, but prevent screen reader from finding the text in <body>
	}
	// Note: Narrator has a minor "hiccup" when using aria-live, as it starts announcing native commands first
	// Note: Firefox with NVDA needs 2000ms to fully announce
};
