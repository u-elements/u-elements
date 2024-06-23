import {
  FOCUS_OUTLINE,
  IS_ANDROID,
  IS_FIREFOX,
  SAFE_MULTISELECTABLE,
  UHTMLElement,
  asButton,
  createElement,
  customElements,
  getRoot,
  mutationObserver,
  off,
  on
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-tags': UHTMLTagsElement
  }
  interface GlobalEventHandlersEventMap {
    tags: CustomEvent<HTMLDataElement>
  }
}

let BLUR_TIMER: ReturnType<typeof setTimeout>
let FOCUS_NODE: Node | null // Store what node had focus so we can move focus to relevant element on delete
const EVENTS = 'click,change,input,focusin,focusout,keydown'
const LANG = {
  added: 'Added',
  remove: 'Press to remove',
  removed: 'Removed',
  empty: 'No selected',
  found: 'Navigate left to find %d selected',
  of: 'of'
}

// TODO: Announce create item Firefox
// TODO: What to include in dispatchChange detail?
// TODO KRISTOFFER: Announce datalist items count on type?

/**
 * The `<u-tags>` HTML element contains a set of `<data>` elements.
 * No MDN reference available.
 */
export class UHTMLTagsElement extends UHTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'closed' }).append(
      createElement('slot'), // Content slot
      createElement('style', {
        textContent: `:host(:not([hidden])){ display: inline-block }
        ::slotted(data) { cursor: pointer; display: inline-block; outline: none; pointer-events: none }
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus)::after { ${FOCUS_OUTLINE} }` // Show focus outline around ::after only
      })
    )
  }
  connectedCallback() {
    setTimeout(onMutation, 0, this) // Set initial aria-labels and selected items in u-datalist (after render)
    mutationObserver(this, { childList: true }) // Observe u-datalist to add aria-multiselect="true"
    on(this, EVENTS, this)
  }
  disconnectedCallback() {
    mutationObserver(this, false)
    off(this, EVENTS, this)
  }
  handleEvent(event: Event) {
    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'click') onClick(this, event as MouseEvent)
    if (event.type === 'focusin') onFocusIn(event)
    if (event.type === 'focusout') onFocusOut()
    if (event.type === 'input') onInput(this, event as InputEvent)
    if (event.type === 'keydown') onKeyDown(this, event as KeyboardEvent)
    if (event.type === 'mutation') onMutation(this, event as CustomEvent)
  }
  get items(): NodeListOf<HTMLDataElement> {
    return this.querySelectorAll('data')
  }
}

const getText = (el?: Node | null) => el?.textContent?.trim() || ''
const getInput = (self: UHTMLTagsElement) =>
  self.querySelector<HTMLInputElement | HTMLSelectElement>('input,select')

const getChange = (mutations: MutationRecord[] = []) => {
  const diff = mutations.flatMap((m) => [...m.addedNodes, ...m.removedNodes]) // Get all added and removed nodes
  const item = !diff[1] && diff[0] instanceof HTMLDataElement ? diff[0] : null // Only return if single item has changed
  let prev = mutations[0] as Node | MutationRecord | null | undefined

  while ((prev = prev?.previousSibling))
    if (prev instanceof HTMLDataElement) break // Get the previous sibling item

  return { item, previousItemSibling: prev }
}

const setLabels = (
  self: UHTMLTagsElement,
  itemChanged?: HTMLDataElement | null
) => {
  const input = getInput(self)
  const items = self.items
  const lang = { ...LANG, ...self.dataset }
  const action = itemChanged
    ? `${itemChanged?.parentNode ? lang.added : lang.removed} ${getText(itemChanged) || ''}, `
    : ''

  self.ariaLabel = getText(getRoot(self).querySelector(`[for="${self.id}"]`))
  if (input)
    input.ariaLabel = `${action}${self.ariaLabel}, ${items.length ? lang.found.replace('%d', `${items.length}`) : lang.empty}`

  items.forEach((item, index, { length }) => {
    item.ariaLabel = `${action}${getText(item)}, ${lang.remove}, ${index + 1} ${lang.of} ${length}`
  })
}

const isMouseInside = (el: Element, { clientX: x, clientY: y }: MouseEvent) => {
  const { top, right, bottom, left } = el.getBoundingClientRect()
  return y >= top && y <= bottom && x >= left && x <= right
}

const dispatchChange = (self: UHTMLTagsElement, item: HTMLDataElement) =>
  self.dispatchEvent(
    new CustomEvent('tags', { bubbles: true, cancelable: true, detail: item })
  )

function onMutation(
  self: UHTMLTagsElement,
  event?: CustomEvent<MutationRecord[]>
) {
  const change = self.contains(FOCUS_NODE) ? getChange(event?.detail) : null // Only calculate changes if focus is inside <u-tags>
  const input = getInput(self)
  const list = (input as HTMLInputElement)?.list
  const selected = list ? 'selected' : 'hidden' // Selected if <u-datalist>, hidden if <select>
  const options = list?.options || (input as HTMLSelectElement)?.options || []
  const values = Array.from(self.items, (item) => {
    item.role = 'button'
    item.tabIndex = -1
    if (!item.value) item.value = getText(item)
    return item.value
  })

  setLabels(self, change?.item)
  list?.setAttribute(SAFE_MULTISELECTABLE, 'true') // Make <u-datalist> multiselect
  Array.from(options, (opt) => (opt[selected] = values.includes(opt.value)))

  if (change) {
    const isDesktopFirefox = IS_FIREFOX && !IS_ANDROID
    const focusPrev = getRoot(self).activeElement
    const focusNext =
      (FOCUS_NODE === input && input) ||
      (change?.item?.parentNode && change.item) ||
      change?.previousItemSibling ||
      self.items[0] ||
      input

    // NOTE: VoiceOver iOS in will start announcing selected u-option, before moving focus to the input.
    // This is still a better user experience than keeping focus on the u-option as input is cleared
    // and the user gets information about wether the action was remove or add
    if (focusNext === input) {
      if (focusPrev === input) self.items[0]?.focus() // Move focus temporarily so we get ariaLabel change announced
      setTimeout(() => focusNext?.focus(), 100) // 100ms delay so VoiceOver + Chrome announces new ariaLabel
    } else focusNext?.focus() // Set focus to button right away to make NVDA happy
    setTimeout(() => {
      if (!isDesktopFirefox) return setLabels(self) // FireFox desktop announces ariaLabel changes
      on(self, 'focusout', () => setLabels(self), { once: true }) //...so we rather remove on blur
    }, 500)
  }
}

function onClick(self: UHTMLTagsElement, event: MouseEvent) {
  const items = [...self.items]
  const itemClicked = items.find((item) => isMouseInside(item, event)) // Use coordinates to inside since pointer-events: none will prevent correct event.target
  const itemRemove = items.find((item) => item.contains(event.target as Node)) // Only keyboard and screen reader can set event.target to element pointer-events: none

  if (itemRemove && dispatchChange(self, itemRemove)) return itemRemove.remove()
  if (itemClicked) return itemClicked.focus()
  if (event.target === self) self.querySelector('input')?.focus() // Focus <input> if click on <u-tags>
}

function onFocusIn({ currentTarget }: Event) {
  clearTimeout(BLUR_TIMER) // Prevent FOCUS_NODE reset if receiving new focus
  FOCUS_NODE = currentTarget as Node
}

function onFocusOut() {
  BLUR_TIMER = setTimeout(() => (FOCUS_NODE = null)) // Let event loop (and potential onFocusIn) run before resetting FOCUS_NODE
}

function onInput(self: UHTMLTagsElement, event: InputEvent) {
  if (event.inputType) return // Skip actual typing - clicking item in <datalist> or pressing "Enter" triggers onInput, but without inputType
  const input = event.target as HTMLInputElement
  const items = self.items
  const options = Array.from(input.list?.options || [])
  const optionClicked = options.find(({ value }) => value === input.value)
  const itemRemove = [...items].find((item) => item.value === input.value)
  const itemAdd = createElement('data', {
    textContent: optionClicked?.text || input.value,
    value: input.value
  })

  input.value = '' // Empty input
  FOCUS_NODE = event.target as Node // Move focus to input after adding/removing item

  if (!dispatchChange(self, itemRemove || itemAdd)) return onMutation(self) // Restore datalist state if preventDefault
  if (itemRemove) return itemRemove.remove()
  if (!items.length) return self.prepend(itemAdd) // If no items, add first
  items[items.length - 1].insertAdjacentElement('afterend', itemAdd) // Add after last item
}

function onKeyDown(self: UHTMLTagsElement, event: KeyboardEvent) {
  const { key, repeat, target: el } = event
  const input = getInput(self)
  const items = [...self.items, input].filter(Boolean)
  const index = items.findIndex((item) => item?.contains(el as Node))
  const isCaretAtStartOfInput = !(input as HTMLInputElement)?.selectionEnd
  let next = -1

  if (index === -1 || (el !== input && asButton(event))) return // No input or item focused or keydown to click on item
  if (key === 'ArrowRight') next = index + 1
  if (key === 'ArrowLeft' && isCaretAtStartOfInput) next = index - 1
  if (key === 'Enter' && el === input) {
    event.preventDefault() // Prevent submit
    const hasValue = !!input?.value.trim()
    if (hasValue) input?.dispatchEvent(new Event('input', { bubbles: true })) // Trigger input.value change
  }
  if (key === 'Backspace' || key === 'Delete') {
    if (repeat || !isCaretAtStartOfInput) return // Prevent multiple deletes and only delete if in caret is at start
    if (el === input) next = index - 1
    else if (dispatchChange(self, self.items[index])) items[index]?.remove()
  }
  if (items[next]) {
    event.preventDefault() // Prevent <u-datalist> moving focus to <input>
    items[next]?.focus()
  }
}

customElements.define('u-tags', UHTMLTagsElement)
