import {
  IS_FIREFOX,
  IS_IOS,
  UHTMLElement,
  createElement,
  customElements,
  getLabel,
  getRoot,
  useId
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-progress': HTMLProgressElement
  }
}

// Skip attributeChangedCallback caused by attributeChangedCallback
let SKIP_ATTR_CHANGE = false

/**
 * The `<u-progress value="70" max="100">` HTML element displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)
 */
export class UHTMLProgressElement extends UHTMLElement {
  static formAssociated = true // Prevent Chrome DevTools warning about <label for=""> pointing to <u-progress>
  static get observedAttributes() {
    return ['aria-label', 'aria-labelledby', 'value', 'max'] // Also watch aria-label(ledby) to sync Firefox/iOS
  }
  constructor() {
    super()
    this.attachShadow({ mode: 'closed' }).append(
      createElement('slot', { hidden: true }), // Slot hiding content meant for legacy user agents https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element
      createElement('style', {
        textContent: `:host(:not([hidden])) { box-sizing: border-box; border: 1px solid; display: inline-block; height: .5em; width: 10em; overflow: hidden }
        :host::before { content: ''; display: block; height: 100%; background: currentColor; width: var(--percentage, 0%); transition: width .2s }
        :host(:not([value])) { background: linear-gradient(90deg,currentColor 25%, transparent 50%, currentColor 75%) 50%/400% }
        @media (prefers-reduced-motion: no-preference) { :host { animation: indeterminate 2s linear infinite }  }
        @keyframes indeterminate { from { background-position-x: 100% } to { background-position-x: 0 } }`
      })
    )
  }
  connectedCallback() {
    this.attributeChangedCallback() // We now know the element is in the DOM, so run a attribute setup
  }
  attributeChangedCallback() {
    if (SKIP_ATTR_CHANGE) return // Skip attributeChangedCallback caused by attributeChangedCallback
    SKIP_ATTR_CHANGE = true
    const roleImage = IS_IOS || IS_FIREFOX // iOS and Firefox does not correcly read value of role="progress"
    const percentage = Math.max(0, Math.round(this.position * 100)) // Always use percentage as iOS role="progressbar"
    this.style.setProperty('--percentage', `${percentage}%`) // Write style before any read operation to avoid excess animation
    let label = getLabel(this) // Uses innerText so must be after setting this.style

    if (roleImage) label = `${label.replace(/\d+%$/, '')} ${percentage}%`
    if (IS_FIREFOX) Array.from(this.labels, (el) => (el.ariaLabel = label)) // Fixes double anouncment in Firefox

    this.ariaLabel = label.trim()
    this.ariaBusy = `${this.position === -1}` // true if indeterminate
    this.ariaValueNow = `${percentage}`
    this.ariaValueMin = '0'
    this.ariaValueMax = '100'
    this.role = roleImage ? 'img' : 'progressbar'
    this.removeAttribute('aria-labelledby') // Since we always want to use aria-label
    SKIP_ATTR_CHANGE = false
  }
  get labels(): NodeListOf<HTMLLabelElement> {
    const label = this.closest<HTMLLabelElement>('label:not([for])')
    const id = useId(this)

    if (label) label.htmlFor = id // Set for of parent label to include it in returned NodeList
    const el = getRoot(this).querySelectorAll<HTMLLabelElement>(`[for="${id}"]`)
    return el
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

const getNumber = (el: Element, attr: string): number | null => {
  const value = el.getAttribute(attr)
  return isNumeric(value) ? Math.max(0, parseFloat(value)) : null
}

const setNumber = (el: Element, attr: string, val: unknown) => {
  if (val === null || isNumeric(val)) el.setAttribute(attr, `${val}`)
  else throw new Error(`Failed to set non-numeric '${attr}': '${val}'`)
}

customElements.define('u-progress', UHTMLProgressElement)
