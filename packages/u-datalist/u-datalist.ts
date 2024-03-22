import type { UHTMLOptionElement } from './u-option'
import './u-option'
import {
  ARIA_CONTROLS,
  ARIA_EXPANDED,
  ARIA_LABELLEDBY,
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

// Does not set aria-activedescendant to prevent double reading on plattforms supprting this attribute
// aria-activedescendant does not work in Safari on Mac unless wrapped inside combobox (non-standard)
// aria-live="assertive" works as "polite" placed in shadow dom
// DOCS: Want it do change URL? Use onChange to implement

declare global {
  interface HTMLElementTagNameMap {
    'u-datalist': HTMLDataListElement
  }
}

// Store map of [u-datalist] => [related input] to speed up and prevent double focus
const activeInput = new WeakMap<UHTMLDataListElement, HTMLInputElement>()
const connectedRoot = new WeakMap<UHTMLDataListElement, Document | ShadowRoot>()

/**
 * The `<u-datalist>` HTML element contains a set of `<u-option>` elements that represent the permissible or recommended options available to choose from within other controls.
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)
 */
export class UHTMLDataListElement extends UHTMLElement {
  constructor() {
    super()
    attachStyle(this, DISPLAY_BLOCK)
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
    if (event.type === 'focus' || event.type === 'focusin') onFocus(this, event)
    if (event.type === 'click') onClick(this, event)
    if (event.type === 'focusout') onBlur(this)
    if (event.type === 'input' || event.type === 'mutation') setOptionAttributes(this)
    if (event.type === 'keydown') onKeydown(this, event as KeyboardEvent)
  }
  get options(): HTMLCollectionOf<HTMLOptionElement> {
    return this.getElementsByTagName('u-option')
  }
}

const getConnectedRoot = (self: UHTMLDataListElement) => connectedRoot.get(self) || getRoot(self)
const getInput = (self: UHTMLDataListElement) => activeInput.get(self)
const disconnectInput = (self: UHTMLDataListElement) => {
  off(getConnectedRoot(self), 'click,focusout,input,keydown', self)
  mutationObserver(self, false)
  setExpanded(self, false)
  activeInput.delete(self)
}

const setExpanded = (self: UHTMLDataListElement, open: boolean) => {
  if (open) setOptionAttributes(self) // Esure correct state when opening in input.value has changed
  attr(getInput(self), ARIA_EXPANDED, open)
  self.hidden = !open
}

const setOptionAttributes = (self: UHTMLDataListElement) => {
  const hidden = self.hidden
  const value = getInput(self)?.value.toLowerCase().trim() || ''
  const options = [...self.options]

  self.hidden = true // Speed up large lists by hiding during filtering
  options.forEach((opt) => {
    const text = `${opt.text}`.toLowerCase()
    const values = `${opt.value}${opt.label}${text}`.toLowerCase()
    opt.hidden = !values.includes(value) || opt.disabled
    opt.selected = value === text
  })

  // Needed to announce count in iOS
  /* c8 ignore next 4 */ // Because @web/test-runner code coverage iOS emulator only runs in chromium
  if (IS_IOS)
    options
      .filter((opt) => !opt.hidden)
      .map((opt, i, all) => (opt.title = `${i + 1}/${all.length}`))

  self.hidden = hidden // Restore hidden state
}

function onFocus(self: UHTMLDataListElement, { target }: Event) {
  if (target instanceof HTMLInputElement && attr(target, 'list') === self.id && !activeInput.has(self)) {
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

function onBlur(self: UHTMLDataListElement) {
  // Let event loop run first so focus can move before we check activeElement
  setTimeout(() => {
    const focused = getConnectedRoot(self).activeElement
    if (getInput(self) !== focused && !self.contains(focused)) disconnectInput(self)
  })
}

function onClick(self: UHTMLDataListElement, { target }: Event) {
  const option = [...self.options].find((opt) => opt.contains(target as Node))
  const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') 
  const input = getInput(self)
  const readOnly = input?.readOnly || false; // Cache original readOnly state

  if (input === target) setExpanded(self, true) // Ensure click on input opens
  else if (input && option) {
    input.readOnly = true // Prevent showing mobile keyboard when moving focus back to input after selection
    value?.set?.call(input, option.value); // Trigger value change - also React compatible

    // Trigger input.value change events
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))

    // Set timeout to 16ms to allow mobile keyboard to hide before moving focus
    setTimeout(() => {
      input.focus() // Change input.value before focus move to make screen reader read the correct value
      setExpanded(self, false)
      setTimeout(() => (input.readOnly = readOnly)) // Restore original readyOnly
    }, 16)
  }
}

function onKeydown(self: UHTMLDataListElement, event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return

  const { key } = event
  const active = getConnectedRoot(self).activeElement as UHTMLOptionElement
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
  if (key !== 'Escape') setExpanded(self, true)
  ;(options[next] || getInput(self) || document.body).focus()
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
      return document.querySelector(`[id="${attr(this, 'list')}"]:is(datalist,u-datalist)`)
    }
  })

customElements.define('u-datalist', UHTMLDataListElement)
