import { IS_IOS, attr, define, getRoot, style } from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-progrss': UHTMLProgressElement
  }
}

export class UHTMLProgressElement extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'max']
  }
  constructor() {
    super()
    attr(this, 'role', IS_IOS ? 'img' : 'progressbar')
    style(
      this,
      `:host { box-sizing: border-box; border: 1px solid; display: inline-flex; height: .5em; width: 10em; overflow: hidden }
      :host::before { content: ''; background: currentColor; width: var(--percentage, 100%); transition: width .2s }
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
  get labels() {
    const label = this.closest('label')
    const needsFor = label && !label.htmlFor
    if (needsFor) label.htmlFor = this.id // Ensure parent label is included in NodeList
    const nodeList = getRoot(this).querySelectorAll(`[for="${this.id}"]`)
    if (needsFor) attr(label, 'for', null) // Undo attribute in case u-progress is moved later
    return nodeList
  }
  get position() {
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

define('u-progress', UHTMLProgressElement)
