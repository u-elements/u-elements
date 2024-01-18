import { describe, expect, test, vi } from 'vitest'
import { UHTMLDetailsElement, UHTMLSummaryElement } from '..'

const NEXT_TICK = { timeout: 500, interval: 1 }
const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

const DEFAULT_TEST_HTML = `
<u-details>
  <u-summary>Summary 1</u-summary>
  <details>Details 1</details>
</u-details>
`;

describe('u-details', () => {
  test('snapshot', () => {
    const div = toDOM(`
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
    `)
    expect(div).toMatchSnapshot()
  })

  test('is defined', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)

    expect(uDetails.open).toBe(false)
    expect(uDetails).toBeInstanceOf(UHTMLDetailsElement)
    expect(uDetails.firstElementChild).toBeInstanceOf(UHTMLSummaryElement)
    expect(window.customElements.get('u-details')).toBe(UHTMLDetailsElement)
    expect(window.customElements.get('u-summary')).toBe(UHTMLSummaryElement)
  })

  test('generates hidden native summary element', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const nativeDetails = uDetails.lastElementChild as HTMLDetailsElement
    const nativeSummary = nativeDetails.firstElementChild as HTMLElement

    expect(nativeSummary).toBeInstanceOf(HTMLElement)
    expect(nativeSummary.nodeName).toBe('SUMMARY')
    expect(nativeSummary.hidden).toBe(true)
  })

  test('sets up attributes when native details is appended', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(`<u-details><u-summary>Summary 1</u-summary></u-details>`)
    uDetails.insertAdjacentHTML('beforeend', '<details>Details 1</details>')

    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]
    await vi.waitFor(() => expect(nativeDetails.id).toBe(uSummary.getAttribute('aria-controls')), NEXT_TICK)
  })

  test('handles up open property and attributes change', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]

    expect(uSummary.role).toBe('button')
    expect(uSummary.id).toBe(nativeDetails.getAttribute('aria-labelledby'))
    expect(uSummary.tabIndex).toBe(0)
    expect(uSummary.getAttribute('aria-expanded')).toBe('false')
    expect(uSummary.getAttribute('aria-controls')).toBe(nativeDetails.id)
    expect(nativeDetails.role).toBe('group')
    expect(nativeDetails.getAttribute('aria-hidden')).toBe('true')
  })

  test('handles open property and attributes change', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]

    uDetails.open = true
    expect(uDetails.hasAttribute('open')).toBe(true)
    expect(uSummary.getAttribute('aria-expanded')).toBe('true')
    expect(nativeDetails.getAttribute('aria-hidden')).toBe('false')
    expect(nativeDetails.hasAttribute('open')).toBe(true)

    uDetails.removeAttribute('open')
    expect(uDetails.open).toBe(false)
    expect(uSummary.getAttribute('aria-expanded')).toBe('false')
    expect(nativeDetails.getAttribute('aria-hidden')).toBe('true')
    expect(nativeDetails.hasAttribute('open')).toBe(false)

    uDetails.setAttribute('open', 'banana')
    expect(uDetails.open).toBe(true)
    expect(uSummary.getAttribute('aria-expanded')).toBe('true')
    expect(nativeDetails.getAttribute('aria-hidden')).toBe('false')
    expect(nativeDetails.hasAttribute('open')).toBe(true)

    uDetails.open = false
    expect(uDetails.open).toBe(false)
    expect(uSummary.getAttribute('aria-expanded')).toBe('false')
    expect(nativeDetails.getAttribute('aria-hidden')).toBe('true')
    expect(nativeDetails.hasAttribute('open')).toBe(false)
  })

  test('respects id attributes', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(`
      <u-details>
        <u-summary id="summary-1">Summary 1</u-summary>
        <details id="details-1">Details 1</details>
      </u-details>
    `)
    const [uSummary, nativeDetails] = [...uDetails.children] as [UHTMLSummaryElement, HTMLDetailsElement]

    expect(uSummary.id).toBe('summary-1')
    expect(nativeDetails.id).toBe('details-1')
    expect(uSummary.getAttribute('aria-controls')).toBe('details-1')
    expect(nativeDetails.getAttribute('aria-labelledby')).toBe('summary-1')

    uSummary.id = 'summary-1-changed-id'
    await vi.waitFor(() => expect(nativeDetails.getAttribute('aria-labelledby')).toBe('summary-1-changed-id'), NEXT_TICK)
    
    nativeDetails.id = 'details-1-changed-id'
    await vi.waitFor(() => expect(uSummary.getAttribute('aria-controls')).toBe('details-1-changed-id'), NEXT_TICK)
  })

  test('updates attributes on click', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const [uSummary] = [...uDetails.children] as [UHTMLSummaryElement]

    uSummary.click()
    expect(uDetails.open).toBe(true)

    uSummary.focus()
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(uDetails.open).toBe(false)   
  })

  test('respects nativeDetails open', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(DEFAULT_TEST_HTML)
    const nativeDetails = uDetails.lastElementChild as HTMLDetailsElement

    expect(uDetails.open).toBe(false)
    ;(nativeDetails.firstElementChild as HTMLElement).click()
    await vi.waitFor(() => expect(uDetails.open).toBe(true), NEXT_TICK)
  })
})
