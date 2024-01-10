import { describe, expect, test } from 'vitest'
import { UHTMLTabsElement } from '..'

const toDOM = (innerHTML: string) =>
  Object.assign(document.body, { innerHTML }).firstElementChild

describe('u-tabs', () => {
  test('is connected', () => {
    const uTabs = toDOM(`<u-tabs></u-tabs>`) as UHTMLTabsElement

    expect(uTabs.tabs.length).toBe(0)
    expect(uTabs instanceof UHTMLTabsElement).toBeTruthy()
    expect(window.customElements.get('u-tabs')).toBe(UHTMLTabsElement)
  })

  test('sets up attributes', () => {
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

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

  test('updates attributes on selected prop change', () => {
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

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

  test('updates attributes on aria-selected attribute change', () => {
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

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
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

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
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab aria-selected="true">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

    expect(uTabs.tabs[0].tabIndex).toBe(-1)
    expect(uTabs.tabs[0].panel?.hidden).toBe(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(uTabs.tabs[1].tabIndex).toBe(0)
    expect(uTabs.tabs[1].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')
  })

  test('respects only first aria-selected attribute', () => {
    const uTabs = toDOM(`
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
    `) as UHTMLTabsElement

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
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab id="tab-2">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

    expect(uTabs.tabs[0].id).toBe('tab-1')
    expect(uTabs.tabs[1].id).toBe('tab-2')
    expect(uTabs.tabs[0].getAttribute('aria-controls')).toBe('panel-1')
    expect(uTabs.tabs[1].getAttribute('aria-controls')).toBe('panel-2')
    expect(uTabs.tabs[0].panel?.id).toBe('panel-1')
    expect(uTabs.tabs[1].panel?.id).toBe('panel-2')
    expect(uTabs.tabs[0].panel?.getAttribute('aria-labelledby')).toBe('tab-1')
    expect(uTabs.tabs[1].panel?.getAttribute('aria-labelledby')).toBe('tab-2')
  })

  test('respects aria-controls attributes', () => {
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-2">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

    expect(uTabs.tabs[0].getAttribute('aria-controls')).toBe('panel-2')
    expect(uTabs.tabs[1].getAttribute('aria-controls')).toBe('panel-1')
    expect(uTabs.panels[0].getAttribute('aria-labelledby')).toBe('tab-2')
    expect(uTabs.panels[1].getAttribute('aria-labelledby')).toBe('tab-1')
    expect(uTabs.tabs[0].panel?.getAttribute('aria-labelledby')).toBe('tab-1')
    expect(uTabs.tabs[1].panel?.getAttribute('aria-labelledby')).toBe('tab-2')
  })

  test('respects multiple tabs for same panel', () => {
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1" aria-controls="panel-1">Tab 1</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 2</u-tab>
          <u-tab id="tab-2" aria-controls="panel-1">Tab 3</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement

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
    const uTabs = toDOM(`
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
    `) as UHTMLTabsElement

    expect(uTabs.panels.length).toBe(0)
    expect(uTabs.tabs[0].panel?.hidden).toBe(false)
    expect(uTabs.tabs[1].panel?.hidden).toBe(true)
    expect(uTabs.tabs[2].panel?.hidden).toBe(true)
  })

  test('handles setup and interaction with dynamically added tabs', () => {
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel>Panel 1</u-tabpanel>
        <u-tabpanel>Panel 2</u-tabpanel>
      </u-tabs>
    `) as UHTMLTabsElement
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')

    uTabs.tabList?.insertAdjacentHTML('afterbegin', '<u-tab>Tab 0</u-tab>')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).toBe('true')

    uTabs.tabs[0].click()
    expect(uTabs.tabs[0].getAttribute('aria-selected')).toBe('true')
  })

  test('handles nested DOM and nested instances', () => {
    const uTabs = toDOM(`
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
    `) as UHTMLTabsElement
    const uTabsNested = uTabs.panels[1].firstElementChild as UHTMLTabsElement

    expect(uTabs.tabList?.parentElement?.nodeName).toBe('DIV')
    expect(uTabs.tabs.length).toBe(2)
    expect(uTabs.panels.length).toBe(2)
    expect(uTabsNested?.tabs?.length).toBe(1)
    expect(uTabsNested?.panels?.length).toBe(1)
  })

  test('handles keyboard arrow navigation', () => {
    const uTabs = toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab>Tab 1</u-tab>
          <u-tab>Tab 2</u-tab>
          <u-tab>Tab 3</u-tab>
        </u-tablist>
      </u-tabs>
      <button>Test</button>
    `) as UHTMLTabsElement

    uTabs.tabs[0].focus()
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'ArrowRight', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[1])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'ArrowLeft', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])
      
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[1])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'ArrowUp', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'End', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[2])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'ArrowRight', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'ArrowLeft', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[2])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'Home', bubbles: true }))
    expect(document.activeElement).toBe(uTabs.tabs[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'End', bubbles: true }))
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: 'Enter', bubbles: true }))
    expect(uTabs.tabs[2].selected).toBe(true)
  })
})