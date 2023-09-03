import { DISABLED, SELECTED, attr, define, style } from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-option': UHTMLOptionElement
  }
}

export class UHTMLOptionElement extends HTMLElement {
  constructor() {
    super()
    attr(this, { role: 'option', tabindex: -1 })
    style(this, `:host(:not([hidden])) { display: block; cursor: pointer }`)
  }
  /** Sets or retrieves whether the option in the list box is the default item. */
  get defaultSelected() {
    return attr(getContainer(this), 'selected') === this.value
  }
  set defaultSelected(value: boolean) {
    attr(getContainer(this), 'selected', value)
  }
  get disabled() {
    return attr(this, DISABLED) === 'true'
  }
  set disabled(value: boolean) {
    attr(this, DISABLED, value ? 'true' : null)
  }
  /** Retrieves a reference to the form that the object is embedded in. */
  get form() {
    return this.closest('form')
  }
  /** Sets or retrieves the ordinal position of an option in a list box. */
  get index() {
    const container = getContainer(this)
    if (!container) return -1
    return [...container.getElementsByTagName(this.nodeName)].indexOf(this)
  }
  /** Sets or retrieves a value that you can use to implement your own label functionality for the object. */
  get label() {
    return attr(this, 'label') || this.text
  }
  set label(value: string) {
    attr(this, 'label', value)
  }
  get selected() {
    return attr(this, SELECTED) === 'true'
  }
  set selected(value: boolean) {
    attr(this, SELECTED, !!value)
  }
  /** Sets or retrieves the text string specified by the option tag. */
  get text() {
    return (this.innerText || this.textContent || '').trim()
  }
  set text(text: string) {
    this.textContent = text
  }
  /** Sets or retrieves the value which is returned to the server when the form control is submitted. */
  get value() {
    return attr(this, 'value') || this.text
  }
  set value(value: string) {
    attr(this, 'value', value)
  }
}

const getContainer = (self: UHTMLOptionElement) =>
  self.closest('u-datalist,u-selectmenu')

define('u-option', UHTMLOptionElement)
