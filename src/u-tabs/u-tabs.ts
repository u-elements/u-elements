import {
  asButton,
  attr,
  define,
  on,
  off,
  getRoot,
  style
  // useId
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-tabs': UTabs
    'u-tablist': UTabList
    'u-tab': UTab
    'u-tabpanel': UTabPanel
  }
}

// Note: Chrome must have aria-selected="false" on role="tab" to not announce "selected"

// We want to automatically connect tabs and panels but we need to
// debounce this per tablist so we have all related items are rendered
const timers = new WeakMap<UTabList, ReturnType<typeof setTimeout>>()
const connect = console.log
const debouncedConnect = (self: UTabList | null) => {
  if (self) {
    clearTimeout(timers.get(self))
    timers.set(self, setTimeout(connect, 0, self)) // Let DOM render before connecting
  }
}

export class UTabs extends HTMLElement {
  get tablist(): UTabList | null {
    return getOwn<UTabList>('u-tablist', this)[0] || null
  }
  get tabs() {
    return getOwn<UTab>('u-tab', this)
  }
  get panels() {
    return getOwn<UTabPanel>('u-tabpanel', this)
  }
}

export class UTabList extends HTMLElement {
  constructor() {
    super()
    attr(this, 'role', 'tablist')
    style(this, `:host(:not([hidden])) { display: block }`)
  }
  connectedCallback() {
    on(this, 'click,keydown', this)
    // debouncedConnect(this)
  }
  disconnectedCallback() {
    off(this, 'click,keydown', this)
  }
  handleEvent(event: KeyboardEvent) {
    if (event.type === 'mutation') {
      console.log(event)
    }
    if (event.type === 'keydown' && !event.defaultPrevented) {
      const { key } = event
      const tabs = Array.from(this.tabs)
      let index = tabs.findIndex((tab) => tab.contains(event.target as Node))

      if (index === -1) return // Not an u-tab or is placed outside u-tabs
      if (asButton(event)) return // Forward action to click event
      else if (key === 'ArrowDown' || key === 'ArrowRight')
        index = ++index % tabs.length
      else if (key === 'ArrowUp' || key === 'ArrowLeft')
        index = (index || tabs.length) - 1
      else if (key === 'End') index = tabs.length - 1
      else if (key === 'Home') index = 0
      else return // Do not hijack other keys

      event.preventDefault()
      tabs[index].focus() // Only move focus, only load in click
    }
  }
  get tabs(): HTMLCollectionOf<UTab> {
    return this.getElementsByTagName('u-tab') as HTMLCollectionOf<UTab>
  }
}

export class UTab extends HTMLElement {
  static get observedAttributes() {
    return ['aria-selected', 'aria-controls', 'id']
  }
  constructor() {
    super()
    const tabIndex = this.selected ? 0 : -1
    attr(this, { role: 'tab', 'aria-selected': !tabIndex, tabIndex })
    style(
      this,
      `:host(:not([hidden])) { display: inline-block }
      :host(:not([aria-disabled="true"])) { cursor: pointer }`
    )
  }
  connectedCallback() {
    on(this, 'click,keydown', this)
    debouncedConnect(this.tablist)
    // setTimeout(() => {
    //   console.log(getPanels(this.tablist))
    // })
    // const utabs = this.closest<UTabs>('u-tabs')
    // if (utabs && !attr(this, 'aria-controls')) {
    //   const panel = utabs.panels.find(({ tab }) => !tab)
    //   console.log(utabs.panels, panel)
    //   attr(this, 'aria-controls', useId(panel))
    // }
    // this.attributeChangedCallback()
  }
  disconnectedCallback() {
    off(this, 'click,keydown', this)
  }
  // attributeChangedCallback() {
  //   debouncedConnect(this.tablist)
  // }
  handleEvent(event: Event) {
    if (event.type === 'keydown') asButton(event)
    if (event.type === 'click') this.selected = true
  }
  get tablist() {
    return this.closest<UTabList>('u-tablist')
  }
  get selected() {
    return attr(this, 'aria-selected') === 'true'
  }
  set selected(value: boolean) {
    const tabIndex = value ? 0 : -1
    attr(this, { 'aria-selected': !tabIndex, tabIndex })
    if (value && this.tablist)
      Array.from(this.tablist.tabs, (tab) => {
        attr(tab.panel, 'hidden', tab === this ? null : '')
        if (tab !== this) tab.selected = false
      })
  }
  /** Sets or retrieves the ordinal position of an tab in a tablist. */
  get index() {
    return this.tablist ? Array.from(this.tablist.tabs).indexOf(this) : -1
  }
  get panel() {
    const selector = `u-tabpanel[id="${attr(this, 'aria-controls')}"]`
    return getRoot(this).querySelector<UTabPanel>(selector)
  }
}

export class UTabPanel extends HTMLElement {
  constructor() {
    super()
    attr(this, 'role', 'tabpanel')
    style(this, `:host(:not([hidden])) { display: block }`)
  }
  // connectedCallback() {
  //   // debouncedConnect(this.tablist)
  // }
  get tab() {
    if (!this.id) return null
    return getRoot(this).querySelector<UTab>(`u-tab[aria-controls="${this.id}]`)
  }
}

define('u-tabs', UTabs)
define('u-tablist', UTabList)
define('u-tab', UTab)
define('u-tabpanel', UTabPanel)

function getOwn<Type>(tag: string, self: Element): Type[] {
  return Array.from(self.querySelectorAll(tag)).filter(
    (el) => el.closest(self.nodeName) === self
  ) as Type[]
}

// function getPanels(tablist: UTabList) {
//   const panels: UTabPanel[] = []
//   for (let el = tablist.nextElementSibling; el; el = el.nextElementSibling) {
//     if (el instanceof UTabPanel) panels.push(el)
//     if (el instanceof UTabList) break
//   }
//   return panels
// }

// function connect(tablist: UTabList) {
//   // let tablist = self instanceof UTab ? self.tablist : self
//   // if (self instanceof UTabPanel) {
//   //   const tablists = queryAll('u-tablist', root).filter((el) => {
//   //     return self.compareDocumentPosition(el) === Node.DOCUMENT_POSITION_PRECEDING
//   //   }) as UTabList[]

//   //   tablist = tablists.pop() || null
//   // }

//   // if (tablist instanceof UTabList) {
//   // const tabpanels = queryAll(':scope ~ u-tabpanel', tablist)
//   const selector = 'u-tab:not([aria-controls]),u-tablist,u-tabpanel'
//   const all = getRoot(tablist).querySelectorAll(selector)
//   const tabs = new Map<UTabList, UTab[]>()

//   all.forEach((el) => {
//     const scope =
//     if (el instanceof UTabList) tabs.set(el, [])
//     if (el instanceof UTab) tabs.get(el.tablist)?.push()
//     if (el instanceof UTabPanel && !el.tab) {
//       attr(tabs.shift(), 'aria-controls', useId(el))
//     }
//   })
//   console.log(all)

//   // TODO: Check other u-tablist and aria-controls
//   // Array.from(tablist.tabs, (tab, index) => {
//   //   const panel = tabpanels[index]
//   //   attr(tab, 'aria-controls', useId(panel))
//   //   attr(panel, 'aria-labelledby', IS_ANDROID ? null : useId(tab)) // Android reads button instead of content when labelledby
//   // })
//   // }
// }

// // const FROM = IS_ANDROID ? 'data-labelledby' : 'aria-labelledby' // Android has a bug and reads only label instead of content
// // const KEYS = { SPACE: 32, END: 35, HOME: 36, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 }
// // /**
// //  * Get matching panel for tab through aria-controls
// //  * NB! Assumes that augmentDOM has run successfully
// //  * @param {TabElement} tab
// //  * @returns {HTMLElement | null} panel
// //  */
// // function getPanelFromTab (tab) {
// //   return document.getElementById(tab.getAttribute('data-for') || tab.getAttribute('for') || tab.getAttribute('aria-controls'))
// // }

// // /**
// //  * Augments the DOM surrounding the CoreTabs element with the following
// //  *  - Assigns a panel to each tab with aria-controls
// //  *  - Handles accessibility concerns through role and tabindices
// //  *  - Finally assigns tab-value to CoreTabs, running both getter and setter in the process for additional attribute setup
// //  * @param {CoreTabs} self CoreTabs element
// //  * @returns {void}
// //  */
// // function augmentDOM(self) {
// //   if (!self.parentNode) return // Abort if removed from DOM

// //   // Store tabPanel to reference in case no further siblings are found
// //   let tabPanel
// //   self.tabs.forEach((tab) => {
// //     tabPanel = getPanelFromTab(tab) || (tabPanel || self).nextElementSibling || tabPanel
// //     tab.id = tab.id || getUUID()
// //     tab.setAttribute('role', 'tab')

// //     if (tabPanel) {
// //       tab.setAttribute('aria-controls', tabPanel.id = tabPanel.id || getUUID())
// //       tabPanel.setAttribute('role', 'tabpanel')
// //       tabPanel.setAttribute('tabindex', '0')
// //     }
// //   })
// //   // Setup tab-specific attributes after above iterator has established matching panels and set necessary attributes
// //   self.tab = self.tab
// // }

// // /**
// //  * @returns {TabElement}
// //  */
// // get tab () {
// //   const tabAttr = this.getAttribute('tab')
// //   const allTabs = this.tabs

// //   // First tab with aria-selected="true"
// //   let tab = allTabs.filter(tab => tab.getAttribute('aria-selected') === 'true')[0]

// //   // No tab is set, check for match in index or id
// //   if (!tab) tab = allTabs[Number(tabAttr || NaN)] || document.getElementById(tabAttr)

// //   // No tab is set, check for first tab with visible panel
// //   if (!tab) {
// //     tab = allTabs.filter(tab => {
// //       const tabPanel = getPanelFromTab(tab)
// //       return tabPanel && !tabPanel.hasAttribute('hidden')
// //     })[0]
// //   }

// //   // Fallback to first tab
// //   return tab || allTabs[0]
// // }

// // /**
// //  * @param {string | number | TabElement} value
// //  * @returns {void}
// //  */
// // set tab(value) {
// //   if (!value && value !== 0) return
// //   const allTabs = this.tabs
// //   const prevTab = this.tab
// //   const nextTab = allTabs.filter((tab, i) => {
// //     return i === Number(value) || tab === value || tab.id === value
// //   })[0] || prevTab
// //   const nextPanel = getPanelFromTab(nextTab)

// //   allTabs.forEach((tab) => {
// //     const tabPanel = getPanelFromTab(tab)
// //     const isOpenTab = tab === nextTab

// //     tab.setAttribute('aria-selected', isOpenTab)
// //     tab.setAttribute('tabindex', Number(isOpenTab) - 1)

// //     // Core-tabs does not own the panels and will only update them if found
// //     if (tabPanel) {
// //       toggleAttribute(tabPanel, 'hidden', tabPanel !== nextPanel)
// //       if (isOpenTab) tabPanel.setAttribute(FROM, tab.id)
// //     }
// //   })
// //   this.setAttribute('tab', allTabs.indexOf(nextTab))

// //   // Dispatch toggle-event when the referenced tab is changed, and not just updating tab-attribute to index from id
// //   if (prevTab !== nextTab) {
// //     dispatchEvent(this, 'tabs.toggle')
// //   }
// // }
