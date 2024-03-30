import {
  ARIA_MULTISELECTABLE,
  UHTMLElement,
  asButton,
  attachStyle,
  attr,
  customElements,
  mutationObserver,
  off,
  on
} from '../utils'

const INLINE_BLOCK = `:host(:not([hidden])){ display: inline-block }`

declare global {
  interface HTMLElementTagNameMap {
    'u-tags': UHTMLTagsElement
    'u-tag': UHTMLTagElement
  }
}
// TODO: On remove, move to input? move to u-tags if no more tags and no input? label?
// TODO: Optional separation key such as comma?
// TODO: Enable/disable tag creation

/**
 * The `<u-tags>` HTML element contains a set of `<u-tag>` elements.
 * No MDN reference available.
 */
export class UHTMLTagsElement extends UHTMLElement {
  constructor() {
    super()
    attachStyle(this, INLINE_BLOCK)
  }
  connectedCallback() {
    mutationObserver(this, { childList: true, subtree: true }) // Observe u-datalist to add aria-multiselect="true"
    on(this, 'click', this)
    on(this, 'input', this)
    on(this, 'keydown', this)
    setupDatalist(this)
  }
  disconnectedCallback() {
    mutationObserver(this, false)
    off(this, 'click', this)
    off(this, 'input', this)
    off(this, 'keydown', this)
  }
  handleEvent(event: Event) {
    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'click') onClick(this, event)
    if (event.type === 'input') onInput(this, event as InputEvent)
    if (event.type === 'keydown') onKeyDown(this, event as KeyboardEvent)
    if (event.type === 'mutation') setupDatalist(this)
  }
  get tags(): HTMLCollectionOf<UHTMLTagElement> {
    return this.getElementsByTagName('u-tag')
  }
  get values() {
    return Array.from(this.tags, getValue) // Use getValue as UHTMLTagElement instance might not be created yet
  }
}

/**
 * The `<u-tag>` HTML element contains a set of `<u-tag>` elements.
 * No MDN reference available.
 */
export class UHTMLTagElement extends UHTMLElement {
  constructor() {
    super()
    attachStyle(
      this,
      `${INLINE_BLOCK}
      :host{ cursor: pointer }
      :host(:focus){ outline: 1px dotted; outline: 5px auto Highlight; outline: 5px auto -webkit-focus-ring-color }`
    ) // Outline styles in order: fallback, Mozilla, WebKit
  }
  connectedCallback() {
    attr(this, { role: 'button', tabIndex: 0 }) // tabIndex -1 to prevent tabstop, but allow programatic focus
  }
  get value(): string {
    return getValue(this)
  }
  set value(value: string) {
    attr(this, 'data-value', value)
  }
}

const getValue = (el: Element) => attr(el, 'data-value') || el.textContent || ''
const getInput = (self: UHTMLTagsElement) => self.querySelector('input')
const getOptions = (self: UHTMLTagsElement) => {
  const datalist = self.querySelector('u-datalist')
  attr(datalist, ARIA_MULTISELECTABLE, true) // Ensure multiselect
  return Array.from(datalist?.options || [])
}

// Setup multiselct and select all relevant options
const setupDatalist = (self: UHTMLTagsElement) => {
  const options = getOptions(self)
  const values = self.values

  options.forEach((opt) => (opt.selected = values.includes(opt.value)))
}

const add = (self: UHTMLTagsElement, value: string, text?: string) =>
  self.prepend(
    Object.assign(document.createElement('u-tag'), {
      textContent: text || value,
      value
    })
  )

const remove = (tag: UHTMLTagElement) => tag.remove()

function onClick(self: UHTMLTagsElement, { target }: Event) {
  if (target === self) getInput(self)?.focus() // Focus input if click on u-tags
  if (target instanceof Element) target.closest('u-tag')?.focus() // Focus tag on click
}

function onInput(self: UHTMLTagsElement, { target, inputType }: InputEvent) {
  if (target instanceof HTMLInputElement && !inputType) {
    const value = target.value
    const option = getOptions(self).find((opt) => opt.value === value)
    const removeIndex = self.values.indexOf(value)

    if (~removeIndex) remove(self.tags[removeIndex])
    else add(self, target.value, option?.text)
    target.value = ''
  }
}

function onKeyDown(self: UHTMLTagsElement, event: KeyboardEvent) {
  const { key, target } = event
  const input = getInput(self)
  const tags = [...self.tags]
  const tagIndex = tags.findIndex((tag) => tag.contains(target as Node))

  const isInput = input && target === input
  const isStart = !isInput || !input.selectionEnd // Tag or carret is in start of input
  const isEnd = !isInput || input.selectionStart === input.value.length // Tag or carret is in end of input
  let next: HTMLElement | null = null

  if (!isInput && (tagIndex === -1 || asButton(event))) return // No input or tag focused or keydown to click on tag
  if ((key === 'ArrowLeft' || key === 'Backspace') && isStart)
    next = tags[(~tagIndex ? tagIndex : tags.length) - 1] || input
  if (key === 'ArrowRight' && isEnd) next = tags[tagIndex + 1] || input
  if (key === 'Backspace' && !isInput) remove(tags[tagIndex])
  if (key === 'Enter' && isInput) {
    event.preventDefault() // Prevent submit
    add(self, input.value)
    input.value = '' // Reset value
  }
  if (next) {
    event.preventDefault() // Prevent <u-datalist> moving focus to <input>
    next.focus()
  }
}

customElements.define('u-tags', UHTMLTagsElement)
customElements.define('u-tag', UHTMLTagElement)
