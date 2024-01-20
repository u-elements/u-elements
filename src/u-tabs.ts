import {
  ARIA_CONTROLS,
  ARIA_LABELLEDBY,
  ARIA_SELECTED,
  DISPLAY_BLOCK,
  asButton,
  attr,
  customElements,
  getRoot,
  off,
  on,
  style,
  useId
} from './utils'

declare global {
  interface HTMLElementTagNameMap {
    'u-tabs': UHTMLTabsElement
    'u-tablist': UHTMLTabListElement
    'u-tab': UHTMLTabElement
    'u-tabpanel': UHTMLTabPanelElement
  }
}

export class UHTMLTabsElement extends HTMLElement {
  connectedCallback() {
    style(this, DISPLAY_BLOCK)
  }
  get tabList(): UHTMLTabListElement | null {
    return queryWithoutNested('u-tablist', this)[0] || null
  }
  get selectedIndex(): number {
    // Check with real attribute (not .selected) as UHTMLTabElement instance might not be created yet
    return [...this.tabs].findIndex((tab) => attr(tab, ARIA_SELECTED) === 'true')
  }
  set selectedIndex(index: number) {
    attr(this.tabs[index], ARIA_SELECTED, true)
  }
  get tabs(): NodeListOf<UHTMLTabElement> {
    return queryWithoutNested('u-tab', this)
  }
  get panels(): NodeListOf<UHTMLTabPanelElement> {
    return queryWithoutNested('u-tabpanel', this)
  }
}

export class UHTMLTabListElement extends HTMLElement {
  connectedCallback() {
    style(this, ':host(:not([hidden])) { display: flex; flex-wrap: wrap }')
    attr(this, 'role', 'tablist')
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
    return ['id', ARIA_SELECTED, ARIA_CONTROLS]
  }
  connectedCallback() {
    style(this, `${DISPLAY_BLOCK}:host { cursor: pointer }`)
    attr(this, 'role', 'tab')
    this.selected = !!this.selected // Ensure selected is set (which also triggers attributeChangedCallback)
  }
  attributeChangedCallback(_name: string, prev: string, next: string) {
    if (!skipAttrChange && prev !== next && (skipAttrChange = true)) {
      const { tabs = [], panels = [], selectedIndex } = this.tabsElement || {}
      const selected = this.selected ? this : tabs[selectedIndex || 0] || this // Ensure always one selected tab
      let selectedPanel: HTMLElement

      // Ensure correct state by always looping all tabs
      panels.forEach((panel) => attr(panel, { [ARIA_LABELLEDBY]: null, hidden: '' })) // Reset all panels in case changing aria-controls
      tabs.forEach((tab, index) => {
        const tabindex = selected === tab ? 0 : -1
        const panel = getPanel(tab) || panels[index] || null // Does not use tab.panel as UHTMLTabElement instance might not be created yet
        if (!tabindex && panel) selectedPanel = panel // Store selectedPanel as multiple tabs can point to same panel

        attr(tab, {
          [ARIA_SELECTED]: !tabindex,
          [ARIA_CONTROLS]: useId(panel),
          tabindex
        })
        attr(panel, {
          [ARIA_LABELLEDBY]: useId(selectedPanel === panel ? selected : tab),
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
    return attr(this, ARIA_SELECTED) === 'true'
  }
  set selected(value: boolean) {
    attr(this, ARIA_SELECTED, !!value)
  }
  /** Retrieves the ordinal position of an tab in a tablist. */
  get index(): number {
    return Array.from(this.tabsElement?.tabs || []).indexOf(this)
  }
  get panel(): UHTMLTabPanelElement | null {
    return getPanel(this)
  }
}

export class UHTMLTabPanelElement extends HTMLElement {
  static get observedAttributes() {
    return ['id']
  }
  connectedCallback() {
    style(this, DISPLAY_BLOCK)
    attr(this, 'role', 'tabpanel')
    this.hidden = Array.from(this.tabs).every((tab) => !tab.selected) // Hide if not connected to tab
  }
  attributeChangedCallback(_name: string, prev: string, next: string) {
    if (!skipAttrChange && prev !== next) { // Prevent updates while running tab attributeChangedCallback
      Array.from(getTabs(this, prev), (tab) => attr(tab, ARIA_CONTROLS, next))
    }
  }
  get tabsElement(): UHTMLTabsElement | null {
    return this.closest('u-tabs')
  }
  get tabs(): NodeListOf<UHTMLTabElement> {
    return getTabs(this, this.id)
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

// Needs to be a utility function so it can be used independendtly from Element life cycle
// Querys elements both inside ShadowRoot and in document just incase trying to access outside shadowRoot elements
const getPanel = (self: Element): UHTMLTabPanelElement | null => {
  const css = `u-tabpanel[id="${attr(self, ARIA_CONTROLS)}"]`
  return getRoot(self).querySelector(css) || document.querySelector(css)
}

// Needs to be a utility function so it can be used independendtly from Element life cycle
// Querys elements both inside ShadowRoot and in document just incase trying to access outside shadowRoot elements
const getTabs = (self: Element, id: string): NodeListOf<UHTMLTabElement> => {
  const css = `u-tab[${ARIA_CONTROLS}="${id}"]`
  return getRoot(self).querySelectorAll(css)
}

customElements.define('u-tabs', UHTMLTabsElement)
customElements.define('u-tablist', UHTMLTabListElement)
customElements.define('u-tab', UHTMLTabElement)
customElements.define('u-tabpanel', UHTMLTabPanelElement)