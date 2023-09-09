import { IS_IOS, attr, getRoot, style, useId } from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-progress': UHTMLProgressElement
  }
}
/**
 * The `<u-progress value="70" max="100">` HTML element displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)
 */
class UHTMLProgressElement extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'max']
  }
  constructor() {
    super()
    attr(this, 'role', IS_IOS ? 'img' : 'progressbar')
    style(
      this,
      `:host(:not([hidden])) { box-sizing: border-box; border: 1px solid; display: inline-block; height: .5em; width: 10em; overflow: hidden }
      :host::before { content: ''; display: block; height: 100%; background: currentColor; width: var(--percentage, 100%); transition: width .2s }
      :host(:not([value]))::before { animation: indeterminate 2s linear infinite; background: linear-gradient(90deg,currentColor 25%, transparent 50%, currentColor 75%) 100%/400% }
      @keyframes indeterminate { to { background-position-x: 0 } }`
    )
  }
  connectedCallback() {
    this.attributeChangedCallback()
  }
  attributeChangedCallback() {
    const indeterminate = this.position < 0
    const percentage = `${Math.round(this.position * 100)}%` // Always use percentage as iOS role="progressbar"
    this.style.setProperty('--percentage', indeterminate ? '' : percentage)
    attr(this, {
      [IS_IOS ? 'aria-label' : 'aria-valuenow']: percentage,
      'aria-busy': indeterminate || null,
      'aria-valuemax': 100,
      'aria-valuemin': 0
    })
  }
  get labels(): NodeListOf<HTMLLabelElement> {
    const label = this.closest('label')
    const htmlFor = attr(label, 'for')
    const selector = `[for="${useId(this)}"]`

    attr(label, 'for', useId(this)) // Temportarily set for of parent label to include it in returned NodeList
    const labels = getRoot(this).querySelectorAll<HTMLLabelElement>(selector)
    attr(label, 'for', htmlFor || null) // Undo attribute in case u-progress is moved later
    return labels
  }
  get position(): number {
    return this.value === null ? -1 : Math.min(this.value / this.max, 1)
  }
  get value(): number | null {
    return getNumber(this, 'value')
  }
  set value(value: unknown) {
    setNumber(this, 'value', value)
  }
  get max(): number {
    return getNumber(this, 'max') || 1
  }
  set max(max: unknown) {
    setNumber(this, 'max', max)
  }
}

const isNumeric = (value: unknown): boolean =>
  !isNaN(parseFloat(String(value))) && isFinite(Number(value))

const getNumber = (el: Element, key: string): number | null =>
  isNumeric(attr(el, key)) ? Math.max(0, parseFloat(attr(el, key) || '')) : null

const setNumber = (el: Element, key: string, val: unknown) => {
  if (val === null || isNumeric(val)) return attr(el, key, val as string)
  throw new Error(`Failed to set non-numeric '${key}': '${val}'`)
}

try {
  customElements.define('u-progress', UHTMLProgressElement)
} catch (err) {
  // Already defined or on server
}
