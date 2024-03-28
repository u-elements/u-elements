import { DISPLAY_BLOCK, UHTMLElement, attachStyle } from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-tags': UHTMLTagsElement
  }
}

/**
 * The `<u-tags>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLTagsElement extends UHTMLElement {
  constructor() {
    super()
    attachStyle(this, DISPLAY_BLOCK) // Hide options that are disabled
  }
  connectedCallback() {}
  disconnectedCallback() {}
  handleEvent() {}
}
