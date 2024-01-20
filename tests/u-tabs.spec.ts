// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { UHTMLTabsElement, UHTMLTabListElement, UHTMLTabElement, UHTMLTabPanelElement } from '../src'

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

const DEFAULT_TEST_HTML = `
<u-tabs>
  <u-tablist>
    <u-tab>Tab 1</u-tab>
    <u-tab>Tab 2</u-tab>
  </u-tablist>
  <u-tabpanel>Panel 1</u-tabpanel>
  <u-tabpanel>Panel 2</u-tabpanel>
</u-tabs>
`

describe('u-tabs', () => {
  test('snapshot', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab id="tab-2">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `)
    expect(uTabs).toMatchSnapshot()
  })

  test('is defined', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`<u-tabs></u-tabs>`)

    expect(uTabs.tabs.length).toBe(0)
    expect(uTabs).toBeInstanceOf(UHTMLTabsElement)
    expect(window.customElements.get('u-tabs')).toBe(UHTMLTabsElement)
    expect(window.customElements.get('u-tablist')).toBe(UHTMLTabListElement)
    expect(window.customElements.get('u-tab')).toBe(UHTMLTabElement)
    expect(window.customElements.get('u-tabpanel')).toBe(UHTMLTabPanelElement)
  })

  test('sets up attributes', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `)

    expect(uTabs.tabList?.role).toBe('tablist')
    expect(uTabs.tabs[0].id).toBe(uTabs.panels[0].getAttribute('aria-labelledby'))
    expect(uTabs.tabs[0].role).toBe('tab')
    expect(uTabs.tabs[0].tabIndex).toBe(0)
    expect(uTabs.tabs[0].panel?.role).toBe('tabpanel')
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[0].getAttribute('aria-controls')).toBe(uTabs.panels[0].id)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[1].id).toBe(uTabs.panels[1].getAttribute('aria-labelledby'))
    expect(uTabs.tabs[1].role).toBe('tab')
    expect(uTabs.tabs[1].tabIndex).toBe(-1)
    expect(uTabs.tabs[1].panel?.role).toBe('tabpanel')
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[1].getAttribute('aria-controls')).toBe(uTabs.panels[1].id)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')
  })

  test('sets up properties', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)
    const uTabList = uTabs.firstElementChild as UHTMLTabListElement
    const uTab = uTabList.firstElementChild as UHTMLTabElement
    const uTabPanel = uTabList.nextElementSibling as UHTMLTabPanelElement

    expect(uTabs.selectedIndex).toBe(0)
    expect(uTabs.tabList).toBe(uTabList)
    expect(uTabs.tabs).toBeInstanceOf(NodeList)
    expect(uTabs.tabs.length).toBe(2)
    expect(uTabs.panels).toBeInstanceOf(NodeList)
    expect(uTabs.panels.length).toBe(2)

    expect(uTabList.tabsElement).toBe(uTabs)
    expect(uTab.tabsElement).toBe(uTabs)
    expect(uTab.tabList).toBe(uTabList)
    expect(uTab.selected).toBe(true)
    expect(uTab.index).toBe(0)
    expect(uTab.panel).toBe(uTabPanel)
    expect(uTabPanel.tabsElement).toBe(uTabs)
    expect(uTabPanel.tabs).toBeInstanceOf(NodeList)
    expect(uTabPanel.tabs[0]).toBe(uTab)

    expect(toDOM<UHTMLTabPanelElement>(`<u-tabpanel></u-tabpanel>`).tabs.length).toBe(0)
  })

  test('updates attributes on selected prop change', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).toBe(0)
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[1].tabIndex).toBe(-1)
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')

    uTabs.tabs[1].selected = true

    expect(uTabs.tabs[0].tabIndex).toBe(-1)
    expect(uTabs.tabs[0].panel?.hidden).toBe(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].tabIndex).toBe(0)
    expect(uTabs.tabs[1].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')
  })

  test('updates attributes on selectedIndex prop change', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).toBe(0)
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[1].tabIndex).toBe(-1)
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')

    uTabs.selectedIndex = 1

    expect(uTabs.tabs[0].tabIndex).toBe(-1)
    expect(uTabs.tabs[0].panel?.hidden).toBe(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].tabIndex).toBe(0)
    expect(uTabs.tabs[1].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')
  })

  test('updates attributes on aria-selected attribute change', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).toBe(0)
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[1].tabIndex).toBe(-1)
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')

    uTabs.tabs[1].setAttribute('aria-selected', 'true')

    expect(uTabs.tabs[0].tabIndex).toBe(-1)
    expect(uTabs.tabs[0].panel?.hidden).toBe(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].tabIndex).toBe(0)
    expect(uTabs.tabs[1].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')
  })

  test('updates attributes on click', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).toBe(0)
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[1].tabIndex).toBe(-1)
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')

    uTabs.tabs[1].click()

    expect(uTabs.tabs[0].tabIndex).toBe(-1)
    expect(uTabs.tabs[0].panel?.hidden).toBe(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].tabIndex).toBe(0)
    expect(uTabs.tabs[1].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')
  })

  test('respects aria-selected attribute', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab aria-selected="true">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>
    `)

    expect(uTabs.tabs[0].tabIndex).toBe(-1)
    expect(uTabs.tabs[0].panel?.hidden).toBe(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].tabIndex).toBe(0)
    expect(uTabs.tabs[1].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')
  })

  test('respects only first aria-selected attribute', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab aria-selected="true">Tab 1</u-tab>
          <u-tab aria-selected="true">Tab 2</u-tab>
          <u-tab aria-selected="true">Tab 3</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
        <u-tabpanel>Panel 3</u-tabpanel>
      </u-tabs>
    `)

    expect(uTabs.tabs[0].tabIndex).toBe(0)
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[1].tabIndex).toBe(-1)
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[2].tabIndex).toBe(-1)
    expect(uTabs.tabs[2].panel?.hidden).toBe(true)
    expect(uTabs.tabs[2].getAttribute('aria-selected')).toBe('false')
  })

  test('respects id attributes', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab id="tab-2">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `)

    expect(uTabs.tabs[0].id).toBe('tab-1')
    expect(uTabs.tabs[1].id).toBe('tab-2')
    expect(uTabs.tabs[0].getAttribute('aria-controls')).toBe('panel-1')
    expect(uTabs.tabs[1].getAttribute('aria-controls')).toBe('panel-2')
    expect(uTabs.tabs[0].panel?.id).toBe('panel-1')
    expect(uTabs.tabs[1].panel?.id).toBe('panel-2')
    expect(uTabs.tabs[0].panel?.getAttribute('aria-labelledby')).toBe('tab-1')
    expect(uTabs.tabs[1].panel?.getAttribute('aria-labelledby')).toBe('tab-2')

    uTabs.tabs[0].id = 'tab-1-changed-id'
    expect(uTabs.panels[0].getAttribute('aria-labelledby')).toBe('tab-1-changed-id')
    
    uTabs.tabs[1].setAttribute('aria-controls', 'panel-1')
    expect(uTabs.panels[1].hasAttribute('aria-labelledby')).toBe(false)

    uTabs.panels[0].id = 'panel-1-changed-id'
    expect(uTabs.tabs[0].getAttribute('aria-controls')).toBe('panel-1-changed-id')

    // NOTE: intentionnaly does not test changeing aria-labelledby,
    // as this attribute varies between OSes and is meant only to be used under the hood
  })

  test('respects aria-controls attributes', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-2">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `)

    expect(uTabs.tabs[0].getAttribute('aria-controls')).toBe('panel-2')
    expect(uTabs.tabs[1].getAttribute('aria-controls')).toBe('panel-1')
    expect(uTabs.panels[0].getAttribute('aria-labelledby')).toBe('tab-2')
    expect(uTabs.panels[1].getAttribute('aria-labelledby')).toBe('tab-1')
    expect(uTabs.tabs[0].panel?.getAttribute('aria-labelledby')).toBe('tab-1')
    expect(uTabs.tabs[1].panel?.getAttribute('aria-labelledby')).toBe('tab-2')
  })

  test('respects multiple tabs for same panel', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-1">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 2</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 3</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
      </u-tabs>
    `)

    expect(uTabs.tabs[0].panel).toBe(uTabs.tabs[1].panel)
    expect(uTabs.tabs[1].panel).toBe(uTabs.tabs[2].panel)
    expect(uTabs.panels.length).toBe(1)

    uTabs.tabs[0].selected = true
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[2].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.panels[0].hidden).toBe(false)

    uTabs.tabs[1].selected = true
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.tabs[2].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.panels[0].hidden).toBe(false)

    uTabs.tabs[2].selected = true
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[2].getAttribute('aria-selected')).toBe('true')
    expect(uTabs.panels[0].hidden).toBe(false)
  })

  test('respects external tabpanels', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-1">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-2">Tab 2</u-tab>
          <u-tab id="tab-2" aria-controls="panel-3">Tab 3</u-tab>
        </u-tablist>
      </u-tabs>
      <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
      <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      <u-tabpanel id="panel-3">Panel 3</u-tabpanel>
    `)

    expect(uTabs.panels.length).toBe(0)
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[2].panel?.hidden).toBe(true)
  })

  test('handles setup and interaction with dynamically added tabs', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')

    uTabs.tabList?.insertAdjacentHTML('afterbegin', '<u-tab>Tab 0</u-tab>')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')

    uTabs.tabs[0].click()
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
  })

  test('handles nested DOM and nested instances', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <div>
          <u-tablist>
            <u-tab>Tab 1</u-tab>
            <div>
              <u-tab>Tab 2</u-tab>
            </div>
          </u-tablist>
        </div>
        <div>
          <u-tabpanel>Panel 1</u-tabpanel>
        </div>
        <u-tabpanel>
          <u-tabs>
          <u-tablist>
            <u-tab>Nested tab 1</u-tab>
          </u-tablist>
          <u-tabpanel>Nested panel 1</u-tabpanel>
        </u-tabs>
        </u-tabpanel>
      </u-tabs>
    `)
    const uTabsNested = uTabs.panels[1].firstElementChild as UHTMLTabsElement

    expect(uTabs.tabList?.parentElement?.nodeName).toBe('DIV')
    expect(uTabs.tabs.length).toBe(2)
    expect(uTabs.panels.length).toBe(2)
    expect(uTabsNested?.tabs?.length).toBe(1)
    expect(uTabsNested?.panels?.length).toBe(1)
  })

  test('handles incomplete DOM instances', () => {
    expect(toDOM<UHTMLTabsElement>(`<u-tabs></u-tabs>`).tabList).toBe(null)
    expect(toDOM<UHTMLTabElement>(`<u-tab></u-tab>`).tabsElement).toBe(null)
    expect(toDOM<UHTMLTabElement>(`<u-tab></u-tab>`).index).toBe(-1)
    expect(toDOM<UHTMLTabPanelElement>(`<u-tabpanel></u-tabpanel>`).tabsElement).toBe(null)
  })

  test('respectes event.preventDefault', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab aria-selected="true">Tab 2</u-tab>
        </u-tablist>
      </u-tabs>
    `)

    uTabs?.tabs[0].addEventListener('click', (event: MouseEvent) => event.preventDefault())
    uTabs?.tabs[0].click()
    expect(uTabs?.tabs[1].selected).toBe(true)
  })

  test('handles keyboard arrow navigation', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
          <u-tab>Tab 3</u-tab>
        </u-tablist>
      </u-tabs>
      <button>Test</button>
    `)

    uTabs.tabs[0].focus()
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[1])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])
      
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[1])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[2])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[2])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(uTabs.tabs[2].selected).toBe(true)
  })
})