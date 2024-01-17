import {
  ARIA_CONTROLS,
  ARIA_EXPANDED,
  ARIA_LABELLEDBY,
  DISPLAY_BLOCK,
  asButton,
  attr,
  customElements,
  mutationObserver,
  off,
  on,
  style,
  useId
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-details': UHTMLDetailsElement
    'u-summary': UHTMLSummaryElement
  }
}

// Constants for better compression
const OPEN = 'open'

// Needs two child elements
// First element to be <u-summary>
// Second element to be <details>
// toggle event is triggered from child, not <u-details> iteself
// We can not polyfill HTMLInputElement.list as this is readOnly
// Why: details/summary does not work in iOS Safari: impossible to read state of aria-expanded
export class UHTMLDetailsElement extends HTMLElement {
  static get observedAttributes() {
    return [OPEN, 'id']
  }
  connectedCallback() {
    style(
      this,
      `${DISPLAY_BLOCK}
      ::slotted(u-summary) { cursor: pointer; display: list-item; list-style: inside disclosure-closed }
      ::slotted(u-summary[${ARIA_EXPANDED}="true"]) { list-style-type: disclosure-open }`
    )
    on(this, 'toggle', this, true)
    mutationObserver(this, {
      attributeFilter: ['id'], // Observe childrens id to sync aria-controls and aria-labelledby
      childList: true, // Observe children to detect native <details>
      subtree: true // Needed to observe childrens attributes
    })
    this.attributeChangedCallback() // We now know the element is in the DOM, so run a attribute setup
  }
  disconnectedCallback() {
    off(this, 'toggle', this, true)
    mutationObserver(this, false)
  }
  attributeChangedCallback() {
    const [summary, details] = this.children
    const isOpen = this[OPEN] // Cache for speed

    // Ensure native <summary> exists and is hidden (can not be accessed through css)
    if (isDetails(details)) {
      const summary =
        details.querySelector<HTMLElement>(':scope > summary') ||
        details.appendChild(document.createElement('summary'))
      summary.hidden = true
    }

    attr(summary, {
      [ARIA_CONTROLS]: details ? useId(details) : null,
      [ARIA_EXPANDED]: isOpen,
      id: useId(summary)
    })
    attr(details, {
      'aria-hidden': !isOpen, // Needed to not announce "empty group" when closed
      [ARIA_LABELLEDBY]: useId(summary),
      [OPEN]: isOpen ? '' : null,
      role: 'group'
    })

    // Skip mutation events caused by attributeChangedCallback
    // Might be not defined if "open" is present in HTML causing
    // attributeChangedCallback to run before connectedCallback
    mutationObserver(this)?.takeRecords()
  }
  handleEvent({ type, target, detail }: CustomEvent<MutationRecord[]>) {
    if (type === 'mutation' && isMutationRelevant(this, detail)) this.attributeChangedCallback()
    if (type === 'toggle' && target === this.children[1] && isDetails(target)) this[OPEN] = target[OPEN]
  }
  get open(): boolean {
    return attr(this, OPEN) !== null
  }
  set open(open) {
    attr(this, OPEN, open ? '' : null)
  }
}

export class UHTMLSummaryElement extends HTMLElement {
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
    if (event.type === 'click' && isDetails(details)) details[OPEN] = !details[OPEN]
  }
}

customElements.define('u-details', UHTMLDetailsElement)
customElements.define('u-summary', UHTMLSummaryElement)

function isDetails(el: unknown): el is HTMLDetailsElement {
  return el instanceof HTMLElement && OPEN in el
}

function isMutationRelevant(self: UHTMLDetailsElement, mutations: MutationRecord[]) {
  return mutations.some(({ attributeName, type, target }) =>
    (target === self && type === 'childList') ||
    (target.parentElement === self && attributeName === 'id')
  );
}