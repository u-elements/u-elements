// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { UHTMLOptionElement } from '../src'

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

describe('u-option', () => {
  test('snapshot', () => {
    const form = toDOM(`
      <form>
        <u-option>Option 1</u-option>
        <u-option selected>Option 2</u-option>
        <u-option disabled>Option 2</u-option>
      </form>
    `)
    expect(form).toMatchSnapshot()
  })

  test('is defined', () => {
    const uOption = toDOM<UHTMLOptionElement>(`<u-option>Option 1</u-option>`)

    expect(uOption.label).toBe('Option 1')
    expect(uOption).toBeInstanceOf(UHTMLOptionElement)
    expect(window.customElements.get('u-option')).toBe(UHTMLOptionElement)
  })

  test('sets up properties', () => {
    const form = toDOM(`
      <form>
        <u-datalist>
          <u-option>Option 1</u-option>
          <u-option>TMP</u-option>
        </u-datalist>
      </form>
    `);
    const [uOption1, uOption2] = form.querySelectorAll<UHTMLOptionElement>('u-option')
    const uOptionEmptyAndIsolated = toDOM<UHTMLOptionElement>(`<u-option></u-option>`);

    uOption1.defaultSelected = true
    uOption1.disabled = true
    uOption1.selected = true
    uOption2.label = 'Option 2'
    uOption2.text = 'Text 2'
    uOption2.value = 'Value 2'
    uOption2.selected = false
    uOption2.disabled = false

    expect(uOption1.form).toBe(form)
    expect(uOption1.disabled).toBe(true)
    expect(uOption1.defaultSelected).toBe(true)
    expect(uOption1.selected).toBe(true)
    expect(uOption1.index).toBe(0)
    expect(uOption1.label).toBe('Option 1')
    expect(uOption1.text).toBe('Option 1')
    expect(uOption1.value).toBe('Option 1')
    expect(uOption2.form).toBe(form)
    expect(uOption2.disabled).toBe(false)
    expect(uOption2.defaultSelected).toBe(false)
    expect(uOption2.selected).toBe(false)
    expect(uOption2.index).toBe(1)
    expect(uOption2.label).toBe('Option 2')
    expect(uOption2.text).toBe('Text 2')
    expect(uOption2.value).toBe('Value 2')

    expect(uOptionEmptyAndIsolated.index).toBe(0)
    expect(uOptionEmptyAndIsolated.text).toBe('')
  })

  test('sets up attributes', () => {
    const uOption = toDOM<UHTMLOptionElement>(`<u-option>Option 1</u-option>`);

    expect(uOption.hasAttribute('aria-selected')).toBe(false)
    expect(uOption.hasAttribute('aria-disabled')).toBe(false)

    uOption.setAttribute('selected', '')
    uOption.setAttribute('disabled', '')
    expect(uOption.getAttribute('aria-selected')).toBe('true')
    expect(uOption.getAttribute('aria-disabled')).toBe('true')

    uOption.setAttribute('selected', 'banana')
    uOption.setAttribute('disabled', 'banana')
    expect(uOption.getAttribute('aria-selected')).toBe('true')
    expect(uOption.getAttribute('aria-disabled')).toBe('true')

    uOption.removeAttribute('selected')
    uOption.removeAttribute('disabled')
    expect(uOption.hasAttribute('aria-selected')).toBe(false)
    expect(uOption.hasAttribute('aria-disabled')).toBe(false)

    uOption.label = 'Label 1';
    expect(uOption.getAttribute('label')).toBe('Label 1')
    
    uOption.value = 'Value 1';
    expect(uOption.getAttribute('value')).toBe('Value 1')

    uOption.selected = true;
    expect(uOption.hasAttribute('selected')).toBe(true)
    expect(uOption.hasAttribute('aria-selected')).toBe(true)

    uOption.selected = false;
    expect(uOption.hasAttribute('selected')).toBe(false)
    expect(uOption.hasAttribute('aria-selected')).toBe(false)

    uOption.disabled = true;
    expect(uOption.hasAttribute('disabled')).toBe(true)
    expect(uOption.hasAttribute('aria-disabled')).toBe(true)

    uOption.disabled = false;
    expect(uOption.hasAttribute('disabled')).toBe(false)
    expect(uOption.hasAttribute('aria-disabled')).toBe(false)
  })
})
