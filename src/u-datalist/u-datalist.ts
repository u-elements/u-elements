import { UOption } from '../u-option/u-option'
import { attr, define, getRoot, style, on, off, useId } from '../utils'

// When fetching elements - do not fill
// If no options, set tabindex="-1" on datalist and allow focus going in there (TODO? How about "no content message"?)
// Does not set aria-activedescendant to prevent double reading on plattforms supprting this attribute
// aria-activedescendant does not work in Safari on Mac
// aria-live does not read when position: absolute and placed in shadow dom
// aria-live="assertive" works as "polite" placed in shadow dom
// aria-invalid på input feltet dersom ikke match? TODO: test
// DOCS: Vil du at det skal skifte side - bruk onChange og implemetner selv

declare global {
  interface HTMLElementTagNameMap {
    'u-datalist': UDatalist
  }
}

export class UDatalist extends HTMLElement {
  constructor() {
    super()
    attr(this, { hidden: '', role: 'listbox' })
    style(
      this,
      `:host(:not([hidden])) { display: block }
      ::slotted(u-option[aria-disabled="true"]) { display: none }
      ::slotted(u-option[aria-selected="true"]) { color: red }`
    )
  }
  connectedCallback() {
    on(getRoot(this), 'click,focusin,focusout,input,keydown', this)
  }
  disconnectedCallback() {
    off(getRoot(this), 'click,focusin,focusout,input,keydown', this)
  }
  handleEvent(event: Event) {
    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'focusin') onFocusin(this, event)
    if (event.type === 'focusout') onFocusout(this, event)
    if (event.type === 'click') onClick(this, event)
    if (event.type === 'keydown') onKeydown(this, event as KeyboardEvent)
    if (event.type === 'input') onInput(this, event.target)
  }
  get options(): HTMLCollectionOf<UOption> {
    return this.getElementsByTagName('u-option') as HTMLCollectionOf<UOption>
  }
}

define('u-option', UOption)
define('u-datalist', UDatalist)

const getInput = (self: UDatalist): HTMLInputElement | null =>
  getRoot(self).querySelector(`input[aria-controls="${self.id}"]`)

const isInput = (self: UDatalist, node: unknown): node is HTMLInputElement =>
  attr(node, 'list') === self.id

const isInside = (self: UDatalist, node: unknown): node is Node =>
  self.contains(node as Node) || isInput(self, node)

const setOpen = (self: UDatalist, open: boolean) => {
  attr(getInput(self), 'aria-expanded', open)
  attr(self, 'hidden', open ? null : '')
}

const onFocusin = (self: UDatalist, { target }: Event) => {
  if (isInput(self, target)) {
    const label = target.labels && target.labels[0]
    if (label) attr(self, 'aria-labelledby', useId(label)) // Connect relevant <label> // TODO Test android
    setOpen(self, true)
    attr(target, {
      'aria-autocomplete': 'list',
      'aria-controls': useId(self), // Used by getInput later
      autocomplete: 'off',
      role: 'combobox'
    })
  }
}

const onFocusout = (self: UDatalist, { target }: Event) => {
  // If inside, let event loop run first so focusin can move before we check active element
  if (isInside(self, target))
    setTimeout(() => {
      if (!isInside(self, getRoot(self).activeElement)) setOpen(self, false)
    })
}

const onClick = (self: UDatalist, { target }: Event) => {
  if (!isInside(self, target)) return
  const input = getInput(self)
  const option = Array.from(self.options).find((opt) => opt.contains(target))

  if (input === target) setOpen(self, true) // Ensure click on input opens
  if (input && option) {
    input.value = option.text
    onInput(self, input)
    setTimeout(() => {
      input.focus() // Change input.value before focus move to make screen reader read the correct value
      setOpen(self, false)
    })
  }
}

const onInput = (self: UDatalist, input: EventTarget | null) => {
  if (!isInput(self, input)) return
  const value = input.value.toLowerCase().trim()
  const valid = Array.from(self.options).filter((item) => {
    const text = item.text.toLowerCase()
    const show = !value || text.includes(value)
    item.selected = value === text
    item.disabled = !show
    return show
  })
  attr(input, 'aria-invalid', !valid.length) // Set input to invalid if no matches found
}

const onKeydown = (self: UDatalist, event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || !isInside(self, event.target)) return
  const { key } = event
  const input = getInput(self)
  const options = Array.from(self.options).filter(({ disabled }) => !disabled)
  const index = options.findIndex(({ selected }) => selected)
  let next = -1

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

  setOpen(self, key !== 'Escape') // Open on any key except ESC
  ;(options[next] || input).focus()
  if (options[next]) event.preventDefault() // Prevent scroll when on option
  options.forEach((opt, index) => (opt.selected = index === next))
}
