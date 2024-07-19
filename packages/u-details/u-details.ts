import {
  DISPLAY_BLOCK,
  UHTMLElement,
  asButton,
  createElement,
  customElements,
  getRoot,
  off,
  on
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-details': HTMLDetailsElement
    'u-summary': HTMLElement
  }
}

// Constants for better compression
const OPEN = 'open'
const USUMMARY_TAG = 'U-SUMMARY'

/**
 * The `<u-details>` HTML element creates a disclosure widget in which information is visible only when the widget is toggled into an "open" state. A summary or label must be provided using the `<u-summary>` element.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details)
 */
export class UHTMLDetailsElement extends UHTMLElement {
  #content: HTMLSlotElement
  static observedAttributes = [OPEN]
  constructor() {
    super()
    this.attachShadow({ mode: 'closed' }).append(
      createElement('slot', { name: 'summary' }), // Summary slot
      (this.#content = createElement('slot')), // Content slot
      createElement('style', {
        textContent: `
        ${DISPLAY_BLOCK}
        ::slotted(u-summary) { cursor: pointer; display: list-item; counter-increment: list-item 0; list-style: disclosure-closed inside }
        ::slotted(u-summary[aria-expanded="true"]) { list-style-type: disclosure-open }
      `
      })
    )
  }
  connectedCallback() {
    on(this.#content, 'beforematch', this) // Open if browsers Find in page reveals content
    on(this, 'click,keydown', this)
    this.attributeChangedCallback() // We now know the element is in the DOM, so run a attribute setup
  }
  disconnectedCallback() {
    off(this.#content, 'beforematch', this)
    off(this, 'click,keydown', this)
  }
  attributeChangedCallback(prop?: string, prev?: string, next?: string) {
    const hide = 'onbeforematch' in this ? 'until-found' : true // Use "until-found" if supported
    const open = this[OPEN] // Cache for speed

    Array.from(this.children, (el) => {
      if (el.nodeName === USUMMARY_TAG) el.ariaExpanded = `${open}`
    })

    this.#content.ariaHidden = `${!open}` // Needed to prevent announcing "group" when closed in Chrome on Mac
    this.#content.hidden = open ? false : (hide as boolean) // Make typescript accept "until-found"

    // Make <slot> display: block when hidden so content-visibility: hidden works
    if (hide === 'until-found')
      this.#content.style.display = open ? '' : 'block'

    // Close other u-details with same name
    if (open && this.name)
      getRoot(this)
        .querySelectorAll<UHTMLDetailsElement>(
          `${this.nodeName}[name="${this.name}"]`
        )
        .forEach((uDetails) => uDetails === this || (uDetails[OPEN] = false))

    // Trigger toggle event if change of open state
    // Comparing null version of prev and next since open attribute is truthy for "", "true" etc.
    if (prop === OPEN && (prev === null) !== (next === null))
      this.dispatchEvent(new Event('toggle'))
  }
  handleEvent(event: Event) {
    const summary = this.querySelector('u-summary')
    const isSummary = summary?.contains(event.target as Node)

    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'beforematch') this[OPEN] = true
    if (isSummary && event.type === 'keydown') asButton(event)
    if (isSummary && event.type === 'click') this[OPEN] = !this[OPEN]
  }
  get open(): boolean {
    return this.hasAttribute('open')
  }
  set open(open) {
    this.toggleAttribute('open', open)
  }
  get name(): string {
    return this.getAttribute('name') || ''
  }
  set name(value: string) {
    this.setAttribute('name', value)
  }
}

/**
 * The `<u-summary>` HTML element specifies a summary, caption, or legend for a `<u-details>` element's disclosure box. Clicking the `<u-summary>` element toggles the state of the parent `<u-details>` element open and closed.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)
 */
export class UHTMLSummaryElement extends UHTMLElement {
  connectedCallback() {
    this.role = 'button'
    this.slot = 'summary'
    this.tabIndex = 0
  }
}

customElements.define('u-details', UHTMLDetailsElement)
customElements.define('u-summary', UHTMLSummaryElement)
