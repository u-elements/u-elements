import { UHTMLOptionElement } from '../u-option/u-option'
import {
  ARIA_CONTROLS,
  ARIA_EXPANDED,
  ARIA_LABELLEDBY,
  DISPLAY_BLOCK,
  IS_BROWSER,
  IS_IOS,
  attr,
  customElements,
  getRoot,
  mutationObserver,
  off,
  on,
  style,
  useId
} from '../utils'

// Does not set aria-activedescendant to prevent double reading on plattforms supprting this attribute
// aria-activedescendant does not work in Safari on Mac unless wrapped inside combobox (non-standard)
// aria-live="assertive" works as "polite" placed in shadow dom
// DOCS: Vil du at det skal skifte side - bruk onChange og implemetner selv

declare global {
  interface HTMLElementTagNameMap {
    'u-datalist': UHTMLDataListElement
  }
}

export class UHTMLDataListElement extends HTMLElement {
  connectedCallback() {
    const root = getRoot(this)
    style(this, DISPLAY_BLOCK)
    attr(this, { hidden: '', role: 'listbox' })
    on(root, 'focusin', this) // Only bind focus globally as this is needed to activate
    on(root, 'focus', this, true) // Need to also listen on focus with capturing to render before Firefox NVDA reads state
  }
  disconnectedCallback() {
    const root = getRoot(this)
    addedOptions.delete(this) // Clean up
    off(root, 'click,focusin,focusout,input,keydown', this)
    off(root, 'focus', this, true)
    mutationObserver(this, false)
    activeInput = undefined
  }
  handleEvent(event: Event) {
    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'click') onClick(this, event)
    if (event.type === 'focus' || event.type === 'focusin') onFocus(this, event)
    if (event.type === 'focusout') onBlur(this)
    if (event.type === 'input') setOptionAttributes(this)
    if (event.type === 'keydown') onKeydown(this, event as KeyboardEvent)
    if (event.type === 'mutation') onMutation(this)
  }
  get options(): HTMLCollectionOf<UHTMLOptionElement> {
    return this.getElementsByTagName('u-option')
  }
}

let activeInput: HTMLInputElement | undefined // Store to speed up and prevent double focus
const setOpen = (self: UHTMLDataListElement, open: boolean) => {
  if (open) setOptionAttributes(self) // Esure correct state when opening
  attr(activeInput, ARIA_EXPANDED, open)
  self.hidden = !open
}

const addedOptions = new WeakMap<UHTMLDataListElement, UHTMLOptionElement[]>()
const setOptionAttributes = (self: UHTMLDataListElement) => {
  const hidden = self.hidden
  const added = addedOptions.get(self) || [] // If a option is added to DOM while open, do not hide
  const value = activeInput?.value.toLowerCase().trim() || ''
  const options = [...self.options]

  self.hidden = true // Speed up large lists by hiding during filtering
  options.forEach((opt) => {
    const text = opt.text.toLowerCase()
    opt.hidden = !added.includes(opt) && (!text.includes(value) || opt.disabled)
    opt.selected = value === text
  })

  // Needed to announce count in iOS
  if (IS_IOS)
    options
      .filter((opt) => !opt.hidden)
      .map((opt, i, all) => (opt.title = `${i + 1}/${all.length}`))

  self.hidden = hidden // Restore hidden state
}

function onFocus(self: UHTMLDataListElement, { target }: Event) {
  if (activeInput !== target && attr(target, 'list') === self.id) {
    activeInput = target as HTMLInputElement
    attr(self, ARIA_LABELLEDBY, useId(activeInput.labels?.[0]))
    mutationObserver(self, { childList: true, subtree: true }) // Listen for DOM changes when open to opt out autofiltering
    on(self.getRootNode(), 'click,focusout,input,keydown', self)
    setOpen(self, true)
    attr(activeInput, {
      'aria-autocomplete': 'list',
      [ARIA_CONTROLS]: useId(self),
      autocomplete: 'off',
      role: 'combobox'
    })
  }
}

function onBlur(self: UHTMLDataListElement) {
  // Let event loop run first so focus can move before we check activeElement
  setTimeout(() => {
    const focused = getRoot(self).activeElement
    if (!self.contains(focused) && focused !== activeInput) {
      off(getRoot(self), 'click,focusout,input,keydown', self)
      mutationObserver(self, false)
      setOpen(self, false)
      activeInput = undefined
    }
  })
}

function onClick(self: UHTMLDataListElement, { target }: Event) {
  const option = [...self.options].find((opt) => opt.contains(target as Node))
  const input = activeInput

  if (input === target) setOpen(self, true) // Ensure click on input opens
  else if (input && option) {
    input.readOnly = true // Prevent showing mobile keyboard when moving focus back to input after selection
    input.value = option.text
    setTimeout(() => {
      input.focus() // Change input.value before focus move to make screen reader read the correct value
      setOpen(self, false)
      setTimeout(() => (input.readOnly = false)) // Enable keyboard again
    }, 16) // Set timeout to 16ms to allow mobile keyboard to hide before moving focus
  }
}

// Since InputEvent does not accept event.preventDefault(),
// we need another way of canceling automatic filtering when replacing inner DOM
// We instead listen for mutations so we can store options that are addedOptions
function onMutation(self: UHTMLDataListElement) {
  addedOptions.set(self, [...self.options]) // Store to prevent mutations
  setOptionAttributes(self)
}

function onKeydown(self: UHTMLDataListElement, event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return

  const { key } = event
  const active = getRoot(self).activeElement as UHTMLOptionElement
  const options = [...self.options].filter((opt) => !opt.hidden)
  const index = options.indexOf(active)
  let next = -1 // If hidden - first arrow down should exit input

  if (key === 'ArrowDown') next = (index + 1) % options.length
  if (key === 'ArrowUp') next = (~index ? index : options.length) - 1 // Allow focus in input on ArrowUp
  if (~index) {
    if (key === 'Home' || key === 'PageUp') next = 0
    if (key === 'End' || key === 'PageDown') next = options.length - 1
    if (key === 'Enter') {
      options[index].click()
      return event.preventDefault() // Prevent submit
    }
  }

  // Open if not ESC, before moving focus
  if (key !== 'Escape') setOpen(self, true)
  ;(options[next] || activeInput || document.body).focus()
  if (options[next]) event.preventDefault() // Prevent scroll when on option

  // Close on ESC, after moving focus
  if (key === 'Escape') setOpen(self, false)
}

// Polyfill input.list so it also receives u-datalist
if (IS_BROWSER)
  Object.defineProperty(HTMLInputElement.prototype, 'list', {
    configurable: true,
    enumerable: true,
    get(): HTMLDataElement | UHTMLDataListElement | null {
      const selector = `[id="${attr(this, 'list')}"]:is(datalist,u-datalist)`
      return document.querySelector(selector)
    }
  })

  customElements.define('u-datalist', UHTMLDataListElement)