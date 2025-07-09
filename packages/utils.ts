export const IS_BROWSER =
	typeof window !== "undefined" &&
	typeof window.document !== "undefined" &&
	typeof window.navigator !== "undefined";

// Bad, but needed
export const IS_ANDROID = IS_BROWSER && /android/i.test(navigator.userAgent);
export const IS_FIREFOX = IS_BROWSER && /firefox/i.test(navigator.userAgent);
export const IS_IOS =
	IS_BROWSER && /iPad|iPhone|iPod/.test(navigator.userAgent);
export const IS_SAFARI =
	IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const IS_MAC =
	IS_BROWSER &&
	// @ts-expect-error Typescript has not implemented userAgentData yet https://stackoverflow.com/a/71392474
	/^Mac/i.test(navigator.userAgentData?.platform || navigator.platform);

// Constants for better compression and control
export const SAFE_LABELLEDBY = `${IS_ANDROID ? "data" : "aria"}-labelledby`; // Android <=13 incorrectly reads labelledby instead of content
export const DISPLAY_BLOCK = ":host(:not([hidden])) { display: block }";
export const FOCUS_OUTLINE =
	"outline: 1px dotted; outline: 5px auto Highlight; outline: 5px auto -webkit-focus-ring-color"; // Outline styles in order: fallback, Mozilla, WebKit

// UHTMLElement definition to use on Node, as server does not have HTMLElement
export const UHTMLElement =
	typeof HTMLElement === "undefined"
		? (class {} as typeof HTMLElement)
		: HTMLElement;

/**
 * attr
 * @description Utility to quickly get, set and remove attributes
 * @param el The Element to use as EventTarget
 * @param name The attribute name to get, set or remove, or a object to set multiple attributes
 * @param value A valid attribute value or null to remove attribute
 */
export function attr(
	el: Element,
	name: string,
	value?: string | null,
): string | null {
	if (value === undefined) return el.getAttribute(name);
	if (value === null) el.removeAttribute(name);
	else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
	return null;
}

// Internal helper for on / off
const events = (
	action: "add" | "remove",
	element: Node | Window,
	rest: Parameters<typeof Element.prototype.addEventListener>,
): void => {
	for (const type of rest[0].split(",")) {
		rest[0] = type;
		Element.prototype[`${action}EventListener`].apply(element, rest);
	}
};

/**
 * on
 * @param element The Element to use as EventTarget
 * @param types A comma separated string of event types
 * @param listener An event listener function or listener object
 */
export const on = (
	element: Node | Window,
	...rest: Parameters<typeof Element.prototype.addEventListener>
): void => events("add", element, rest);

/**
 * off
 * @param element The Element to use as EventTarget
 * @param types A comma separated string of event types
 * @param listener An event listener function or listener object
 */
export const off = (
	element: Node | Window,
	...rest: Parameters<typeof Element.prototype.removeEventListener>
): void => events("remove", element, rest);

/**
 * style
 * @param element The Element to scope styles for
 * @param css The css to inject
 */
export const attachStyle = (element: Element, css: string) =>
	element.attachShadow({ mode: "open" }).append(
		createElement("slot"), // Unnamed slot does automatically render all top element nodes
		createElement("style", css),
	);

/**
 * mutationObserver
 * @param element The Element to use as EventTarget
 * @param listener An event listener object, false to disconnect or undefined to retrieve mutation observer
 */
const observers = new WeakMap();
export const mutationObserver = (
	element: Element & EventListenerObject,
	options?: MutationObserverInit | false,
) => {
	if (options === undefined) return observers.get(element);
	try {
		observers.get(element).disconnect(); // Always unbind previous listener
		observers.delete(element);
	} catch (_err) {
		// Could not unmount since element is removed
	}
	if (options) {
		const observer = new MutationObserver((detail) =>
			element.handleEvent({ type: "mutation", detail } as CustomEvent),
		);
		observer.observe(element, options);
		observers.set(element, observer);
	}
};

/**
 * asButton
 * @description Helper to forward Enter and Space keyboard events to click events (typically used on role="button")
 * @param event Any event object
 * @return Whether the event should be forwarded to a click
 */
export const asButton = (event: Event): boolean => {
	const isClick =
		"key" in event && (event.key === " " || event.key === "Enter");
	if (isClick) event.preventDefault(); // Prevent scroll
	if (isClick && event.target instanceof HTMLElement) event.target.click(); // Forward to real click
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
 * useId
 * @return A generated unique ID
 */
let id = 0;
export const useId = (el?: Element | null) => {
	if (!el) return "";
	if (!el.id) el.id = `:${el.nodeName.toLowerCase()}${(++id).toString(32)}`;
	return el.id;
};

/**
 * createElement
 * @description creates element and assigns properties
 * @param taName The tagname of element to create
 * @param props Optional properties to add to the element
 * @return HTMLElement with props
 */
export const createElement = <TagName extends keyof HTMLElementTagNameMap>(
	tagName: TagName,
	text?: string | null,
	attrs?: Record<string, string>,
): HTMLElementTagNameMap[TagName] => {
	const el = document.createElement(tagName);
	if (text) el.textContent = text;
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

/**
 * getLabel
 * @description Get the screen reader label or an element from aria-label, aria-labelledby or <label> elements
 * @param element The target element to get accessible label from
 * @return string
 */
export const getLabel = (el: Element) => {
	const root = getRoot(el); // Might not return document, so can not use root.getElementById
	const label = attr(el, "aria-label") || "";
	const labels = attr(el, "aria-labelledby")?.trim().split(/\s+/) || [];
	return [
		...labels.map((id) => root?.querySelector<HTMLElement>(`[id="${id}"]`)), // Get all labelledby elements
		...Array.from((el as HTMLInputElement).labels || []), // Get all <label> elements
	].reduce((acc, el) => acc || el?.innerText?.trim() || "", label);
};

/**
 * speak
 * @description Creates a aria-live element for announcements
 * @param text Optional text to announce
 */
let LIVE: HTMLElement;
let LIVE_SR_FIX = 0; // Ensure screen reader announcing by alternating non-breaking-space suffix
export const speak = (text?: string) => {
	if (!LIVE) {
		LIVE = createElement("div");
		LIVE.style.cssText =
			"position:fixed;overflow:hidden;width:1px;white-space:nowrap";
		attr(LIVE, "aria-live", "assertive");
	}
	if (!LIVE.isConnected) document.body.append(LIVE);
	if (text) LIVE.textContent = `${text}${LIVE_SR_FIX++ % 2 ? "\u{A0}" : ""}`; // Non-breaking space to ensure screen reader announces
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

// Prevent loosing focus on mousedown on <data> despite tabIndex -1
let IS_PRESS = false;
export const isMouseDown = (event?: Event) => {
	if (event?.type === "mouseup") IS_PRESS = false;
	if (event?.type === "mousedown") {
		IS_PRESS = true;
		on(document, "mouseup", isMouseDown, { once: true }); // Mousedown is "composed" so it also bubbles from ShadowDOM up to document
	}
	return IS_PRESS;
};
