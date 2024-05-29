import {
  FOCUS_OUTLINE,
  IS_FIREFOX,
  IS_IOS,
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
}

let BLUR_TIMER: ReturnType<typeof setTimeout>
let FOCUS_NODE: Node | null // Store what node had focus so we can move focus to relevant element on delete
const EVENTS = 'click,change,input,focusin,focusout,keydown'
const LANG = {
  added: 'Added',
  delete: 'Press to delete',
  deleted: 'Deleted',
  empty: 'No selected',
  found: 'Navigate left to find %d selected',
  of: 'of'
}

// TODO: Announce datalist items count on type?
// TODO: dispatch onChange (to fill select, or enable/disable tag creation/min/max)

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
        ::slotted(data)::after { content: '\\00D7'; content: '\\00D7' / ''; display: inline-block; padding-inline: .5ch; pointer-events: auto }
        ::slotted(data:focus)::after { ${FOCUS_OUTLINE} }` // Show focus outline around ::after only
      })
    )
  }
  connectedCallback() {
    mutationObserver(this, { childList: true }) // Observe u-datalist to add aria-multiselect="true"
    on(this, EVENTS, this)
    onMutation(this)
  }
  disconnectedCallback() {
    mutationObserver(this, false)
    off(this, EVENTS, this)
  }
  handleEvent(event: Event) {
    if (event.defaultPrevented) return // Allow all events to be canceled
    if (event.type === 'click') onClick(this, event as MouseEvent)
    if (event.type === 'focusin' || event.type === 'focusout') onFocus(event)
    if (event.type === 'input') onInput(this, event as InputEvent)
    if (event.type === 'keydown') onKeyDown(this, event as KeyboardEvent)
    if (event.type === 'mutation') onMutation(this, event as CustomEvent)
  }
  get items(): NodeListOf<HTMLDataElement> {
    return this.querySelectorAll('data')
  }
}

const getText = (el?: Node | null) => el?.textContent?.trim() || ''
const getInput = (self: UHTMLTagsElement) => self.querySelector('input')
const getChange = (mutations: MutationRecord[] = []) => {
  const diff = mutations.flatMap((m) => [...m.addedNodes, ...m.removedNodes])
  const item = !diff[1] && diff[0] instanceof HTMLDataElement ? diff[0] : null // Only return if single item has changed
  let el = mutations[0] as Node | MutationRecord | null | undefined

  while ((el = el?.previousSibling)) if (el instanceof HTMLDataElement) break // Get the previous sibling item
  return { item, prev: el }
}

const setLabels = (self: UHTMLTagsElement, item?: HTMLDataElement | null) => {
  const input = getInput(self)
  const items = self.items
  const total = items.length
  const lang = { ...LANG, ...self.dataset }
  const label =
    self.ariaLabel || getText(getRoot(self).querySelector(`[for="${self.id}"]`))

  const announce = item
    ? `${item.parentNode ? lang.added : lang.deleted} ${getText(item) || ''}, `
    : ''

  if (label) self.ariaLabel = label
  if (input)
    input.ariaLabel = `${announce}${label}, ${total ? lang.found.replace('%d', `${total}`) : lang.empty}`

  items.forEach((item, index) => {
    item.ariaLabel = `${announce}${getText(item)}, ${lang.delete}, ${index + 1} ${lang.of} ${total}`
  })
}

const isMouseInside = (el: Element, { clientX: x, clientY: y }: MouseEvent) => {
  const { top, right, bottom, left } = el.getBoundingClientRect()
  return y >= top && y <= bottom && x >= left && x <= right
}

function onMutation(
  self: UHTMLTagsElement,
  event?: CustomEvent<MutationRecord[]>
) {
  const change = self.contains(FOCUS_NODE) ? getChange(event?.detail) : null
  const input = getInput(self)
  const isAdd = change?.item?.parentNode && change.item
  const isInput = FOCUS_NODE === input && input
  const list = input?.list
  const target = isInput || isAdd || change?.prev || self.items[0] || input
  const values = Array.from(self.items, (item) => {
    item.role = 'button'
    item.tabIndex = -1
    return (item.value = item.value || getText(item))
  })

  setLabels(self, change?.item)
  list?.setAttribute(SAFE_MULTISELECTABLE, 'true') // Make <u-datalist> multiselect
  Array.from(list?.options || [], (opt) => {
    opt.selected = values.includes(opt.value)
  })

  if (change) {
    setTimeout(() => !IS_IOS && target?.focus(), 100) // 100ms delay so VoiceOver + Chrome announces new ariaLabel
    setTimeout(() => {
      if (!IS_FIREFOX) return setLabels(self) // FireFox announces ariaLabel changes
      on(self, 'focusout', () => setLabels(self), { once: true }) //...so we rather remove on blur
    }, 500)
  }
}

function onClick(self: UHTMLTagsElement, event: MouseEvent) {
  const items = [...self.items]
  const item = items.find((item) => isMouseInside(item, event)) // Use coordinates to inside since pointer-events: none will prevent correct event.target
  const remove = items.find((item) => item.contains(event.target as Node)) // Only keyboard and screen reader can set event.target to element pointer-events: none

  if (remove) remove.remove()
  else if (item) item.focus()
  else if (event.target === self) self.querySelector('input')?.focus() // Focus <input> if click on <u-tags>
}

function onFocus({ type, currentTarget }: Event) {
  // Let event loop run before reseting FOCUS_NODE, and prevent reset if receiving new focus
  if (type === 'focusout') BLUR_TIMER = setTimeout(() => (FOCUS_NODE = null))
  else clearTimeout(BLUR_TIMER), (FOCUS_NODE = currentTarget as Node)
}

function onInput(self: UHTMLTagsElement, { inputType, target }: InputEvent) {
  if (inputType || !(target instanceof HTMLInputElement)) return // Clicking item in <datalist> triggers onInput, but without inputType
  const { list, value } = target
  const items = [...self.items].reverse() // Reversed so it is easy to get last item
  const option = [...(list?.options || [])].find((opt) => opt.value === value)
  const remove = items.find((item) => item.value === value)

  FOCUS_NODE = target // Set focus to input even thought it might be on a <u-option>
  target.value = '' // Empty input
  if (remove) return remove.remove()
  ;(items[0] || self).insertAdjacentElement(
    items[0] ? 'afterend' : 'afterbegin', // Insert after last item OR as first element if no items
    createElement('data', { textContent: option?.text || value, value })
  )
}

function onKeyDown(self: UHTMLTagsElement, event: KeyboardEvent) {
  const { key, repeat, target: el } = event
  const input = getInput(self)
  const items = [...self.items, input].filter(Boolean)
  const index = items.findIndex((item) => item?.contains(el as Node))
  const isInsideText = input?.selectionEnd
  let next = -1

  if (index === -1 || (el !== input && asButton(event))) return // No input or tag focused or keydown to click on tag
  if (key === 'ArrowRight') next = index + 1
  if (key === 'ArrowLeft' && !isInsideText) next = index - 1
  if (key === 'Enter' && el === input) {
    event.preventDefault() // Prevent submit
    const hasValue = !!input?.value.trim()
    if (hasValue) input?.dispatchEvent(new Event('input', { bubbles: true })) // Trigger input.value change
  }
  if ((key === 'Backspace' || key === 'Delete') && !repeat && !isInsideText) {
    if (el === input) next = index - 1
    else items[index]?.remove()
  }
  if (items[next]) {
    event.preventDefault() // Prevent <u-datalist> moving focus to <input>
    items[next]?.focus()
  }
}

customElements.define('u-tags', UHTMLTagsElement)
