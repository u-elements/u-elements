import { BLOCK, style } from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-select': UHTMLSelectElement
    'u-selectlist': UHTMLSelectListElement
    'u-optgroup': UHTMLOptGroupElement
  }
}

export class UHTMLSelectElement extends HTMLElement {
  constructor() {
    super()
    style(this, BLOCK)
  }
}

export class UHTMLSelectListElement extends HTMLElement {
  constructor() {
    super()
  }
}

export class UHTMLOptGroupElement extends HTMLElement {
  constructor() {
    super()
  }
}
