export type { UHTMLOptionElement } from '../u-datalist/u-option'
import '../u-datalist/u-option'
import {
  IS_BROWSER,
  UHTMLElement,
  createElement,
  customElements,
  getRoot,
  off,
  on
} from '../utils'
import { getWeekStartByRegion } from 'weekstart'

declare global {
  interface HTMLElementTagNameMap {
    'u-datepicker': UHTMLDatePickerElement
    // 'u-datepicker-head': UHTMLDatePickerHeadElement
    // 'u-datepicker-option': HTMLOptionElement
  }
}
// TODO: Announce button change also on year
// TODO: Add year to label if changing year
// TODO: Add focus as prop
// TODO: Disabled
// TODO: Find focus from selected (if not provided), and fallback to today if none provided
// TODO: change month when screen reader focusing a date outside month (buggy now)
// TODO: u-datepicker-date.value/.ymd? readOnly
// TODO: weeknumber attribute
// TODO: copy -item and -head elements - replacing <slot> for text
// TODO: Remove trailing dot in short days?
// TODO: Reuse u-datepicker-item and u-datepicker-head

type DateValue = Date | number | string

let IS_POINTER = false // Used in screen-reader vs pointer-detection
const DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]
const EVENTS = 'click,focusin,keydown,pointerdown,pointerup'
const TEMPLATE = (IS_BROWSER &&
  createElement('template', {
    innerHTML: `
      <div role="rowgroup"><div role="row" part="days"><div role="columnheader" part="weeknumber"></div>${`<div part="day" role="columnheader"><slot name="-"></slot></div>`.repeat(7)}</div></div>
      <div role="rowgroup" part="dates">${`<div role="row" part="row"><div role="rowheader" part="weeknumber"></div>${`<slot name="-" role="cell"><time></time></slot>`.repeat(7)}</div>`.repeat(7)}</div>
      <style>
        :host(:not([hidden])) { display: grid; grid-template-columns: repeat(8, 1fr); grid-auto-rows: auto; text-align: center }
        :host > div, :host > div > div { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid }
        /* :host > div:first-child { display: none } */
        :host::before { content: attr(aria-label); position: absolute; margin-top: -2rem }
      </style>`
  })) as HTMLTemplateElement

/**
 * The `<u-datepicker>` HTML element contains lets you pick a date from a grid.
 * No MDN reference available.
 */
export class UHTMLDatePickerElement extends UHTMLElement {
  #daysLong: string[] = []
  #daysShort: string[] = []
  #focused = new Date()
  #months: string[] = []
  #options: HTMLTimeElement[]
  #slots: NodeListOf<HTMLSlotElement>
  weekStart = 0

  static observedAttributes = ['lang'] // data-weeknumer
  constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'closed' })
    shadow.append(TEMPLATE.content.cloneNode(true))
    this.#slots = shadow.querySelectorAll('slot')
    this.#options = [...shadow.querySelectorAll('time')]
    this.append(...this.#options)
  }
  connectedCallback() {
    this.role = 'table'
    this.lang || this.attributeChangedCallback() // Ensure attributeChangedCallback is called on connect
    on(this, EVENTS, this)
  }
  disconnectedCallback() {
    off(this, EVENTS, this)
  }
  attributeChangedCallback() {
    const date = new Date(2023, 0, 1) // 2023 started on a Sunday
    const lang = this.closest('[lang]')?.getAttribute('lang') || 'en'
    const locale = new Intl.Locale(lang)
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format
    const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format

    this.#daysShort = Array.from(Array(7), (_, i) => short(date.setDate(i + 1)))
    this.#daysLong = Array.from(Array(7), (_, i) => long(date.setDate(i + 1)))
    this.#months = Array.from(Array(12), (_, i) => month(date.setMonth(i))) // Must be after days last to not change week
    this.weekStart = getWeekStartByRegion(locale.region || 'GB')

    this.#render()
  }
  handleEvent(event: Event) {
    if (event.type === 'click') onClick(this, event)
    if (event.type === 'focusin' && !IS_POINTER) onFocusIn(this, event) // Focus-to-move when screen reader is moving focus
    if (event.type === 'keydown') onKeyDown(this, event as KeyboardEvent)
    if (event.type === 'pointerdown') IS_POINTER = true // Prevent focus-to-move when touch/mouse interaction
    if (event.type === 'pointerup') IS_POINTER = false // Re-enable focus-to-move
  }
  get focused(): Date {
    return new Date(this.#focused) // return clone for immutability
  }
  set focused(value: DateValue) {
    const prev = this.focused
    const next = new Date(Number.isFinite(+value) ? +value : value) // Allow timestamps as string as well

    if (+prev === +next) return // Skip if same date, preventing infinite loop
    this.#focused = next
    this.attributeChangedCallback()
    console.log(prev, next)
  }
  get selected(): Date[] {
    const values = this.getAttribute('data-value')?.split(',') || []
    return values.map((val) => new Date(val))
  }
  set selected(value: DateValue | DateValue[]) {
    const dates = Array.from([value].flat(), (val) => new Date(val))
    this.setAttribute('data-value', dates.map(Number).join(','))
  }
  #render() {
    const date = this.focused
    const focused = getRoot(this).activeElement
    const month = date.getMonth()
    const focusedYMD = getYMD(date)
    const shouldFocus = this.contains(focused)
    const todayYMD = getYMD(new Date())
    const week = this.getAttribute('data-weeknumber')
    // const values = this.selected.map((date) => getYMD(date))
    const templates = [...this.querySelectorAll('time')].reduce(
      (all, opt) => {
        if (!this.#options.includes(opt))
          all[getYMD(new Date(opt.dateTime))] = opt
        return all
      },
      {} as Record<string, HTMLTimeElement>
    )

    // const locale = new Intl.Locale(attr(this.closest('[lang]'), 'lang') || 'en')
    // const format = new Intl.DateTimeFormat(locale, {
    //   weekday: 'long',
    //   month: 'long',
    //   day: 'numeric'
    // }).format

    this.ariaLabel = `${this.#months[month]}, ${date.getFullYear()}` // Set before manipulating date
    date.setDate(1 - new Date(date.setDate(1)).getDay() + this.weekStart) // Move to first day of week

    this.#slots.forEach((slot, index) => {
      if (index < 7) {
        const day = (index + this.weekStart) % 7
        const cell = slot.parentElement! // aria-label does not work on <slot> so we use a parent <div>
        slot.name = DAYS[day]
        slot.textContent = this.#daysShort[day]
        cell.ariaLabel = this.#daysLong[day]
        cell.setAttribute('part', `day ${DAYS[day]}`)
        if (!index) cell.previousElementSibling!.textContent = week || ''
      } else {
        if (!(index % 7)) {
          const th = slot.previousElementSibling!
          const num = `${getWeek(date)}`
          th.ariaLabel = week ? `${week} ${num}` : ''
          th.textContent = week ? num : ''
        }

        const ymd = getYMD(date)
        const day = date.getDate()
        const opt = templates[ymd] || this.#options[index - 7]
        const content = opt.querySelector('slot') || opt

        content.textContent = `${day}`
        opt.ariaCurrent = ymd === todayYMD ? 'date' : 'false'
        opt.ariaDisabled = `${date.getMonth() !== month}`
        opt.ariaLabel = `${day} ${this.#months[date.getMonth()]}`
        opt.ariaPressed = opt.ariaSelected || opt.ariaPressed
        opt.ariaSelected = null
        opt.role = 'button'
        opt.slot = slot.name = ymd
        opt.tabIndex = ymd === focusedYMD ? 0 : -1
        opt.dateTime = `${date.getTime()}`

        if (shouldFocus && ymd === focusedYMD && focused !== opt) opt.focus()
        date.setDate(day + 1)
      }
    })
  }
}

// export class UHTMLDatePickerHeadElement extends UHTMLElement {
//   connectedCallback() {
//     this.role = 'columnheader'
//   }
//   get text(): string {
//     return slotText(this)
//   }
//   set text(value: string) {
//     slotText(this, value)
//   }
// }

// export class UHTMLDatePickerOptionElement extends UHTMLElement {
//   connectedCallback() {
//     this.role = 'button'
//   }
//   get value(): string {
//     return attr(this, 'value') || ''
//   }
//   set value(value: string) {
//     attr(this, 'value', value)
//   }
//   get text(): string {
//     return slotText(this)
//   }
//   set text(value: string) {
//     slotText(this, value)
//   }
// }

// new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' }).format

// const slotText = (self: HTMLElement, text?: string) => {
//   const el = self.querySelector('slot') || self
//   return text ? (el.textContent = text) : el.textContent || ''
// }

// const slotMap = <TagName extends keyof HTMLElementTagNameMap>(
//   self: HTMLElement,
//   tagName: TagName
// ) =>
//   [...self.querySelectorAll(tagName)].reduce(
//     (all, el) => (all[el.slot || 'template'] = el) && all,
//     { template: createElement(tagName) } as Record<string, HTMLElement>
//   )

const getYMD = (d: Date) =>
  [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-')

// Souce: https://stackoverflow.com/a/6117889
const getWeek = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)) // ISO-week starts on Monday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7)
}

// eslint-disable-next-line
// const setupGrid = (self: UHTMLDatePickerElement) => {
//   const [y, m, d] = getYMD(self.focused)
//   const dateYMD = [y, m, d].join('-')
//   const todayYMD = getYMD(new Date()).join('-')
//   const focused = getRoot(self).activeElement
//   const shouldFocus = self.contains(focused)
//   const values = self.selected.map((date) => getYMD(date).join('-'))
//   const items = [...self.children] as HTMLElement[]
//   const date = self.focused
//   const week = items[0]?.ariaLabel || items[0]?.textContent || 'Week'
//   date.setDate(1) // Set first day of month
//   date.setDate(1 - date.getDay() + self.weekStart) // And move to first day of week

//   self.ariaLabel = `${self.months[m]}, ${y}`
//   items.forEach((item, index) => {
//     if (index < 8) return
//     if (index % 8 === 0) {
//       const weekInt = getWeek(date)
//       item.ariaLabel = `${week} ${weekInt}`
//       item.textContent = `${weekInt}`
//     } else {
//       const dayMonth = date.getMonth()
//       const dayOfMonth = date.getDate()
//       const dayYMD = getYMD(date).join('-')

//       //button.disabled = false TODO
//       item.textContent = `${dayOfMonth}`
//       attr(item, {
//         'aria-current': dayYMD === todayYMD && 'date',
//         'aria-pressed': values.includes(dayYMD),
//         'data-value': date.getTime(),
//         [ARIA_DISABLED]: dayMonth !== m,
//         [ARIA_LABEL]: `${dayOfMonth}, ${self.months[dayMonth]}`,
//         role: 'button',
//         tabindex: dayYMD === dateYMD ? 0 : -1
//       })
//       if (shouldFocus && dayYMD === dateYMD && focused !== item) item.focus()
//       date.setDate(dayOfMonth + 1)
//     }
//   })
// }

function onClick(self: UHTMLDatePickerElement, { target }: Event) {
  console.log('onClick')
  const button = (target as Element)?.closest<HTMLButtonElement>('td button')
  if (button) self.focused = button.value
}

function onFocusIn(self: UHTMLDatePickerElement, { target }: Event) {
  console.log('onFocusIn')
  const button = (target as Element)?.closest<HTMLButtonElement>('td button')
  if (button) self.focused = button.value
}

function onKeyDown(self: UHTMLDatePickerElement, event: KeyboardEvent) {
  const { key, shiftKey: shift } = event
  const d = self.focused
  const weekStart = d.getDate() - d.getDay() + self.weekStart
  let next: number | null = null

  if (key === 'ArrowUp') next = d.setDate(d.getDate() - 7) // Prev week
  if (key === 'ArrowDown') next = d.setDate(d.getDate() + 7) // Next week
  if (key === 'ArrowLeft') next = d.setDate(d.getDate() - 1) // Next day
  if (key === 'ArrowRight') next = d.setDate(d.getDate() + 1) // Prev day

  if (key === 'PageUp' && !shift) next = d.setMonth(d.getMonth() - 1) // Prev month
  if (key === 'PageDown' && !shift) next = d.setMonth(d.getMonth() + 1) // Next month
  if (key === 'PageUp' && shift) next = d.setFullYear(d.getFullYear() - 1) // Prev year
  if (key === 'PageDown' && shift) next = d.setFullYear(d.getFullYear() + 1) // Next year
  if (key === 'Home') next = d.setDate(weekStart) // First day of week
  if (key === 'End') next = d.setDate(weekStart + 7) // Last day of week

  if (typeof next === 'number') {
    event.preventDefault() // TODO Move
    self.focused = next
  }
}

customElements.define('u-datepicker', UHTMLDatePickerElement)
// customElements.define('u-datepicker-optgroup', UHTMLDatePickerHeadElement)
// customElements.define('u-datepicker-option', UHTMLDatePickerOptionElement)
