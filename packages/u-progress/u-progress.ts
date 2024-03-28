import {
  // IS_FIREFOX,
  IS_IOS,
  UHTMLElement,
  attr,
  createElement,
  customElements,
  getRoot,
  useId
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-progress': HTMLProgressElement
  }
}

// TODO: Test aria-label + aria-valuenow
// TODO: Test aria-label with <label> content
// TODO: Test aria-label combined with user set aria-label

/**
 * The `<u-progress value="70" max="100">` HTML element displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)
 */
export class UHTMLProgressElement extends UHTMLElement {
  static get observedAttributes() {
    return ['value', 'max']
  }
  constructor() {
    super()
    this.attachShadow({ mode: 'closed' }).append(
      createElement('slot', { hidden: true }), // Slot hiding content meant for legacy user agents https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element
      createElement('style', {
        textContent: `:host(:not([hidden])) { box-sizing: border-box; border: 1px solid; display: inline-block; height: .5em; width: 10em; overflow: hidden }
        :host::before { content: ''; display: block; height: 100%; background: currentColor; width: var(--percentage, 0%); transition: width .2s }
        :host(:not([value])) { animation: indeterminate 2s linear infinite; background: linear-gradient(90deg,currentColor 25%, transparent 50%, currentColor 75%) 100%/400% }
        @keyframes indeterminate { to { background-position-x: 0 } }`
      })
    )
    this.attributeChangedCallback() // We now know the element is in the DOM, so run a attribute setup
  }
  attributeChangedCallback() {
    const indeterminate = this.position < 0
    const percentage = Math.max(0, Math.round(this.position * 100)) // Always use percentage as iOS role="progressbar"
    // const label = this.labels[0]

    attr(this, {
      /* c8 ignore next 7 */ // Because @web/test-runner code coverage only runs in chromium
      // [IS_FIREFOX ? 'aria-label' : 'data-label']: `${percentage}%`,
      [IS_IOS ? 'title' : 'aria-valuenow']: IS_IOS
        ? `${percentage}%`
        : percentage,
      'aria-busy': indeterminate || null,
      'aria-labelledby': attr(this, 'aria-label') // TODO: Firefox does not understand this
        ? null
        : useId(this.labels[0]),
      'aria-valuemax': 100,
      'aria-valuemin': 0,
      /* c8 ignore next 7 */ // Because @web/test-runner code coverage only runs in chromium
      role: IS_IOS ? 'img' : 'progressbar'
    })
    this.style.setProperty('--percentage', `${percentage}%`)
  }
  get labels(): NodeListOf<HTMLLabelElement> {
    const label = this.closest('label')
    const htmlFor = attr(label, 'for') || null // Cache parent <label> for attributes
    const root = getRoot(this)
    const id = useId(this)

    attr(label, 'for', id) // Temportarily set for of parent label to include it in returned NodeList
    const labels = root.querySelectorAll<HTMLLabelElement>(`[for="${id}"]`)
    attr(label, 'for', htmlFor) // Restore for attribute
    return labels
  }
  get position(): number {
    return this.value === null ? -1 : Math.min(this.value / this.max, 1)
  }
  get value(): number | null {
    return getNumber(this, 'value')
  }
  set value(value: string | number | null) {
    setNumber(this, 'value', value)
  }
  get max(): number {
    return getNumber(this, 'max') || 1
  }
  set max(max: string | number | null) {
    setNumber(this, 'max', max)
  }
}

const isNumeric = (value: unknown): value is number | string =>
  !isNaN(parseFloat(`${value}`)) && isFinite(Number(value))

const getNumber = (el: Element, key: string): number | null => {
  const value = attr(el, key)
  return isNumeric(value) ? Math.max(0, parseFloat(value)) : null
}

const setNumber = (el: Element, key: string, val: unknown) => {
  if (val === null || isNumeric(val)) return attr(el, key, val)
  throw new Error(`Failed to set non-numeric '${key}': '${val}'`)
}

customElements.define('u-progress', UHTMLProgressElement)
