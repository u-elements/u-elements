import { UHTMLOptionElement } from '../u-option/u-option'
import {
  BLOCK,
  CONTROLS,
  EXPANDED,
  IS_BROWSER,
  IS_IOS,
  LABELLEDBY,
  attr,
  define,
  getRoot,
  mutationObserver,
  off,
  on,
  style,
  useId
} from '../utils'

// When fetching elements - do not fill
// Does not set aria-activedescendant to prevent double reading on plattforms supprting this attribute
// aria-activedescendant does not work in Safari on Mac
// aria-live does not read when position: absolute and placed in shadow dom
// aria-live="assertive" works as "polite" placed in shadow dom
// DOCS: Vil du at det skal skifte side - bruk onChange og implemetner selv

declare global {
  interface HTMLElementTagNameMap {
    'u-datalist': UHTMLDataListElement
  }
}

export class UHTMLDataListElement extends HTMLElement {
  constructor() {
    super()
    attr(this, { hidden: '', role: 'listbox' })
    style(this, BLOCK)
  }
  connectedCallback() {
    const root = getRoot(this)
    on(root, 'click,focusin,focusout,input,keydown', this)
    on(root, 'focus', this, true) // Need to also listen on focus with capturing to render before Firefox NVDA reads state
  }
  disconnectedCallback() {
    const root = getRoot(this)
    addedWhileOpen.delete(this) // Clean up
    off(root, 'click,focusin,focusout,input,keydown', this)
    off(root, 'focus', this, true)
    mutationObserver(this, false)
  }
  handleEvent(event: Event) {
    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'click') onClick(this, event)
    if (event.type === 'focus' || event.type === 'focusin') onFocus(this, event)
    if (event.type === 'focusout') onBlur(this, event)
    if (event.type === 'input') filter(this, event.target)
    if (event.type === 'keydown') onKeydown(this, event as KeyboardEvent)
    if (event.type === 'mutation') onMutation(this)
  }
  get options() {
    return this.getElementsByTagName('u-option')
  }
}

const getInput = (self: UHTMLDataListElement) =>
  getRoot(self).querySelector<HTMLInputElement>(
    `input[${CONTROLS}="${self.id}"]`
  )

const isInput = (
  self: UHTMLDataListElement,
  node: unknown
): node is HTMLInputElement => attr(node, 'list') === self.id

const isInside = (self: UHTMLDataListElement, node: unknown): node is Node =>
  self.contains(node as Node) || isInput(self, node)

const setOpen = (self: UHTMLDataListElement, open: boolean) => {
  attr(getInput(self), EXPANDED, open)
  mutationObserver(self, open && { childList: true, subtree: true }) // Listen for DOM changes when open to opt out autofiltering
  self.hidden = !open
}

let debounce: ReturnType<typeof setTimeout>
const addedWhileOpen = new WeakMap<UHTMLDataListElement, UHTMLOptionElement[]>()
const filter = (self: UHTMLDataListElement, input: unknown, wait = 16) => {
  // Debounce as filtering can be triggered multiple times in same event loop
  clearTimeout(debounce)
  if (wait) debounce = setTimeout(filter, wait, self, input, 0)
  if (wait || !isInput(self, input)) return

  const prevHidden = self.hidden // Store previous hidden state
  const added = addedWhileOpen.get(self) || [] // If a option is added to DOM while open, do not hide
  const value = input.value.toLowerCase().trim()
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

  self.hidden = prevHidden // Reset hidden state
}

function onFocus(self: UHTMLDataListElement, { target: input }: Event) {
  if (isInput(self, input)) {
    const label = input.labels && input.labels[0]
    if (label) attr(self, LABELLEDBY, useId(label))
    setOpen(self, true)
    filter(self, input)
    attr(input, {
      'aria-autocomplete': 'list',
      [CONTROLS]: useId(self), // Used by getInput later
      autocomplete: 'off',
      role: 'combobox'
    })
  }
}

function onBlur(self: UHTMLDataListElement, { target }: Event) {
  // If inside, let event loop run first so focus can move before we check activeElement
  if (isInside(self, target))
    setTimeout(() => {
      if (!isInside(self, getRoot(self).activeElement)) setOpen(self, false)
    })
}

function onClick(self: UHTMLDataListElement, { target }: Event) {
  if (!isInside(self, target)) return
  const input = getInput(self)
  const option = [...self.options].find((opt) => opt.contains(target))

  if (input === target) setOpen(self, true) // Ensure click on input opens
  if (input && option) {
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
// We instead listen for mutations so we can store options that are addedWhileOpen
function onMutation(self: UHTMLDataListElement) {
  addedWhileOpen.set(self, [...self.options]) // Store to prevent mutations
  filter(self, getInput(self))
}

function onKeydown(self: UHTMLDataListElement, event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || !isInside(self, event.target)) return
  const { key } = event
  const input = getInput(self)
  const active = getRoot(self).activeElement as UHTMLOptionElement
  const options = [...self.options].filter((opt) => !opt.hidden)
  const index = options.indexOf(active)
  let next = -1 // If hidden - first arrow down should exit input TODO: Test with Kristoffer

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
  ;(options[next] || input).focus()
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

define('u-datalist', UHTMLDataListElement)
