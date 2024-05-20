export const IS_BROWSER =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.navigator !== 'undefined'

// Bad, but needed
export const IS_ANDROID = IS_BROWSER && /android/i.test(navigator.userAgent)
export const IS_FIREFOX = IS_BROWSER && /firefox/i.test(navigator.userAgent)
export const IS_IOS = IS_BROWSER && /iPad|iPhone|iPod/.test(navigator.userAgent)
export const IS_SAFARI =
  IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

// Constants for better compression and control
export const SAFE_LABELLEDBY = `${IS_ANDROID ? 'data' : 'aria'}-labelledby` // Android <=13 incorrectly reads labelledby instead of content
export const SAFE_MULTISELECTABLE = `${IS_SAFARI ? 'aria' : 'data'}-multiselectable` // Use aria-multiselectable only in Safari as VoiceOver in Chrome and Firefox inncorrectly announces selected when aria-selected="false"
export const DISPLAY_BLOCK = ':host(:not([hidden])) { display: block }'
export const FOCUS_OUTLINE =
  'outline: 1px dotted; outline: 5px auto Highlight; outline: 5px auto -webkit-focus-ring-color' // Outline styles in order: fallback, Mozilla, WebKit

// UHTMLElement defintion to use on Node, as server does not have HTMLElement
export const UHTMLElement =
  typeof HTMLElement === 'undefined'
    ? (class {} as typeof HTMLElement)
    : HTMLElement

const events = (
  action: 'add' | 'remove',
  element: Node | Window,
  rest: Parameters<typeof Element.prototype.addEventListener>
): void =>
  rest[0].split(',').forEach((type) => {
    rest[0] = type
    Element.prototype[`${action}EventListener`].apply(element, rest)
  })

export const on = (
  element: Node | Window,
  ...rest: Parameters<typeof Element.prototype.addEventListener>
): void => events('add', element, rest)

export const off = (
  element: Node | Window,
  ...rest: Parameters<typeof Element.prototype.removeEventListener>
): void => events('remove', element, rest)

/**
 * style
 * @param element The Element to scope styles for
 * @param css The css to inject
 */
export const attachStyle = (element: Element, css: string) =>
  element.attachShadow({ mode: 'closed' }).append(
    createElement('slot'), // Unnamed slot does automatically render all top element nodes
    createElement('style', { textContent: css })
  )

const observers = new WeakMap()
export const mutationObserver = (
  element: Element & EventListenerObject,
  options?: MutationObserverInit | false
) => {
  if (options === undefined) return observers.get(element)
  try {
    observers.get(element).disconnect() // Allways unbind previous listener
    observers.delete(element)
  } catch (err) {
    // Could not unount since element is removed
  }
  if (options) {
    const observer = new MutationObserver((detail) =>
      element.handleEvent({ type: 'mutation', detail } as CustomEvent)
    )
    observer.observe(element, options)
    observers.set(element, observer)
  }
}

export const asButton = (event: Event): boolean => {
  const isClick = 'key' in event && (event.key === ' ' || event.key === 'Enter')
  if (isClick) event.preventDefault() // Prevent scroll
  if (isClick && event.target instanceof HTMLElement) event.target.click() // Forward to real click
  return isClick
}

/**
 * getRoot
 * @description Helper for minifying and better typescript typing
 * @param element The target object
 * @param name The event name
 * @param options Detail object (bubbles and cancelable is set to true)
 * @return Whether the event was canceled. Returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
 */
export const getRoot = (node: Node) =>
  node.getRootNode() as Document | ShadowRoot

/**
 * useId
 * @return A generated unique ID
 */
let id = 0
export const useId = (el?: Element | null) =>
  el
    ? el.id || (el.id = `:${el.nodeName.toLowerCase()}${(++id).toString(32)}`)
    : ''

/**
 * createElement
 * @description creates element and assigns properties
 * @return HTMLElement with props
 */
export const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  props?: unknown
): HTMLElementTagNameMap[TagName] =>
  Object.assign(document.createElement(tagName), props)

/**
 * customElements.define
 * @description Defines a customElement if running in browser and if not already registered
 * named customElements.define so @custom-elements-manifest/analyzer can find tag names
 */
export const customElements = {
  define: (name: string, instance: CustomElementConstructor) =>
    !IS_BROWSER ||
    window.customElements.get(name) ||
    window.customElements.define(name, instance)
}

export const getLabel = (el: Element) => {
  const root = getRoot(el) // Might not return document, so can not use root.getElementById
  const label = el.ariaLabel || ''
  const labels = el.getAttribute('aria-labelledby')?.trim().split(/\s+/) || []
  return [
    ...labels.map((id) => root.querySelector<HTMLElement>(`[id="${id}"]`)), // Get all labelledby elements
    ...Array.from((el as HTMLInputElement).labels || []) // Get all <label> elements
  ].reduce((acc, el) => acc || el?.innerText?.trim() || '', label)
}
