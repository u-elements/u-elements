import {
  CONTROLS,
  EXPANDED,
  LABELLEDBY,
  asButton,
  attr,
  define,
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

// Needs two child elements
// First element to be <u-summary>
// Second element to be <details>
// toggle event is triggered from child, not <u-details> iteself
// We can not polyfill HTMLInputElement.list as this is readOnly
// Why: details/summary does not work in iOS Safari: impossible to read state of aria-expanded

export class UHTMLDetailsElement extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'id']
  }
  constructor() {
    super()
    style(
      this,
      `:host(:not([hidden])) { display: block }
      ::slotted(u-summary) { cursor: pointer; display: list-item; list-style: inside disclosure-closed }
      ::slotted(u-summary[${EXPANDED}="true"]) { list-style-type: disclosure-open }`
    )
  }
  connectedCallback() {
    on(this, 'toggle', this, true)
    mutationObserver(this, { childList: true }) // Observe children to detect native <details>
    this.attributeChangedCallback() // We now know the element is in the DOM, so run a attribute setup
  }
  disconnectedCallback() {
    off(this, 'toggle', this, true)
    mutationObserver(this, false)
  }
  attributeChangedCallback() {
    const [summary, details] = this.children
    const isOpen = this.open // Cache for speed

    // Ensure native <summary> exists and is hidden (can not be accessed through css)
    if (details instanceof HTMLDetailsElement) {
      const summary =
        details.querySelector<HTMLElement>(':scope > summary') ||
        details.appendChild(document.createElement('summary'))
      summary.hidden = true
    }

    attr(summary, {
      [CONTROLS]: details && useId(details),
      [EXPANDED]: isOpen,
      id: useId(summary)
    })
    attr(details, {
      'aria-hidden': !isOpen, // Needed to not announce "empty group" when closed
      [LABELLEDBY]: useId(summary),
      open: isOpen ? '' : null,
      role: 'group'
    })
  }
  handleEvent({ type, target }: CustomEvent) {
    const details = this.children[1] as HTMLDetailsElement

    if (type === 'mutation') this.attributeChangedCallback()
    if (type === 'toggle' && target === details) this.open = details.open
  }
  get open() {
    return attr(this, 'open') === ''
  }
  set open(open) {
    attr(this, 'open', open ? '' : null)
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
    const details = this.parentElement as UHTMLDetailsElement
    if (event.type === 'keydown') asButton(event)
    if (event.type === 'click') details.open = !details.open
  }
}

define('u-details', UHTMLDetailsElement)
define('u-summary', UHTMLSummaryElement)
