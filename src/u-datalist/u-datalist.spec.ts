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

  test('handles multiple u-datalist on same page', async () => {
    const div = toDOM(`
      <div>
        ${DEFAULT_TEST_HTML}
        ${DEFAULT_TEST_HTML.replace(/datalist-1/g, 'datalist-2')}
      </div>
    `)
    const items1 = [...div.querySelectorAll('form:first-child *')]
    const items2 = [...div.querySelectorAll('form:last-child *')]
    const [, input1, uDatalist1] = items1 as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];
    const [, input2, uDatalist2] = items2 as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement];

    input1.focus()
    await vi.waitFor(() => {
      expect(uDatalist1.hidden).toBe(false)
      expect(uDatalist2.hidden).toBe(true)
    }, NEXT_TICK)

    input2.focus()
    await vi.waitFor(() => {
      expect(uDatalist2.hidden).toBe(false)
      expect(uDatalist1.hidden).toBe(true)
    }, NEXT_TICK)
  })
})
