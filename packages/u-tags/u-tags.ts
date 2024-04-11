import {
  ARIA_MULTISELECTABLE,
  FOCUS_OUTLINE,
  UHTMLElement,
  asButton,
  attachStyle,
  attr,
  createElement,
  customElements,
  // getRoot,
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
// TODO: Enter to edit tag?
// TODO: Enable/disable tag creation
// TODO: <template>
// TODO: Do not loop as this makes it hard to find input when holding down arrow
// TODO: Add x-button that is aria-hidden if focus it outside the current tag

/**
 * The `<u-tags>` HTML element contains a set of `<u-tag>` elements.
 * No MDN reference available.
 */
export class UHTMLTagsElement extends UHTMLElement {
  announce: HTMLSpanElement
  constructor() {
    super()
    const slot = createElement('slot')
    slot.appendChild((this.announce = createElement('span')))
    this.attachShadow({ mode: 'closed' }).append(
      createElement('slot'), // Content slog
      createElement('style', { textContent: INLINE_BLOCK }),
      slot // Announcement slot
    )
  }
  connectedCallback() {
    mutationObserver(this, { childList: true, subtree: true }) // Observe u-datalist to add aria-multiselect="true"
    attr(this.announce, { 'aria-live': 'assertive', role: 'alert' })
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
    attachStyle(this, `${INLINE_BLOCK}${FOCUS_OUTLINE}:host{cursor:pointer}`)
  }
  connectedCallback() {
    attr(this, {
      role: 'button',
      title: 'Press Backspace to delete',
      tabIndex: -1
    }) // tabIndex -1 to prevent tabstop, but allow programatic focus
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

const add = (self: UHTMLTagsElement, value: string, text?: string) => {
  const mount = [...self.tags].pop() || self
  const where = mount === self ? 'afterbegin' : 'afterend'
  const option = Object.assign(document.createElement('u-tag'), {
    textContent: text || value,
    value
  })

  mount.insertAdjacentElement(where, option)
}

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

    target.blur() // Blur so VoiceOver in Safari does not loose focus despite DOM being added before
    target.value = '' // Reset value

    if (~removeIndex) remove(self.tags[removeIndex])
    else add(self, target.value, option?.text)

    announceLabel(self, target, `Added ${value}, $text`)
  }
}

function onKeyDown(self: UHTMLTagsElement, event: KeyboardEvent) {
  const { key, target } = event
  const input = getInput(self)
  const tags = [...self.tags]
  const tagIndex = tags.findIndex((tag) => tag.contains(target as Node))

  const isInput = input && target === input
  const isStart = !isInput || !input.selectionEnd // Tag or caret is in start of input
  const isRemove = (key === 'Backspace' || key === 'Delete') && !event.repeat // Do not remove if pressing backspace multiple times
  const isAdd = key === 'Enter' && isInput
  let next: HTMLElement | null = null

  if (!isInput && (tagIndex === -1 || asButton(event))) return // No input or tag focused or keydown to click on tag
  if ((key === 'ArrowLeft' || isRemove) && isStart)
    next = tags[(~tagIndex ? tagIndex : tags.length) - 1] || input
  if (key === 'ArrowRight' && !isInput) next = tags[tagIndex + 1] || input
  if (isAdd) {
    const value = input.value
    event.preventDefault() // Prevent submit
    input.blur() // Blur so VoiceOver in Safari does not loose focus despite DOM being added before
    input.value = '' // Reset value
    add(self, value)
    announceLabel(self, input, `Added ${value}, $text`)
  }

  if (next) {
    event.preventDefault() // Prevent <u-datalist> moving focus to <input>
    if (isRemove)
      announceLabel(self, next, `Deleted ${tags[tagIndex].textContent}, $text`)
    else next.focus()

    if (isRemove && !isInput) remove(tags[tagIndex])
  }
}

function announceLabel(self: UHTMLTagsElement, el: HTMLElement, value: string) {
  // // const role = el.role || null
  // const label = el.ariaLabel
  // const labelText = (el as HTMLInputElement).labels?.[0]?.textContent
  // const labelledbyId = attr(el, 'aria-labelledby') || ''
  // const labelledby = getRoot(el).getElementById(labelledbyId)?.textContent
  // const text = label || labelledby || labelText || el.textContent || ''

  // // if (el instanceof HTMLInputElement) el.role = null
  // el.ariaLabel = value.replace('$text', text)
  // el.focus()
  // setTimeout(() => {
  //   attr(el, {
  //     'aria-labelledby': labelledbyId || null,
  //     'aria-label': label || null
  //     // role
  //   })
  // }, 2000)
  self.announce.textContent = value.replace('$text', '')
  setTimeout(() => (self.announce.textContent = ''), 500)
  el.focus()
}

customElements.define('u-tags', UHTMLTagsElement)
customElements.define('u-tag', UHTMLTagElement)
