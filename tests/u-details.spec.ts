import { expect } from '@esm-bundle/chai'
import { compareSnapshot, sendKeys } from '@web/test-runner-commands'
import { UHTMLDetailsElement, UHTMLSummaryElement } from '../src'
import { ARIA_LABELLEDBY, IS_IOS } from '../src/utils'

const nextFrame = async () =>
  new Promise(resolve => requestAnimationFrame(resolve))

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

const DEFAULT_TEST_HTML = `
<u-details>
  <u-summary>Summary 1</u-summary>
  <details>Details 1</details>
</u-details>
`

describe('u-details', () => {
  it('matches snapshot', async () => {
    await compareSnapshot({
      name: `u-details${IS_IOS ? '-ios' : ''}`,
      content: toDOM(`
      <div>
        <u-details>
          <u-summary id="summary-1">Summary 1</u-summary>
          <details id="details-1">Details 1</details>
        </u-details>
        <u-details open>
          <u-summary id="summary-2">Summary 2</u-summary>
          <details id="details-2">Details 2</details>
        </u-details>
        <u-details>
          <u-summary id="summary-3"Summary 3</u-summary>
          <details id="details-3"><summary>Summary 3 nested</summary>Details 3</details>
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

  it('generates hidden native summary element', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const nativeDetails = uDetails.lastElementChild as HTMLDetailsElement
    const nativeSummary = nativeDetails.firstElementChild as HTMLElement

    expect(nativeSummary).to.be.instanceOf(HTMLElement)
    expect(nativeSummary.nodeName).to.equal('SUMMARY')
    expect(nativeSummary.hidden).to.equal(true)
  })

  it('sets up attributes when native details is appended', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(`<u-details><u-summary>Summary 1</u-summary></u-details>`)
    uDetails.insertAdjacentHTML('beforeend', '<details>Details 1</details>')

    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]
    await nextFrame() // Let MutationObserver run
    expect(nativeDetails.id).to.equal(uSummary.getAttribute('aria-controls'))
  })

  it('handles up open property and attributes change', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]

    expect(uSummary.role).to.equal('button')
    expect(uSummary.id).to.equal(nativeDetails.getAttribute(ARIA_LABELLEDBY))
    expect(uSummary.tabIndex).to.equal(0)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('false')
    expect(uSummary.getAttribute('aria-controls')).to.equal(nativeDetails.id)
    expect(nativeDetails.role).to.equal('group')
    expect(nativeDetails.getAttribute('aria-hidden')).to.equal('true')
  })

  it('handles open property and attributes change', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]

    uDetails.open = true
    expect(uDetails.hasAttribute('open')).to.equal(true)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('true')
    expect(nativeDetails.getAttribute('aria-hidden')).to.equal('false')
    expect(nativeDetails.hasAttribute('open')).to.equal(true)

    uDetails.removeAttribute('open')
    expect(uDetails.open).to.equal(false)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('false')
    expect(nativeDetails.getAttribute('aria-hidden')).to.equal('true')
    expect(nativeDetails.hasAttribute('open')).to.equal(false)

    uDetails.setAttribute('open', 'banana')
    expect(uDetails.open).to.equal(true)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('true')
    expect(nativeDetails.getAttribute('aria-hidden')).to.equal('false')
    expect(nativeDetails.hasAttribute('open')).to.equal(true)

    uDetails.open = false
    expect(uDetails.open).to.equal(false)
    expect(uSummary.getAttribute('aria-expanded')).to.equal('false')
    expect(nativeDetails.getAttribute('aria-hidden')).to.equal('true')
    expect(nativeDetails.hasAttribute('open')).to.equal(false)
  })

  it('respects id attributes', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(`
      <u-details>
        <u-summary id="summary-1">Summary 1</u-summary>
        <details id="details-1">Details 1</details>
      </u-details>
    `)
    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]

    expect(uSummary.id).to.equal('summary-1')
    expect(nativeDetails.id).to.equal('details-1')
    expect(uSummary.getAttribute('aria-controls')).to.equal('details-1')
    expect(nativeDetails.getAttribute(ARIA_LABELLEDBY)).to.equal('summary-1')

    uSummary.id = 'summary-1-changed-id'
    await nextFrame() // Let MutationObserver run
    expect(nativeDetails.getAttribute(ARIA_LABELLEDBY)).to.equal('summary-1-changed-id')
    
    nativeDetails.id = 'details-1-changed-id'
    await nextFrame() // Let MutationObserver run
    expect(uSummary.getAttribute('aria-controls')).to.equal('details-1-changed-id')
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

  it('respects nativeDetails open', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const nativeSummary = uDetails.querySelector('summary')
    expect(uDetails.open).to.equal(false)

    nativeSummary?.click()
    await nextFrame() // Let toggle event bubble
    await nextFrame() // Let click event bubble
    expect(uDetails.open).to.equal(true)
  })
})
