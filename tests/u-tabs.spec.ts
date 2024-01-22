import { expect } from '@esm-bundle/chai'
import { compareSnapshot, sendKeys } from '@web/test-runner-commands'
import { UHTMLTabsElement, UHTMLTabListElement, UHTMLTabElement, UHTMLTabPanelElement } from '../src'
import { IS_IOS } from '../src/utils'

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
  it('matches snapshot', async () => {
    await compareSnapshot({
      name: `u-tabs${IS_IOS ? '-ios' : ''}`,
      content: toDOM(`
      <u-tabs>
        <u-tablist>
          <u-tab id="tab-1">Tab 1</u-tab>
          <u-tab id="tab-2">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2">Panel 2</u-tabpanel>
      </u-tabs>
    `).outerHTML
    })
  })

  it('is defined', () => {
    const uTabs = toDOM<UHTMLTabsElement>(`<u-tabs></u-tabs>`)

    expect(uTabs.tabs.length).to.equal(0)
    expect(uTabs).to.be.instanceOf(UHTMLTabsElement)
    expect(window.customElements.get('u-tabs')).to.equal(UHTMLTabsElement)
    expect(window.customElements.get('u-tablist')).to.equal(UHTMLTabListElement)
    expect(window.customElements.get('u-tab')).to.equal(UHTMLTabElement)
    expect(window.customElements.get('u-tabpanel')).to.equal(UHTMLTabPanelElement)
  })

  it('sets up attributes', () => {
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

    expect(uTabs.tabList?.role).to.equal('tablist')
    expect(uTabs.tabs[0].id).to.equal(uTabs.panels[0].getAttribute('aria-labelledby'))
    expect(uTabs.tabs[0].role).to.equal('tab')
    expect(uTabs.tabs[0].tabIndex).to.equal(0)
    expect(uTabs.tabs[0].panel?.role).to.equal('tabpanel')
    expect(uTabs.tabs[0].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[0].getAttribute('aria-controls')).to.equal(uTabs.panels[0].id)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[1].id).to.equal(uTabs.panels[1].getAttribute('aria-labelledby'))
    expect(uTabs.tabs[1].role).to.equal('tab')
    expect(uTabs.tabs[1].tabIndex).to.equal(-1)
    expect(uTabs.tabs[1].panel?.role).to.equal('tabpanel')
    expect(uTabs.tabs[1].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[1].getAttribute('aria-controls')).to.equal(uTabs.panels[1].id)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')
  })

  it('sets up properties', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)
    const uTabList = uTabs.firstElementChild as UHTMLTabListElement
    const uTab = uTabList.firstElementChild as UHTMLTabElement
    const uTabPanel = uTabList.nextElementSibling as UHTMLTabPanelElement

    expect(uTabs.selectedIndex).to.equal(0)
    expect(uTabs.tabList).to.equal(uTabList)
    expect(uTabs.tabs).to.be.instanceOf(NodeList)
    expect(uTabs.tabs.length).to.equal(2)
    expect(uTabs.panels).to.be.instanceOf(NodeList)
    expect(uTabs.panels.length).to.equal(2)

    expect(uTabList.tabsElement).to.equal(uTabs)
    expect(uTab.tabsElement).to.equal(uTabs)
    expect(uTab.tabList).to.equal(uTabList)
    expect(uTab.selected).to.equal(true)
    expect(uTab.index).to.equal(0)
    expect(uTab.panel).to.equal(uTabPanel)
    expect(uTabPanel.tabsElement).to.equal(uTabs)
    expect(uTabPanel.tabs).to.be.instanceOf(NodeList)
    expect(uTabPanel.tabs[0]).to.equal(uTab)

    expect(toDOM<UHTMLTabPanelElement>(`<u-tabpanel></u-tabpanel>`).tabs.length).to.equal(0)
  })

  it('updates attributes on selected prop change', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).to.equal(0)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[1].tabIndex).to.equal(-1)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')

    uTabs.tabs[1].selected = true

    expect(uTabs.tabs[0].tabIndex).to.equal(-1)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[1].tabIndex).to.equal(0)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('true')
  })

  it('updates attributes on selectedIndex prop change', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).to.equal(0)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[1].tabIndex).to.equal(-1)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')

    uTabs.selectedIndex = 1

    expect(uTabs.tabs[0].tabIndex).to.equal(-1)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[1].tabIndex).to.equal(0)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('true')
  })

  it('updates attributes on aria-selected attribute change', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).to.equal(0)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[1].tabIndex).to.equal(-1)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')

    uTabs.tabs[1].setAttribute('aria-selected', 'true')

    expect(uTabs.tabs[0].tabIndex).to.equal(-1)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[1].tabIndex).to.equal(0)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('true')
  })

  it('updates attributes on click', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)

    expect(uTabs.tabs[0].tabIndex).to.equal(0)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[1].tabIndex).to.equal(-1)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')

    uTabs.tabs[1].click()

    expect(uTabs.tabs[0].tabIndex).to.equal(-1)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[1].tabIndex).to.equal(0)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('true')
  })

  it('respects aria-selected attribute', () => {
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

    expect(uTabs.tabs[0].tabIndex).to.equal(-1)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[1].tabIndex).to.equal(0)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('true')
  })

  it('respects only first aria-selected attribute', () => {
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

    expect(uTabs.tabs[0].tabIndex).to.equal(0)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[1].tabIndex).to.equal(-1)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[2].tabIndex).to.equal(-1)
    expect(uTabs.tabs[2].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[2].getAttribute('aria-selected')).to.equal('false')
  })

  it('respects id attributes', () => {
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

    expect(uTabs.tabs[0].id).to.equal('tab-1')
    expect(uTabs.tabs[1].id).to.equal('tab-2')
    expect(uTabs.tabs[0].getAttribute('aria-controls')).to.equal('panel-1')
    expect(uTabs.tabs[1].getAttribute('aria-controls')).to.equal('panel-2')
    expect(uTabs.tabs[0].panel?.id).to.equal('panel-1')
    expect(uTabs.tabs[1].panel?.id).to.equal('panel-2')
    expect(uTabs.tabs[0].panel?.getAttribute('aria-labelledby')).to.equal('tab-1')
    expect(uTabs.tabs[1].panel?.getAttribute('aria-labelledby')).to.equal('tab-2')

    uTabs.tabs[0].id = 'tab-1-changed-id'
    expect(uTabs.panels[0].getAttribute('aria-labelledby')).to.equal('tab-1-changed-id')
    
    uTabs.tabs[1].setAttribute('aria-controls', 'panel-1')
    expect(uTabs.panels[1].hasAttribute('aria-labelledby')).to.equal(false)

    uTabs.panels[0].id = 'panel-1-changed-id'
    expect(uTabs.tabs[0].getAttribute('aria-controls')).to.equal('panel-1-changed-id')

    // NOTE: intentionnaly does not test changeing aria-labelledby,
    // as this attribute varies between OSes and is meant only to be used under the hood
  })

  it('respects aria-controls attributes', () => {
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

    expect(uTabs.tabs[0].getAttribute('aria-controls')).to.equal('panel-2')
    expect(uTabs.tabs[1].getAttribute('aria-controls')).to.equal('panel-1')
    expect(uTabs.panels[0].getAttribute('aria-labelledby')).to.equal('tab-2')
    expect(uTabs.panels[1].getAttribute('aria-labelledby')).to.equal('tab-1')
    expect(uTabs.tabs[0].panel?.getAttribute('aria-labelledby')).to.equal('tab-1')
    expect(uTabs.tabs[1].panel?.getAttribute('aria-labelledby')).to.equal('tab-2')
  })

  it('respects multiple tabs for same panel', () => {
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

    expect(uTabs.tabs[0].panel).to.equal(uTabs.tabs[1].panel)
    expect(uTabs.tabs[1].panel).to.equal(uTabs.tabs[2].panel)
    expect(uTabs.panels.length).to.equal(1)

    uTabs.tabs[0].selected = true
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[2].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.panels[0].hidden).to.equal(false)

    uTabs.tabs[1].selected = true
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.tabs[2].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.panels[0].hidden).to.equal(false)

    uTabs.tabs[2].selected = true
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('false')
    expect(uTabs.tabs[2].getAttribute('aria-selected')).to.equal('true')
    expect(uTabs.panels[0].hidden).to.equal(false)
  })

  it('respects external tabpanels', () => {
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

    expect(uTabs.panels.length).to.equal(0)
    expect(uTabs.tabs[0].panel?.hidden).to.equal(false)
    expect(uTabs.tabs[1].panel?.hidden).to.equal(true)
    expect(uTabs.tabs[2].panel?.hidden).to.equal(true)
  })

  it('handles setup and interaction with dynamically added tabs', () => {
    const uTabs = toDOM<UHTMLTabsElement>(DEFAULT_TEST_HTML)
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')

    uTabs.tabList?.insertAdjacentHTML('afterbegin', '<u-tab>Tab 0</u-tab>')
    expect(uTabs.tabs[1].getAttribute('aria-selected')).to.equal('true')

    uTabs.tabs[0].click()
    expect(uTabs.tabs[0].getAttribute('aria-selected')).to.equal('true')
  })

  it('handles nested DOM and nested instances', () => {
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

    expect(uTabs.tabList?.parentElement?.nodeName).to.equal('DIV')
    expect(uTabs.tabs.length).to.equal(2)
    expect(uTabs.panels.length).to.equal(2)
    expect(uTabsNested?.tabs?.length).to.equal(1)
    expect(uTabsNested?.panels?.length).to.equal(1)
  })

  it('handles incomplete DOM instances', () => {
    expect(toDOM<UHTMLTabsElement>(`<u-tabs></u-tabs>`).tabList).to.equal(null)
    expect(toDOM<UHTMLTabElement>(`<u-tab></u-tab>`).tabsElement).to.equal(null)
    expect(toDOM<UHTMLTabElement>(`<u-tab></u-tab>`).index).to.equal(-1)
    expect(toDOM<UHTMLTabPanelElement>(`<u-tabpanel></u-tabpanel>`).tabsElement).to.equal(null)
  })

  it('respectes event.preventDefault', () => {
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
    expect(uTabs?.tabs[1].selected).to.equal(true)
  })

  it('handles keyboard arrow navigation', async () => {
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
    expect(document.activeElement).to.equal(uTabs.tabs[0])

    await sendKeys({ press: 'ArrowRight' })
    expect(document.activeElement).to.equal(uTabs.tabs[1])

    await sendKeys({ press: 'ArrowLeft' })
    expect(document.activeElement).to.equal(uTabs.tabs[0])
      
    await sendKeys({ press: 'ArrowDown' })
    expect(document.activeElement).to.equal(uTabs.tabs[1])

    await sendKeys({ press: 'ArrowUp' })
    expect(document.activeElement).to.equal(uTabs.tabs[0])

    await sendKeys({ press: 'End' })
    expect(document.activeElement).to.equal(uTabs.tabs[2])

    await sendKeys({ press: 'ArrowRight' })
    expect(document.activeElement).to.equal(uTabs.tabs[0])

    await sendKeys({ press: 'ArrowLeft' })
    expect(document.activeElement).to.equal(uTabs.tabs[2])

    await sendKeys({ press: 'Home' })
    expect(document.activeElement).to.equal(uTabs.tabs[0])

    await sendKeys({ press: 'z' })
    expect(document.activeElement).to.equal(uTabs.tabs[0])

    await sendKeys({ press: 'End' })
    await sendKeys({ press: ' ' })
    expect(uTabs.tabs[2].selected).to.equal(true)
  })
})