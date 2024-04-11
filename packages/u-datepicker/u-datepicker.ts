import {
  ARIA_DISABLED,
  ARIA_LABEL,
  DISPLAY_BLOCK,
  UHTMLElement,
  attachStyle,
  attr,
  getRoot,
  off,
  on
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-datepicker': UHTMLDatePickerElement
  }
}

// TODO: Announce button change also on year
// TODO: Add year to label if changing year
// TODO: Add month to label if changing month
// TODO: Read lang from parent or from <html> element
// TODO: Add custom days and months texts and firstDay
// TODO: WeekNumber?
// TODO: change month when focusing a date outside month

/**
 * The `<u-datepicker>` HTML element contains lets you pick a date from a grid.
 * No MDN reference available.
 */
export class UHTMLDatePickerElement extends UHTMLElement {
  #date = new Date()
  daysS: string[] = []
  daysL: string[] = []
  months: string[] = []
  firstDay = 1

  static get observedAttributes() {
    return ['lang', 'data-value', 'data-week-start']
  }
  constructor() {
    super()
    attachStyle(this, DISPLAY_BLOCK)
  }
  connectedCallback() {
    on(this, 'change', this)
    on(this, 'click', this)
    on(this, 'keydown', this)
    this.attributeChangedCallback('lang') // Setup attributes
  }
  disconnectedCallback() {
    off(this, 'change', this)
    off(this, 'click', this)
    off(this, 'keydown', this)
  }
  attributeChangedCallback(name?: string) {
    // if (this.disabled(this.date) && !this.disabled(this._date)) return (this.date = this._date) // Jump back
    if (name === 'lang') {
      const date = new Date(2023, 0, 1) // 2023 started on a Sunday
      const lang = this.lang || undefined
      const dayS = new Intl.DateTimeFormat(lang, { weekday: 'short' }).format
      const dayL = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format
      const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format

      this.daysL = Array.from(Array(7), (_, i) => dayL(date.setDate(i + 1)))
      this.daysS = Array.from(Array(7), (_, i) =>
        dayS(date.setDate(i + 1)).replace(/\.$/, '')
      ) // Remove trailing dot
      this.months = Array.from(Array(12), (_, i) => month(date.setMonth(i)))
    }
    const shouldFocus = this.contains(getRoot(this).activeElement)

    this.querySelectorAll('table').forEach((table) =>
      setupTable(this, table, shouldFocus)
    )
  }
  handleEvent(event: Event) {
    if (event.type === 'keydown') onKeyDown(this, event as KeyboardEvent)
  }
  get date(): Date {
    return new Date(this.#date) // return clone for immutability
  }
  set date(date: Date | number) {
    this.#date = new Date(date)
    this.attributeChangedCallback()
  }
}

const getYMD = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate()]

const setupTable = (
  self: UHTMLDatePickerElement,
  table: HTMLTableElement,
  focus: boolean
) => {
  if (!table.tHead) {
    table.innerHTML = `
    <caption></caption><thead><tr><th><abbr>${Array(8).join('</abbr></th><th><abbr>')}</abbr></tr></thead>
    <tbody>${Array(7).join(`<tr>${Array(8).join('<td><button type="button"></button></td>')}</tr>`)}</tbody>`
  }

  const [y, m, d] = getYMD(self.date)
  const todayYMD = getYMD(new Date()).join('-')
  const dateYMD = [y, m, d].join('-')
  const days = table.querySelectorAll<HTMLElement>('th abbr')
  const date = new Date(y, m, 1) // Set first day of month
  date.setDate(1 - date.getDay() + self.firstDay) // And move to first day of week

  if (table.caption) table.caption.textContent = `${self.months[m]}, ${y}`

  table.querySelectorAll('button').forEach((button, index) => {
    if (index < 7)
      Object.assign(days[index], {
        title: self.daysL[index],
        textContent: self.daysS[index]
      })
    const dayMonth = date.getMonth()
    const dayOfMonth = date.getDate()
    const dayYMD = getYMD(date).join('-')

    //button.disabled = false TODO
    if (focus && dayYMD === dateYMD) button.focus()
    button.tabIndex = dayYMD === dateYMD ? 0 : -1
    button.textContent = `${dayOfMonth}`
    button.value = `${date.getTime()}`
    attr(button, {
      'aria-current': dayYMD === todayYMD && 'date',
      [ARIA_DISABLED]: dayMonth !== m,
      [ARIA_LABEL]: `${dayOfMonth}., ${self.months[dayMonth]}`
    })
    date.setDate(dayOfMonth + 1)
  })
}

customElements.define('u-datepicker', UHTMLDatePickerElement)

function onKeyDown(self: UHTMLDatePickerElement, event: KeyboardEvent) {
  const { key } = event
  const [y, m, d] = getYMD(self.date)
  const day = self.date.getDay() + self.firstDay
  event.preventDefault()

  if (key === 'ArrowUp') self.date = new Date(y, m, d - 7) // Prev week
  if (key === 'ArrowDown') self.date = new Date(y, m, d + 7) // Next week
  if (key === 'ArrowLeft') self.date = new Date(y, m, d - 1) // Next day
  if (key === 'ArrowRight') self.date = new Date(y, m, d + 1) // Prev day

  if (key === 'PageUp' && !event.shiftKey) self.date = new Date(y, m - 1, d) // Prev month
  if (key === 'PageDown' && !event.shiftKey) self.date = new Date(y, m + 1, d) // Next month
  if (key === 'PageUp' && event.shiftKey) self.date = new Date(y - 1, m, d) // Prev year
  if (key === 'PageDown' && event.shiftKey) self.date = new Date(y + 1, m, d) // Next year
  if (key === 'Home') self.date = new Date(y, m, d - day)
  if (key === 'End') return // Last day of week
}

// const ADD = /([+-]\s*\d+)\s*(second|minute|hour|day|week|month|year)/g
// const DATE = {
//   year: 'FullYear',
//   month: 'Month',
//   week: 'Date',
//   day: 'Date',
//   hour: 'Hours',
//   minute: 'Minutes',
//   second: 'Seconds'
// }

// function parse(parse, from) {
//   if (isFinite(parse)) return new Date(Number(parse)) // Allow timestamps and Date instances

//   const text = String(parse).toLowerCase()
//   const date = new Date(from)
//   let m: RegExpExecArray | null

//   // match = [fullMatch, number, unit, mon, tue, etc...]
//   while ((m = ADD.exec(text)) !== null) {
//     const unit = DATE[m[2] as keyof typeof DATE]
//     const size = +`${m[1]}`.replace(/\s/g, '') * (m[2] === 'week' ? 7 : 1) // Strip whitespace and correct week
//     const before = date.getDate()

//     date[`set${unit}`](date[`get${unit}`]() + size) // Add day/month/week etc

//     // If day of month has changed, we have encountered dfferent length months, or leap year
//     if ((unit === 'month' || unit === 'year') && before !== date.getDate()) date.setDate(0)
//   }

//   return date
// }

// if (name === 'lang' || !this.#focus) {
//   const date = new Date(2023, 0, 1) // 2023 started on a Sunday
//   const lang = this.lang || undefined
//   const day = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format
//   const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format

//   this.#days = Array.from(Array(7), (_, i) => day(date.setDate(i + 1)))
//   this.#months = Array.from(Array(12), (_, i) => month(date.setMonth(i)))
// }

// import { addStyle, closest, dispatchEvent, toggleAttribute, queryAll } from '../utils'
// import parse from '@nrk/simple-date-parse'

// /**
//  * Handlers to fill in date value depending on type of value (as key) selected
//  * e.g. resolve if same day in month can be filled when selecting next month
//  */
// const FILL = {
//   month: (self, value) => {
//     if (!self.disabled(value)) return value
//     const firstAvailableDate = daysInMonth(self.parse(value)).filter(day => !self.disabled(day))[0]
//     return firstAvailableDate || value
//   },
//   null: (_self, value) => value
// }

// /**
//  * Handlers to resolve if entity with type of value (as key) is disabled
//  * e.g. resolve if a month can be selected or is disabled
//  */
// const DISABLED = {
//   month: (self, value) => {
//     const allDays = daysInMonth(self.parse(value))
//     const allDaysDisabled = allDays.map(day => self.disabled(day)).reduce((a, b) => a && b)
//     return allDaysDisabled
//   },
//   null: (self, value) => self.disabled(value)
// }
// const MASK = { year: '*-m-d', month: 'y-*-d', day: 'y-m-*', hour: '*:m', minute: 'h:*', second: 'h:m:*', timestamp: '*', null: '*' }
// const KEYS = { 33: '-1month', 34: '+1month', 35: 'y-m-99', 36: 'y-m-1', 37: '-1day', 38: '-1week', 39: '+1day', 40: '+1week' }
// const MONTHS = 'januar,februar,mars,april,mai,juni,juli,august,september,oktober,november,desember'
// const DAYS = 'man,tirs,ons,tors,fre,lør,søn'

// export default class CoreDatepicker extends HTMLElement {
//   static get observedAttributes () { return ['date', 'months', 'days'] }

//   connectedCallback () {
//     this._date = this.date // Store for later comparison and speeding up things
//     document.addEventListener('click', this)
//     document.addEventListener('change', this)
//     document.addEventListener('keydown', this)
//     setTimeout(() => this.attributeChangedCallback()) // Render after children is parsed
//     addStyle(this.nodeName, `${this.nodeName}{display:block}`) //  default to display block
//   }

//   disconnectedCallback () {
//     this._date = this._disabled = null // Garbage collection
//     document.removeEventListener('click', this)
//     document.removeEventListener('change', this)
//     document.removeEventListener('keydown', this)
//   }

//   attributeChangedCallback (attr, prev, next) {
//     if (!this.parentNode) return // Only render after connectedCallback
//     if (this.disabled(this.date) && !this.disabled(this._date)) return (this.date = this._date) // Jump back

//     // Treat change between null and 0, either way, as a valid change for dispatching event
//     if (this.diff(this.date) || (prev === null && next === '0') || (prev === '0' && next === null)) dispatchEvent(this, 'datepicker.change', this._date = this.date)
//     forEachController('button', this, setupButton)
//     forEachController('select', this, setupSelect)
//     forEachController('input', this, setupInput)
//     forEachController('table', this, setupTable)
//   }

//   handleEvent (event) {
//     // Filter event and target
//     if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (event.type === 'keydown' && !KEYS[event.keyCode])) return
//     if (!this.contains(event.target) && !closest(event.target, `[for="${this.id}"],[data-for="${this.id}"]`)) return

//     if (event.type === 'change') {
//       const changeMask = MASK[event.target.getAttribute('data-type')].replace('*', event.target.value)
//       this.date = FILL[event.target.getAttribute('data-fill')](this, changeMask)
//     } else if (event.type === 'click') {
//       const button = closest(event.target, 'button[value]')
//       const table = closest(event.target, 'table')
//       if (button) this.date = button.value
//       if (button && table) dispatchEvent(this, 'datepicker.click.day')
//     } else if (event.type === 'keydown') {
//       const table = closest(event.target, 'table')
//       if (table) {
//         this.date = KEYS[event.keyCode]
//         table.querySelector('[autofocus]').focus()
//         event.preventDefault() // Prevent scrolling
//       }
//     }
//   }

//   diff (val) { return this.parse(val).getTime() - this.timestamp }

//   parse (val, from) { return parse(val, from || this._date || Date.now()) }

//   get disabled () { return this._disabled || Function.prototype }

//   set disabled (fn) {
//     if (typeof fn !== 'function') this._disabled = () => Boolean(fn)
//     else this._disabled = (val) => val !== null && fn(this.parse(val), this) // null is always false / never disabled
//     this.attributeChangedCallback() // Re-render
//   }

//   get timestamp () { return this._date ? this._date.getTime() : null }

//   // Stringify for consistency with pad and for truthy '0'
//   get year () { return this._date ? String(this._date.getFullYear()) : null }

//   get month () { return this._date ? pad(this._date.getMonth() + 1) : null }

//   get day () { return this._date ? pad(this._date.getDate()) : null }

//   get hour () { return this._date ? pad(this._date.getHours()) : null }

//   get minute () { return this._date ? pad(this._date.getMinutes()) : null }

//   get second () { return this._date ? pad(this._date.getSeconds()) : null }

//   get date () {
//     let dateAttr = this.getAttribute('date')
//     if (!dateAttr) {
//       dateAttr = this.getAttribute('timestamp')
//       if (!dateAttr) return null
//       this.removeAttribute('timestamp')
//       console.warn(this, 'uses deprecated `timestamp` attribute. Please use `date` as specified in the docs (https://static.nrk.no/core-components/latest/index.html?core-datepicker/readme.md). Note that the attribute has been removed to avoid confusion with the `date` attribute')
//     }
//     return this.parse(dateAttr)
//   }

//   set date (val) {
//     return val === null ? this.removeAttribute('date') : this.setAttribute('date', this.parse(val).getTime())
//   }

//   set months (val) { this.setAttribute('months', [].concat(val).join(',')) }

//   get months () { return (this.getAttribute('months') || MONTHS).split(/\s*,\s*/) }

//   set days (val) { this.setAttribute('days', [].concat(val).join(',')) }

//   get days () { return (this.getAttribute('days') || DAYS).split(/\s*,\s*/) }
// }

// const pad = (val) => `0${val}`.slice(-2)

// const forEachController = (css, self, fn) => [].forEach.call(document.getElementsByTagName(css), (el) => {
//   if (self.contains(el) || self.id === (el.getAttribute('data-for') || el.getAttribute('for'))) fn(self, el)
// })

// function setupButton (self, el) {
//   if (!el.value) return // Skip buttons without a set value
//   el.type = 'button' // Ensure forms are not submitted by datepicker-buttons
//   el.disabled = self.disabled(el.value)
// }

// function setupInput (self, el) {
//   const type = el.getAttribute('data-type') || el.getAttribute('type')
//   if (type === 'radio' || type === 'checkbox') {
//     el.disabled = self.disabled(el.value)
//     el.checked = !self.diff(el.value)
//   } else if (MASK[type]) {
//     el.setAttribute('type', 'number') // Set input type to number
//     el.setAttribute('data-type', type) // And store original type
//     el.value = self[type]
//   }
// }

// function setupTable (self, table) {
//   if (!table.firstElementChild) {
//     table.innerHTML = `
//     <caption></caption><thead><tr>${Array(8).join('</th><th>')}</tr></thead>
//     <tbody>${Array(7).join(`<tr>${Array(8).join('<td><button type="button"></button></td>')}</tr>`)}</tbody>`
//   }

//   const today = new Date()
//   const date = self._date || today
//   const month = date.getMonth()
//   const day = self.parse('y-m-1 mon', date) // Monday in first week of month
//   table.caption.textContent = `${self.months[month]}, ${date.getFullYear()}`
//   queryAll('th', table).forEach((th, day) => (th.textContent = self.days[day]))
//   queryAll('button', table).forEach((button) => {
//     const isToday = day.getDate() === today.getDate() && day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear()
//     const isSelected = self._date === null ? isToday : !self.diff(day)
//     const dayInMonth = day.getDate()
//     const dayMonth = day.getMonth()

//     button.textContent = dayInMonth // Set textContent instead of innerHTML avoids reflow
//     button.value = `${day.getFullYear()}-${dayMonth + 1}-${dayInMonth}`
//     button.disabled = self.disabled(day)
//     button.setAttribute('tabindex', Number(isSelected) - 1)
//     button.setAttribute('data-adjacent', month !== dayMonth)
//     button.setAttribute('aria-label', `${dayInMonth}. ${self.months[dayMonth]}`)
//     button.setAttribute('aria-current', isToday && 'date')
//     toggleAttribute(button, 'autofocus', isSelected)
//     day.setDate(dayInMonth + 1)
//   })
// }

// /**
//  *
//  * @param {CoreDatepicker} self
//  * @param {HTMLSelectElement} select
//  */
// function setupSelect (self, select) {
//   if (!select.firstElementChild) {
//     select._autofill = true
//     select.setAttribute('data-fill', 'month')
//     select.innerHTML = self.months.map((_, month) =>
//       `<option value="y-${month + 1}-d"></option>`
//     ).join('')
//   }
//   const disabled = DISABLED[select.getAttribute('data-fill')]
//   queryAll(select.children).forEach((option, month) => {
//     if (select._autofill) option.textContent = self.months[month]
//     option.disabled = disabled(self, option.value)
//     option.selected = !self.diff(option.value)
//   })
// }

// /**
//  * Returns array of days in the month containing the dateInMonth param
//  * @param {Date} dateInMonth
//  * @returns {Date[]} Array of days in the month in question
//  */
// function daysInMonth (dateInMonth) {
//   const date = new Date(dateInMonth)
//   date.setDate(1)

//   const month = date.getMonth()
//   const days = []
//   while (date.getMonth() === month) {
//     days.push(new Date(date))
//     date.setDate(date.getDate() + 1)
//   }
//   return days
// }

// https://github.com/nrkno/simple-date-parse
// const DATE = { year: 'FullYear', month: 'Month', week: 'Date', day: 'Date', hour: 'Hours', minute: 'Minutes', second: 'Seconds' }
// const ADD = /([+-]\s*\d+)\s*(second|minute|hour|day|week|month|year)|(mon)|(tue)|(wed)|(thu)|(fri)|(sat)|(sun)/g
// const YMD = /([-\dy]+)[-/.]([\dm]+)[-/.]([\dd]+)/
// const HMS = /([\dh]+):([\dm]+):?([\ds]+)?/

// export default function parse (parse, from) {
//   if (isFinite(parse)) return new Date(Number(parse)) // Allow timestamps and Date instances

//   const text = String(parse).toLowerCase()
//   const date = new Date((isFinite(from) && text.indexOf('now') === -1) ? Number(from) : Date.now())
//   const [, year = 'y', month = 'm', day = 'd'] = text.match(YMD) || []
//   const [, hour = 'h', minute = 'm', second = 's'] = text.match(HMS) || []
//   let match = { year, month, day, hour, minute, second }

//   Object.keys(match).forEach((unit) => {
//     const move = unit === 'month' ? 1 : 0 // Month have zero based index
//     const prev = String(date[`get${DATE[unit]}`]() + move) // Shift to consistent index
//     match[unit] = match[unit].replace(/[^-\d]+/g, (match, index, next) => { // Replace non digit chars
//       if (index) return prev.substr(prev.length - next.length + index, match.length) // Inside: copy match.length
//       return prev.substr(0, Math.max(0, prev.length - next.length + match.length)) // Start: copy leading chars
//     }) - move
//   })

//   // Keep units within boundries
//   const lastDayInMonth = new Date(match.year, Math.min(12, match.month + 1), 0).getDate()
//   date.setFullYear(match.year, Math.min(11, match.month), Math.max(1, Math.min(lastDayInMonth, match.day)))
//   date.setHours(Math.min(24, match.hour), Math.min(59, match.minute), Math.min(59, match.second))

//   while ((match = ADD.exec(text)) !== null) { // match = [fullMatch, number, unit, mon, tue, etc...]
//     const unit = match[2]
//     const size = String(match[1]).replace(/\s/g, '') * (unit === 'week' ? 7 : 1) // Strip whitespace and correct week
//     const day = match.slice(2).indexOf(match[0]) // Weekdays starts at 3rd index but is not zero based
//     const before = date.getDate()

//     if (unit) date[`set${DATE[unit]}`](date[`get${DATE[unit]}`]() + size) // Add day/month/week etc
//     else date.setDate(date.getDate() - (date.getDay() || 7) + day) // Adjust weekday and make sunday 7th day

//     // If day of month has changed, we have encountered dfferent length months, or leap year
//     if ((unit === 'month' || unit === 'year') && before !== date.getDate()) date.setDate(0)
//   }

//   return date
// }

// const DATE = { year: 'FullYear', week: 'Date', day: 'Date', month: 'Month' }
// type DateSize = `${'+' | '-' | ''}${number}`
// type DateUnit = 'day' | 'week' | 'month'
// type DateStr = `${DateSize} ${DateUnit}`

// const parseDate = (str: DateStr, from: Date | number = Date.now()) => {
//   const [rawSize, rawUnit] = str.split(' ') as [DateSize, DateUnit]
//   const size = rawUnit === 'week' ? 7 : Number(rawSize)
//   const unit = DATE[rawUnit]
//   const date = new Date(from)

//   date[`set${unit}`](date[`get${unit}`]() + size)
//   return date
// }
