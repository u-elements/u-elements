import { describe, expect, test } from 'vitest'
import { UHTMLOptionElement } from '..'

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

describe('u-option', () => {
  test('snapshot', () => {
    const uOption = toDOM<UHTMLOptionElement>(`<u-option>Option 1</u-option>`)
    expect(uOption).toMatchSnapshot()
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
    uOption1.disabled = false
    uOption1.selected = true
    uOption2.disabled = true
    uOption2.label = 'Option 2'
    uOption2.text = 'Text 2'
    uOption2.value = 'Value 2'

    expect(uOption1.form).toBe(form)
    expect(uOption1.disabled).toBe(false)
    expect(uOption1.defaultSelected).toBe(true)
    expect(uOption1.selected).toBe(true)
    expect(uOption1.index).toBe(0)
    expect(uOption1.label).toBe('Option 1')
    expect(uOption1.text).toBe('Option 1')
    expect(uOption1.value).toBe('Option 1')
    expect(uOption2.form).toBe(form)
    expect(uOption2.disabled).toBe(true)
    expect(uOption2.defaultSelected).toBe(false)
    expect(uOption2.selected).toBe(false)
    expect(uOption2.index).toBe(1)
    expect(uOption2.label).toBe('Option 2')
    expect(uOption2.text).toBe('Text 2')
    expect(uOption2.value).toBe('Value 2')

    expect(uOptionEmptyAndIsolated.index).toBe(0)
    expect(uOptionEmptyAndIsolated.text).toBe('')
  })

  // test('calculates position and percentage', () => {
  //   const uOption = toDOM<UHTMLOptionElement>(`
  //       <u-option id="progress-1">Option 1</u-option>
  //   `);

  //   expect(uOption.max).toBe(10)
  //   expect(uOption.position).toBe(.5)
  //   expect(uOption.value).toBe(5)

  //   uOption.max = 20

  //   expect(uOption.max).toBe(20)
  //   expect(uOption.position).toBe(.25)
  //   expect(uOption.value).toBe(5)

  //   uOption.value = 10

  //   expect(uOption.max).toBe(20)
  //   expect(uOption.position).toBe(.5)
  //   expect(uOption.value).toBe(10)
  // })

  // test('handles invalid numeric value and max', () => {
  //   const uOption = toDOM<UHTMLOptionElement>(`<u-option>Option 1</u-option>`);

  //   expect(() => (uOption.max = 'banana')).toThrow()
  //   expect(() => (uOption.value = 'banana')).toThrow()
  //   expect(uOption.value).toBe(null)
  //   expect(uOption.max).toBe(1)
  // })
})
