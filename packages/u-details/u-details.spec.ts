import { expect } from '@esm-bundle/chai'
import { compareSnapshot, sendKeys } from '@web/test-runner-commands'
import { UHTMLDetailsElement, UHTMLSummaryElement } from './u-details'
import { IS_ANDROID } from '../utils'

const nextFrame = async () =>
  new Promise((resolve) => requestAnimationFrame(resolve))

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

const DEFAULT_TEST_HTML = `
<u-details>
  <u-summary>Summary 1</u-summary>
  <div>Details 1</div>
</u-details>
`

describe('u-details', () => {
  it('matches snapshot', async () => {
    await compareSnapshot({
      name: `u-details${IS_ANDROID ? '-android' : ''}`,
      content: toDOM(`
      <div>
        <u-details>
          <u-summary id="summary-1">Summary 1</u-summary>
          <div id="details-1">Details 1</div>
        </u-details>
        <u-details open>
          <u-summary id="summary-2">Summary 2</u-summary>
          Details 2
        </u-details>
        <u-details>
          <u-summary id="summary-3">Summary 3</u-summary>
          <div id="details-3">Details 3</div>
        </u-details>
      </div>
    `).outerHTML
    })
  })

  it('is defined', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)

    expect(uDetails.open).to.equal(false)
    expect(uDetails).to.be.instanceOf(UHTMLDetailsElement)
    expect(uDetails.firstElementChild).to.be.instanceOf(UHTMLSummaryElement)
    expect(window.customElements.get('u-details')).to.equal(UHTMLDetailsElement)
    expect(window.customElements.get('u-summary')).to.equal(UHTMLSummaryElement)
  })

  it('sets up attributes', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary, content] = [...uDetails.children] as [
      UHTMLSummaryElement,
      HTMLDivElement
    ]

    expect(uSummary.role).to.equal('button')
    expect(uSummary.tabIndex).to.equal(0)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('false')
    expect(uSummary.getAttribute('aria-controls')).to.exist
    expect(content.checkVisibility()).to.equal(false)
  })

  it('moves content to content slot when is appended', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(
      `<u-details><u-summary>Summary 1</u-summary></u-details>`
    )
    uDetails.insertAdjacentHTML('beforeend', '<div>Details 1</div>')

    const [, content] = [...uDetails.children] as [
      UHTMLSummaryElement,
      HTMLDivElement
    ]
    await nextFrame() // Let MutationObserver run
    expect(content.checkVisibility()).to.equal(false)
  })

  it('handles open property and attributes change', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary, content] = [...uDetails.children] as [
      UHTMLSummaryElement,
      HTMLDivElement
    ]

    uDetails.open = true
    expect(uDetails.hasAttribute('open')).to.equal(true)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('true')
    expect(content.checkVisibility()).to.equal(true)

    uDetails.open = false
    expect(uDetails.open).to.equal(false)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('false')
    expect(content.checkVisibility()).to.equal(false)

    uDetails.setAttribute('open', 'banana')
    expect(uDetails.open).to.equal(true)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('true')
    expect(content.checkVisibility()).to.equal(true)

    uDetails.removeAttribute('open')
    expect(uDetails.open).to.equal(false)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('false')
    expect(content.checkVisibility()).to.equal(false)
  })

  it('updates attributes on click', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary] = [...uDetails.children] as [UHTMLSummaryElement]

    uSummary.click()
    expect(uDetails.open).to.equal(true)

    uSummary.focus()
    await sendKeys({ press: ' ' })
    expect(uDetails.open).to.equal(false)
  })

  it('sets name property', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    expect(uDetails.name).to.equal('')

    uDetails.name = 'group-1'
    expect(uDetails.getAttribute('name')).to.equal('group-1')

    uDetails.setAttribute('name', 'group-2')
    expect(uDetails.name).to.equal('group-2')
  })

  it('closes other uDetails with same name attribute', async () => {
    const HTML_GROUP = DEFAULT_TEST_HTML.replace('>', ' name="group-1">')
    const div = toDOM<UHTMLDetailsElement>(
      `<div>${HTML_GROUP}${HTML_GROUP}</div>`
    )
    const [uDetails1, uDetails2] = div.querySelectorAll('u-details')
    const [uSummary1, uSummary2] = div.querySelectorAll('u-summary')

    uSummary1.click()
    expect(uDetails1.open).to.equal(true)
    expect(uDetails2.open).to.equal(false)

    uSummary2.click()
    expect(uDetails1.open).to.equal(false)
    expect(uDetails2.open).to.equal(true)
  })
  it('triggers toggle event', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary] = [...uDetails.children] as [
      UHTMLSummaryElement,
      HTMLDivElement
    ]

    const onToggle = (event: Event) =>
      expect(event)
        .to.include({
          bubbles: false,
          cancelable: false,
          currentTarget: uDetails,
          target: uDetails,
          type: 'toggle'
        })
        .and.be.instanceOf(Event)

    uDetails.addEventListener('toggle', onToggle)
    uSummary.click()
  })
  it('opens on beforematch', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const content = uDetails.lastElementChild as HTMLDivElement

    expect(uDetails.open).to.equal(false)
    content.dispatchEvent(new Event('beforematch', { bubbles: true }))
    await nextFrame() // Let beforematch event bubble
    expect(uDetails.open).to.equal(true)
  })
})
