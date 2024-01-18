import { describe, expect, test, vi } from 'vitest'
import { UHTMLDataListElement } from '..'

let MOCK_IS_IOS = false
vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../utils')>(),
  get IS_IOS() { return MOCK_IS_IOS }
}))

const NEXT_TICK = { timeout: 500, interval: 1 }
const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

const DEFAULT_TEST_HTML = `
<form>
  <label>
    Search here
    <input type="text" list="datalist-1" />
  </label>
  <u-datalist id="datalist-1">
    <u-option>Option 1</u-option>
    <u-option>Option 2</u-option>
    <u-option>Option 3</u-option>
  </u-datalist>
</form>
`

describe('u-datalist', () => {
  test('snapshot', () => {
    const form = toDOM(DEFAULT_TEST_HTML)
    expect(form).toMatchSnapshot()
  })
  
  test('is defined', () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    expect(input.list).toBe(uDatalist)
    expect(uDatalist).toBeInstanceOf(UHTMLDataListElement)
    expect(window.customElements.get('u-datalist')).toBe(UHTMLDataListElement)
  })

  test('sets up propertis', () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [,, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    expect(uDatalist.options.length).toBe(3)
  })

  test('sets up attributes', async () => {
    const uDatalist = toDOM(`<u-datalist></u-datalist>`)

    expect(uDatalist.hidden).toBe(true)
    expect(uDatalist.role).toBe('listbox')
  })

  test('sets up iOS attributes', async () => {
    MOCK_IS_IOS = true
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    input.focus()
    expect(uDatalist.options[0].title).toBe('1/3')
    expect(uDatalist.options[1].title).toBe('2/3')
    expect(uDatalist.options[2].title).toBe('3/3')
    MOCK_IS_IOS = false
  })

  test('responds on focus and blur', async () => {
    const div = toDOM(`<div>${DEFAULT_TEST_HTML}<input id="other-input" /></div>`);
    const items = [...div.querySelectorAll('form *')]
    const [label, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    expect(input.hasAttribute('aria-expanded')).toBe(false)
    expect(uDatalist.hidden).toBe(true)

    input.focus()
    expect(input.role).toBe('combobox')
    expect(input.getAttribute('autocomplete')).toBe('off')
    expect(input.getAttribute('aria-autocomplete')).toBe('list')
    expect(input.getAttribute('aria-controls')).toBe(uDatalist.id)
    expect(uDatalist.getAttribute('aria-labelledby')).toBe(label.id)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(uDatalist.hidden).toBe(false)

    input.blur()
    await vi.waitFor(() => {
      expect(input.getAttribute('aria-expanded')).toBe('false')
      expect(uDatalist.hidden).toBe(true)
    }, NEXT_TICK)

    input.focus()
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(uDatalist.hidden).toBe(false)

    div.querySelector<HTMLInputElement>('#other-input')?.focus()
    await vi.waitFor(() => {
      expect(input.getAttribute('aria-expanded')).toBe('false')
      expect(uDatalist.hidden).toBe(true)
    }, NEXT_TICK)
  })

  test('handles keyboard arrow navigation', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    input.focus()
    expect(document.activeElement).toBe(input)
      
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(uDatalist.options[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(document.activeElement).toBe(input)

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(document.activeElement).toBe(uDatalist.options[2])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(uDatalist.options[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(document.activeElement).toBe(uDatalist.options[2])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(document.activeElement).toBe(uDatalist.options[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(uDatalist.hidden).toBe(true)

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(uDatalist.options[0])
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(uDatalist.hidden).toBe(false)

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(uDatalist.hidden).toBe(true)

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(document.activeElement).toBe(uDatalist.options[0])

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(input)
      expect(input.value).toBe(uDatalist.options[0].value)
      expect(input.getAttribute('aria-expanded')).toBe('false')
      expect(uDatalist.hidden).toBe(true)
    }, NEXT_TICK)

  })

  test('ignores keystrokes meta keys', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    input.focus()
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }))
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }))
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true }))
    expect(document.activeElement).toBe(input)
  })

  test('filters items when typing', () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    input.focus()
    input.value = '1' // Have to set programatically since programatic KeyboardEvent isTrusted: false 
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('1')
    expect(uDatalist.options[0].hidden).toBe(false)
    expect(uDatalist.options[1].hidden).toBe(true)
    expect(uDatalist.options[2].hidden).toBe(true)
  })

  test('does not filter items added while in focus', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    input.focus()
    uDatalist.innerHTML = '<u-option>New option</u-option>'
    await vi.waitFor(() => expect(uDatalist.options[0].hidden).toBe(false), NEXT_TICK)

    input.value = '1' // Have to set programatically since programatic InputEvent isTrusted: false 
    document.activeElement?.dispatchEvent(new InputEvent('input', { data: '1', bubbles: true }))
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('1')
    expect(uDatalist.options[0].value).toBe('New option')
    expect(uDatalist.options[0].hidden).toBe(false)
  })

  test('respects event.preventDefault', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input] = items as [HTMLLabelElement, HTMLInputElement];

    input.addEventListener('keydown', (event) => event.preventDefault())
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(input)
  })

  test('re-opens on click on input', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    input.focus()
    expect(uDatalist.hidden).toBe(false)

    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(uDatalist.hidden).toBe(true)

    input.click()
    expect(uDatalist.hidden).toBe(false)
  })

  /*test('generates hidden native summary element', () => {
    const uDetails = toDOM<UHTMLDetailsElement>(`
      <u-details>
        <u-summary>Summary 1</u-summary>
        <details>Details 1</details>
      </u-details>
    `)
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
    const uDetails = toDOM<UHTMLDetailsElement>(`
      <u-details>
        <u-summary>Summary 1</u-summary>
        <details>Details 1</details>
      </u-details>
    `)
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
    const uDetails = toDOM<UHTMLDetailsElement>(`
      <u-details>
        <u-summary>Summary 1</u-summary>
        <details>Details 1</details>
      </u-details>
    `)
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
    const uDetails = toDOM<UHTMLDetailsElement>(`
      <u-details>
        <u-summary>Summary 1</u-summary>
        <details>Details 1</details>
      </u-details>
    `)
    const [uSummary] = [...uDetails.children] as [UHTMLSummaryElement]

    uSummary.click()
    expect(uDetails.open).toBe(true)

    uSummary.focus()
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: ' ', bubbles: true }))
    expect(uDetails.open).toBe(false)   
  })

  test('respects nativeDetails open', async () => {
    const uDetails = toDOM<UHTMLDetailsElement>(`
      <u-details>
        <u-summary>Summary 1</u-summary>
        <details>Details 1</details>
      </u-details>
    `)
    const nativeDetails = uDetails.lastElementChild as HTMLDetailsElement

    expect(uDetails.open).toBe(false)
    ;(nativeDetails.firstElementChild as HTMLElement).click()
    await vi.waitFor(() => expect(uDetails.open).toBe(true), NEXT_TICK)
  })*/
})
