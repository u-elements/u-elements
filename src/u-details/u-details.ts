import {
  IS_ANDROID,
  asButton,
  attr,
  define,
  style,
  mutationObserver,
  off,
  on,
  useId
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-details': UDetails
    'u-summary': USummary
  }
}

// Needs two child elements
// First element to be <u-summary>
// Second element to be <details>
// toggle event is triggered from child, not <u-details> iteself
// Why: details/summary does not work in iOS Safari: impossible to read state of aria-expanded

export class UDetails extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'id']
  }
  constructor() {
    super()
    style(
      this,
      `:host(:not([hidden])) { display: block }
      :host > ::slotted(u-summary) { cursor: pointer; display: list-item; list-style: inside disclosure-closed }
      :host > ::slotted(u-summary[aria-expanded="true"]) { list-style-type: disclosure-open }`
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
    const [summary, details] = Array.from(this.children)
    const isOpen = this.open // Cache for speed

    // Ensure native <summary> exists and is hidden (can not be accessed through css)
    if (details instanceof HTMLDetailsElement) {
      const summary =
        details.querySelector(':scope > summary') ||
        details.appendChild(document.createElement('summary'))
      attr(summary, 'hidden', '')
    }

    attr(summary, {
      'aria-controls': details && useId(details),
      'aria-expanded': isOpen,
      id: useId(summary)
    })
    attr(details, {
      'aria-hidden': !isOpen, // Needed to not announce "empty group" when closed
      'aria-labelledby': IS_ANDROID ? null : useId(summary), // Android reads button instead of content when labelledby
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

export class USummary extends HTMLElement {
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
    if (event.type === 'click' && details instanceof UDetails)
      details.open = !details.open
  }
}

define('u-details', UDetails)
define('u-summary', USummary)
