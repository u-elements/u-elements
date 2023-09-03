import {
  BLOCK,
  CONTROLS,
  IS_ANDROID,
  LABELLEDBY,
  SELECTED,
  asButton,
  attr,
  define,
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
  get selectedIndex() {
    // Check with real attribute (not .selected) as UHTMLTabElement instance might not be created yet
    return [...this.tabs].findIndex((tab) => attr(tab, SELECTED) === 'true')
  }
  set selectedIndex(index: number) {
    attr(this.tabs[index], SELECTED, true)
  }
  get tabs() {
    return queryWithoutNested('u-tab', this)
  }
  get panels() {
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
    // Listen for tab events on tablist to minimize amount of listeners
    on(this, 'click,keydown', this)
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
  get tabsElement() {
    return this.closest('u-tabs')
  }
}

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
    this.attributeChangedCallback() // Setup attributes on connect
  }
  attributeChangedCallback(name?: string, prev?: unknown, next?: unknown) {
    const selected = this.selected || this.tabsElement?.selectedIndex === -1
    const isConnectOrChange = !name || (prev && prev !== next)

    if (selected && isConnectOrChange && this.tabsElement) {
      const { tabs, panels } = this.tabsElement

      Array.from(tabs, (tab, index) => {
        const panel = queryRelated(tab) || panels[index]
        if (panel) panel.hidden = true
        attr(tab, {
          [CONTROLS]: useId(panel),
          [SELECTED]: tab === this,
          tabindex: tab === this ? 0 : -1,
          title: IS_ANDROID ? `${index + 1} ${tabs.length}` : null // Add count to fix Android TalkBack
        })
      })
      // Set panel attributes after loop as multiple tabs can point to same panel
      attr(this.panel, {
        [LABELLEDBY]: useId(this),
        hidden: null
      })
    }
  }
  get tabsElement() {
    return this.closest('u-tabs')
  }
  get tabList() {
    return this.closest('u-tablist')
  }
  get selected() {
    return attr(this, SELECTED) === 'true'
  }
  set selected(value: boolean) {
    attr(this, SELECTED, !!value)
  }
  /** Retrieves the ordinal position of an tab in a tablist. */
  get index() {
    return this.tabsElement ? [...this.tabsElement.tabs].indexOf(this) : -1
  }
  get panel() {
    return queryRelated<UHTMLTabPanelElement>(this)
  }
}

export class UHTMLTabPanelElement extends HTMLElement {
  constructor() {
    super()
    attr(this, { role: 'tabpanel' })
    style(this, BLOCK)
  }
  get tabsElement() {
    return this.tab ? this.tab.tabsElement : this.closest('u-tabs')
  }
  get tab() {
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
const queryRelated = <Ret extends HTMLElement>(self: Element): Ret | null => {
  const isTab = self.nodeName === 'U-TAB' // Check nodeName as UHTMLTabElement instance might not be created yet
  const key = isTab ? attr(self, CONTROLS) || '' : self.id
  const css = isTab ? `u-tabpanel[id="${key}"]` : `u-tab[${CONTROLS}="${key}"]`
  return getRoot(self).querySelector(css) || document.querySelector(css)
}

define('u-tabs', UHTMLTabsElement)
define('u-tablist', UHTMLTabListElement)
define('u-tab', UHTMLTabElement)
define('u-tabpanel', UHTMLTabPanelElement)
