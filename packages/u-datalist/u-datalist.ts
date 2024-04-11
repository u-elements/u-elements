import type { UHTMLOptionElement } from './u-option'
export type { UHTMLOptionElement } from './u-option'
import './u-option'
import {
  ARIA_CONTROLS,
  ARIA_EXPANDED,
  ARIA_LABELLEDBY,
  ARIA_MULTISELECTABLE,
  DISPLAY_BLOCK,
  IS_BROWSER,
  IS_IOS,
  UHTMLElement,
  attachStyle,
  attr,
  customElements,
  getRoot,
  mutationObserver,
  off,
  on,
  useId
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-datalist': HTMLDataListElement
  }
}

// Store map of [u-datalist] => [related input] to speed up and prevent double focus
const activeInput = new WeakMap<UHTMLDataListElement, HTMLInputElement>()
const connectedRoot = new WeakMap<UHTMLDataListElement, Document | ShadowRoot>()
const filterValue = new WeakMap<UHTMLDataListElement, string>()

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
  constructor() {
    super()
    attachStyle(
      this,
      `${DISPLAY_BLOCK}::slotted(u-option[disabled]) { display: none !important }` // Hide options that are disabled
    )
  }
  connectedCallback() {
    const root = getConnectedRoot(this)
    connectedRoot.set(this, root) // Cache to correcly unbind events on disconnectedCallback
    attr(this, { hidden: '', role: 'listbox' })
    on(root, 'focusin', this) // Only bind focus globally as this is needed to activate
    on(root, 'focus', this, true) // Need to also listen on focus with capturing to render before Firefox NVDA reads state
  }
  disconnectedCallback() {
    const root = getConnectedRoot(this)
    off(root, 'focusin', this)
    off(root, 'focus', this, true)
    disconnectInput(this)
    connectedRoot.delete(this)
  }
  handleEvent(event: Event) {
    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'click') onClick(this, event)
    if (event.type === 'focus' || event.type === 'focusin') onFocus(this, event)
    if (event.type === 'focusout') onFocusOut(this)
    if (event.type === 'keydown') onKeydown(this, event as KeyboardEvent)
    if (event.type === 'mutation' || event.type === 'input')
      setupOptions(this, event)
  }
  get options(): HTMLCollectionOf<HTMLOptionElement> {
    return this.getElementsByTagName('u-option')
  }
}

const getConnectedRoot = (self: UHTMLDataListElement) =>
  connectedRoot.get(self) || getRoot(self)

const getInput = (self: UHTMLDataListElement) => activeInput.get(self)
const disconnectInput = (self: UHTMLDataListElement) => {
  off(getConnectedRoot(self), 'click,focusout,input,keydown', self)
  mutationObserver(self, false)
  setExpanded(self, false)
  activeInput.delete(self)
  filterValue.delete(self)
}

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
  if (open) setupOptions(self) // Esure correct state when opening in input.value has changed
  attr(getInput(self), ARIA_EXPANDED, open)
  self.hidden = !open
}

const setupOptions = (self: UHTMLDataListElement, event?: Event) => {
  const value = getInput(self)?.value.toLowerCase().trim() || ''
  const changed = event?.type === 'mutation' || filterValue.get(self) !== value
  if (!changed) return // Skip if identical value or options

  const hidden = self.hidden
  const options = [...self.options]
  const isMulti = attr(self, ARIA_MULTISELECTABLE) === 'true'
  const isTyping = event instanceof InputEvent && event.inputType

  self.hidden = true // Speed up large lists by hiding during filtering
  filterValue.set(self, value) // Cache value from this run
  options.forEach((opt) => {
    const text = `${opt.text}`.toLowerCase()
    const content = `${opt.value}${opt.label}${text}`.toLowerCase()
    opt.hidden = !content.includes(value)
    if (!isMulti && isTyping) opt.selected = false // Turn off selected when typing in single select
  })

  // Needed to announce count in iOS
  /* c8 ignore next 4 */ // Because @web/test-runner code coverage iOS emulator only runs in chromium
  if (IS_IOS)
    options
      .filter((opt) => !opt.hidden)
      .map((opt, i, { length }) => (opt.title = `${i + 1}/${length}`))

  self.hidden = hidden // Restore hidden state
}

function onFocus(self: UHTMLDataListElement, { target }: Event) {
  if (
    target instanceof HTMLInputElement &&
    attr(target, 'list') === self.id &&
    activeInput.get(self) !== target
  ) {
    if (activeInput.get(self)) disconnectInput(self) // If previously used by other input
    activeInput.set(self, target)
    attr(self, ARIA_LABELLEDBY, useId(target.labels?.[0]))
    mutationObserver(self, {
      attributeFilter: ['value'], // Listen for value changes to show u-options
      attributes: true,
      childList: true,
      subtree: true
    })
    on(getConnectedRoot(self), 'click,focusout,input,keydown', self)
    setExpanded(self, true)
    attr(target, {
      'aria-autocomplete': 'list',
      [ARIA_CONTROLS]: useId(self),
      autocomplete: 'off',
      role: 'combobox'
    })
  }
}

function onFocusOut(self: UHTMLDataListElement) {
  // Let event loop run first so focus can move before we check activeElement
  // focusout has event.relatedTarget, but Firefox incorrectly sets this to null when pressing Home or End key
  setTimeout(() => {
    const focused = getConnectedRoot(self).activeElement
    const isOutside = getInput(self) !== focused && !self.contains(focused)
    if (isOutside) disconnectInput(self)
  })
}

function onClick(self: UHTMLDataListElement, { target }: Event) {
  const input = getInput(self)
  const option = [...self.options].find((opt) => opt.contains(target as Node))
  const value = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )

  if (input === target)
    setExpanded(self, true) // Click on input should always open datalist
  else if (input && option) {
    const isMulti = attr(self, ARIA_MULTISELECTABLE) === 'true'
    Array.from(self.options, (opt) => {
      if (opt === option) opt.selected = true
      else if (!isMulti) opt.selected = false // Ensure single selected
    })

    input.focus() // Change input.value before focus move to make screen reader read the correct value
    value?.set?.call(input, option.value) // Trigger value change - also React compatible
    setExpanded(self, false) // Click on option shold always close datalist

    // Trigger input.value change events
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function onKeydown(self: UHTMLDataListElement, event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return

  const { key } = event
  const active = getConnectedRoot(self).activeElement as UHTMLOptionElement
  if (key !== 'Escape') setExpanded(self, true) // Open if not ESC, before checking visible options

  // Checks disabled or visibility (since hidden attribute can be overwritten by display: block)
  const options = [...self.options].filter(
    (opt) => !opt.disabled && opt.offsetWidth && opt.offsetHeight
  )
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

  ;(options[next] || getInput(self))?.focus()
  if (options[next]) event.preventDefault() // Prevent scroll when on option

  // Close on ESC, after moving focus
  if (key === 'Escape') setExpanded(self, false)
}

// Polyfill input.list so it also receives u-datalist
if (IS_BROWSER)
  Object.defineProperty(HTMLInputElement.prototype, 'list', {
    configurable: true,
    enumerable: true,
    get(): HTMLDataElement | UHTMLDataListElement | null {
      const root = getRoot(this)
      const list = attr(this, 'list')
      return root.querySelector(`[id="${list}"]:is(datalist,u-datalist)`)
    }
  })

customElements.define('u-datalist', UHTMLDataListElement)
