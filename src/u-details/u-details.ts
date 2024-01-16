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

// Needs two child elements
// First element to be <u-summary>
// Second element to be <details>
// toggle event is triggered from child, not <u-details> iteself
// We can not polyfill HTMLInputElement.list as this is readOnly
// Why: details/summary does not work in iOS Safari: impossible to read state of aria-expanded

// Speed up by not triggering attributeChangedCallback during attributeChangedCallback
let skipAttrChange = false
export class UHTMLDetailsElement extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'id']
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
    if (!skipAttrChange && (skipAttrChange = true)) {  
      const [summary, details] = this.children
      const isOpen = this.open // Cache for speed

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
        open: isOpen ? '' : null,
        role: 'group'
      })
      skipAttrChange = false
    }
  }
  handleEvent({ type, target, detail }: CustomEvent<MutationRecord[]>) {
    if (type === 'mutation' && isRelevantMutation(detail, this)) this.attributeChangedCallback()
    if (type === 'toggle' && target === this.children[1] && isDetails(target)) this.open = target.open
  }
  get open(): boolean {
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
    const details = this.parentElement
    if (event.type === 'keydown') asButton(event)
    if (event.type === 'click' && isDetails(details)) details.open = !details.open
  }
}

customElements.define('u-details', UHTMLDetailsElement)
customElements.define('u-summary', UHTMLSummaryElement)

function isDetails(el: unknown): el is HTMLDetailsElement {
  return el instanceof HTMLElement && 'open' in el
}

function isRelevantMutation(mutations: MutationRecord[], self: UHTMLDetailsElement) {
  return mutations.some(({ type, target }) =>
    target === self || (target.parentElement === self && type === 'attributes')
  )
}