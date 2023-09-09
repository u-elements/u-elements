import {
  BLOCK,
  CONTROLS,
  LABELLEDBY,
  SELECTED,
  asButton,
  attr,
  getRoot,
  off,
  on,
  style,
  useId
} from '../utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-tabs': UHTMLTabsElement
    'u-tablist': UHTMLTabListElement
    'u-tab': UHTMLTabElement
    'u-tabpanel': UHTMLTabPanelElement
  }
}

export class UHTMLTabsElement extends HTMLElement {
  constructor() {
    super()
    style(this, BLOCK)
  }
  get tabList(): UHTMLTabListElement | null {
    return queryWithoutNested('u-tablist', this)[0] || null
  }
  get selectedIndex(): number {
    // Check with real attribute (not .selected) as UHTMLTabElement instance might not be created yet
    return [...this.tabs].findIndex((tab) => attr(tab, SELECTED) === 'true')
  }
  set selectedIndex(index: number) {
    attr(this.tabs[index], SELECTED, true)
  }
  get tabs(): NodeListOf<UHTMLTabElement> {
    return queryWithoutNested('u-tab', this)
  }
  get panels(): NodeListOf<UHTMLTabPanelElement> {
    return queryWithoutNested('u-tabpanel', this)
  }
}

export class UHTMLTabListElement extends HTMLElement {
  constructor() {
    super()
    attr(this, 'role', 'tablist')
    style(this, ':host(:not([hidden])) { display: flex; flex-wrap: wrap }')
  }
  connectedCallback() {
    on(this, 'click,keydown', this) // Listen for tab events on tablist to minimize amount of listeners
  }
  disconnectedCallback() {
    off(this, 'click,keydown', this)
  }
  handleEvent(event: Event) {
    const { key } = event as KeyboardEvent
    const tabs = [...this.getElementsByTagName('u-tab')]
    let index = tabs.findIndex((tab) => tab.contains(event.target as Node))

    if (event.defaultPrevented || index === -1) return // Event pevented or not a tab
    if (event.type === 'click') tabs[index].selected = true
    if (event.type === 'keydown' && !asButton(event)) {
      if (key === 'ArrowDown' || key === 'ArrowRight')
        index = ++index % tabs.length
      else if (key === 'ArrowUp' || key === 'ArrowLeft')
        index = (index || tabs.length) - 1
      else if (key === 'End') index = tabs.length - 1
      else if (key === 'Home') index = 0
      else return // Do not hijack other keys
      event.preventDefault() // Prevent scroll
      tabs[index].focus()
    }
  }
  get tabsElement(): UHTMLTabsElement | null {
    return this.closest('u-tabs')
  }
}

// Speed up by not triggering attributeChangedCallback during attributeChangedCallback
let skipAttrChange = false
export class UHTMLTabElement extends HTMLElement {
  static get observedAttributes() {
    return [SELECTED, CONTROLS]
  }
  constructor() {
    super()
    attr(this, 'role', 'tab')
    style(this, `${BLOCK}:host { cursor: pointer }`)
  }
  connectedCallback() {
    this.selected = !!this.selected // Ensure selected is set (which also triggers attributeChangedCallback)
  }
  attributeChangedCallback(_name: string, prev: string, next: string) {
    if (!skipAttrChange && prev !== next && (skipAttrChange = true)) {
      const { tabs = [], panels = [], selectedIndex } = this.tabsElement || {}
      const selected = this.selected ? this : tabs[selectedIndex || 0] || this // Ensure always one selected tab
      const panelsWithoutTab = [...panels].filter((p) => !attr(p, LABELLEDBY))
      let selectedPanel: HTMLElement

      // Ensure correct state by always looping all tabs
      panels.forEach((panel) => attr(panel, { [LABELLEDBY]: null, hidden: '' })) // Reset all panels in case changing aria-controls
      tabs.forEach((tab) => {
        const tabindex = selected === tab ? 0 : -1
        const panel = queryRelated(tab) || panelsWithoutTab.shift() || null // Does not use tab.panel as UHTMLTabElement instance might not be created yet
        if (!tabindex && panel) selectedPanel = panel // Store selectedPanel as multiple tabs can point to same panel

        attr(tab, { [SELECTED]: !tabindex, [CONTROLS]: useId(panel), tabindex })
        attr(panel, {
          [LABELLEDBY]: useId(selectedPanel === panel ? selected : tab),
          hidden: selectedPanel === panel ? null : ''
        })
      })

      skipAttrChange = false
    }
  }
  get tabsElement(): UHTMLTabsElement | null {
    return this.closest('u-tabs')
  }
  get tabList(): UHTMLTabListElement | null {
    return this.closest('u-tablist')
  }
  get selected(): boolean {
    return attr(this, SELECTED) === 'true'
  }
  set selected(value: boolean) {
    attr(this, SELECTED, !!value)
  }
  /** Retrieves the ordinal position of an tab in a tablist. */
  get index(): number {
    return Array.from(this.tabsElement?.tabs || []).indexOf(this)
  }
  get panel(): UHTMLTabPanelElement | null {
    return queryRelated<UHTMLTabPanelElement>(this)
  }
}

export class UHTMLTabPanelElement extends HTMLElement {
  constructor() {
    super()
    attr(this, 'role', 'tabpanel')
    style(this, BLOCK)
  }
  connectedCallback() {
    this.hidden = !this.tab?.selected // Hide if not connected to tab
  }
  get tabsElement(): UHTMLTabsElement | null {
    return this.tab ? this.tab.tabsElement : this.closest('u-tabs')
  }
  get tab(): UHTMLTabElement | null {
    return queryRelated<UHTMLTabElement>(this)
  }
}

// Return children of tagName, but not if nested inside element with same tagName as container
const queryWithoutNested = <TagName extends keyof HTMLElementTagNameMap>(
  tag: TagName,
  self: Element
): NodeListOf<HTMLElementTagNameMap[TagName]> => {
  const selector = `${tag}:not(:scope ${self.nodeName}:not(:scope) ${tag})`
  return self.querySelectorAll(selector)
}

// Get related tab (if passing panel) or panel (if passing tab)
// Needs to be a utility function so it can be used independendtly from Element life cycle
// Querys elements both inside ShadowRoot and in document just incase trying to access outside shadowRoot elements
const queryRelated = <Rel extends HTMLElement>(self: Element): Rel | null => {
  const isTab = self.nodeName === 'U-TAB' // Check nodeName as UHTMLTabElement instance might not be created yet
  const key = isTab ? attr(self, CONTROLS) || '' : self.id
  const css = isTab ? `u-tabpanel[id="${key}"]` : `u-tab[${CONTROLS}="${key}"]`
  return getRoot(self).querySelector(css) || document.querySelector(css)
}

try {
  customElements.define('u-tabs', UHTMLTabsElement)
  customElements.define('u-tablist', UHTMLTabListElement)
  customElements.define('u-tab', UHTMLTabElement)
  customElements.define('u-tabpanel', UHTMLTabPanelElement)
} catch (err) {
  // Already defined or on server
}
