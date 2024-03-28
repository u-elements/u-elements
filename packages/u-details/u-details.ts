import {
  ARIA_EXPANDED,
  DISPLAY_BLOCK,
  UHTMLElement,
  asButton,
  attr,
  createElement,
  customElements,
  getRoot,
  mutationObserver,
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
  #summarySlot: HTMLSlotElement
  #contentSlot: HTMLSlotElement
  static get observedAttributes() {
    return [OPEN]
  }
  constructor() {
    super()
    this.attachShadow({
      mode: 'closed',
      slotAssignment: 'manual' // 'manual' slotAssignment so we also can move text nodes into slots
    }).append(
      (this.#summarySlot = createElement('slot')), // Summary slot
      (this.#contentSlot = createElement('slot')), // Content slot
      createElement('style', {
        textContent: `
        ${DISPLAY_BLOCK}
        ::slotted(u-summary) { cursor: pointer; display: list-item; counter-increment: list-item 0; list-style: disclosure-closed inside }
        ::slotted(u-summary[${ARIA_EXPANDED}="true"]) { list-style-type: disclosure-open }
      `
      })
    )
  }
  connectedCallback() {
    mutationObserver(this, { childList: true }) // Observe children to assign slots
    on(this.#contentSlot, 'beforematch', this) // Open if browsers Find in page reveals content
    this.#assignSlots()
    this.attributeChangedCallback() // We now know the element is in the DOM, so run a attribute setup
  }
  disconnectedCallback() {
    mutationObserver(this, false)
    off(this.#contentSlot, 'beforematch', this)
  }
  attributeChangedCallback(prop?: string, prev?: string, next?: string) {
    const open = this[OPEN] // Cache for speed
    const summary = [...this.children].find(
      (el) => el.nodeName === USUMMARY_TAG
    )
    const supportsHiddenUntilFound = 'onbeforematch' in this

    attr(summary, { [ARIA_EXPANDED]: open })
    attr(this.#contentSlot, {
      'aria-hidden': `${!open}`, // Needed to prevent announcing "group" when closed in Chrome on Mac
      hidden: open ? null : 'until-found' // Allows browsers to search inside content
    })

    // Make <slot> display: block when hidden so content-visibility: hidden works
    if (supportsHiddenUntilFound)
      this.#contentSlot.style.display = open ? '' : 'block'

    // Close other u-details with same name
    if (open && this.name)
      getRoot(this)
        .querySelectorAll<UHTMLDetailsElement>(
          `${this.nodeName}[name="${this.name}"]`
        )
        .forEach((uDetails) => uDetails === this || (uDetails[OPEN] = false))

    // Trigger toggle event if change of open state
    if (prop === OPEN && prev !== next) this.dispatchEvent(new Event('toggle'))
  }
  handleEvent({ type }: Event) {
    if (type === 'beforematch') this[OPEN] = true
    if (type === 'mutation') this.#assignSlots()
  }
  #assignSlots() {
    const contents: (Element | Text)[] = []
    const summarys: Element[] = []

    this.childNodes.forEach((node) => {
      if (node.nodeName === USUMMARY_TAG) summarys.push(node as Element)
      else if (node instanceof Element || node instanceof Text)
        contents.push(node)
    })

    this.#summarySlot.assign(...summarys)
    this.#contentSlot.assign(...contents)
  }
  get open(): boolean {
    return attr(this, OPEN) !== null
  }
  set open(open) {
    attr(this, OPEN, open ? '' : null)
  }
  get name(): string {
    return attr(this, 'name') || ''
  }
  set name(name) {
    attr(this, 'name', `${name}`)
  }
}

/**
 * The `<u-summary>` HTML element specifies a summary, caption, or legend for a `<u-details>` element's disclosure box. Clicking the `<u-summary>` element toggles the state of the parent `<u-details>` element open and closed.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)
 */
export class UHTMLSummaryElement extends UHTMLElement {
  connectedCallback() {
    attr(this, { role: 'button', tabIndex: 0 })
    on(this, 'click,keydown', this)
  }
  disconnectedCallback() {
    off(this, 'click,keydown', this)
  }
  handleEvent(event: CustomEvent) {
    const details = this.parentElement
    if (event.type === 'keydown') asButton(event)
    if (event.type === 'click' && details instanceof UHTMLDetailsElement)
      details[OPEN] = !details[OPEN]
  }
}

customElements.define('u-details', UHTMLDetailsElement)
customElements.define('u-summary', UHTMLSummaryElement)
