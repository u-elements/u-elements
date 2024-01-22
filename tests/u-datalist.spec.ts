import { expect } from '@esm-bundle/chai'
import { compareSnapshot, sendKeys } from '@web/test-runner-commands'
import { UHTMLDataListElement } from '../src'
import { ARIA_LABELLEDBY, IS_BROWSER, IS_IOS } from '../src/utils'

const nextFrame = async () =>
  new Promise(resolve => requestAnimationFrame(resolve))

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
  it('matches snapshot', async () => {
    await compareSnapshot({
      name: `u-datalist${IS_IOS ? '-ios' : ''}`,
      content: toDOM(DEFAULT_TEST_HTML).outerHTML
    })
  })
  
  it('is defined', () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    expect(input.list).to.equal(uDatalist)
    expect(uDatalist).to.to.be.instanceOf(UHTMLDataListElement)
    expect(window.customElements.get('u-datalist')).to.equal(UHTMLDataListElement)
  })

  it('sets up propertis', () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [,, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    expect(uDatalist.options.length).to.equal(3)
  })

  it('sets up attributes', () => {
    const uDatalist = toDOM(`<u-datalist></u-datalist>`)

    expect(uDatalist.hidden).to.equal(true)
    expect(uDatalist.role).to.equal('listbox')
  })

  it('responds on focus and blur', async () => {
    const div = toDOM(`<div>${DEFAULT_TEST_HTML}<input id="other-input" /></div>`)
    const items = [...div.querySelectorAll('form *')]
    const [label, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    expect(input.hasAttribute('aria-expanded')).to.equal(false)
    expect(uDatalist.hidden).to.equal(true)

    input.focus()
    await nextFrame() // Let focus event bubble
    expect(input.role).to.equal('combobox')
    expect(input.getAttribute('autocomplete')).to.equal('off')
    expect(input.getAttribute('aria-autocomplete')).to.equal('list')
    expect(input.getAttribute('aria-controls')).to.equal(uDatalist.id)
    expect(uDatalist.getAttribute(ARIA_LABELLEDBY)).to.equal(label.id)
    expect(input.getAttribute('aria-expanded')).to.equal('true')
    expect(uDatalist.hidden).to.equal(false)

    input.blur()
    await nextFrame() // Let blur event bubble
    await nextFrame() // Let setTimout in onBlur run
    expect(input.getAttribute('aria-expanded')).to.equal('false')
    expect(uDatalist.hidden).to.equal(true)

    input.focus()
    await nextFrame() // Let focus event bubble
    expect(input.getAttribute('aria-expanded')).to.equal('true')
    expect(uDatalist.hidden).to.equal(false)

    div.querySelector<HTMLInputElement>('#other-input')?.focus()    
    await nextFrame() // Let blur event bubble
    await nextFrame() // Let setTimout in onBlur run
    expect(input.getAttribute('aria-expanded')).to.equal('false')
    expect(uDatalist.hidden).to.equal(true)
  })

  it('handles keyboard arrow navigation', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    input.focus()
    await nextFrame() // Let focus event bubble
    expect(document.activeElement).to.equal(input)
      
    await sendKeys({ press: 'ArrowDown' })
    expect(document.activeElement).to.equal(uDatalist.options[0])

    await sendKeys({ press: 'ArrowUp' })
    expect(document.activeElement).to.equal(input)

    await sendKeys({ press: 'ArrowUp' })
    expect(document.activeElement).to.equal(uDatalist.options[2])

    await sendKeys({ press: 'ArrowDown' })
    expect(document.activeElement).to.equal(uDatalist.options[0])

    await sendKeys({ press: 'End' })
    expect(document.activeElement).to.equal(uDatalist.options[2])

    await sendKeys({ press: 'Home' })
    expect(document.activeElement).to.equal(uDatalist.options[0])

    await sendKeys({ press: 'Escape' })
    await nextFrame() // Let focus event bubble
    await nextFrame() // Let setTimout in onBlur run
    expect(document.activeElement).to.equal(input)
    expect(input.getAttribute('aria-expanded')).to.equal('false')
    expect(uDatalist.hidden).to.equal(true)

    await sendKeys({ press: 'ArrowDown' })
    expect(document.activeElement).to.equal(uDatalist.options[0])
    expect(input.getAttribute('aria-expanded')).to.equal('true')
    expect(uDatalist.hidden).to.equal(false)

    await sendKeys({ press: 'Escape' })
    await nextFrame() // Let focus event bubble
    await nextFrame() // Let setTimout in onBlur run
    expect(document.activeElement).to.equal(input)
    expect(input.getAttribute('aria-expanded')).to.equal('false')
    expect(uDatalist.hidden).to.equal(true)

    await sendKeys({ press: 'ArrowDown' })
    expect(document.activeElement).to.equal(uDatalist.options[0])

    await sendKeys({ press: 'Enter' })
    await nextFrame() // Let click event bubble
    await nextFrame() // Let setTimeout in onClick handler run
    expect(document.activeElement).to.equal(input)
    expect(input.value).to.equal(uDatalist.options[0].value)
    expect(input.getAttribute('aria-expanded')).to.equal('false')
    expect(uDatalist.hidden).to.equal(true)
  })

  it('ignores keystrokes with meta keys', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    input.focus()
    await sendKeys({ press: 'Control+ArrowDown' })
    await sendKeys({ press: 'Meta+ArrowDown' })
    await sendKeys({ press: 'Shift+ArrowDown' })
    expect(document.activeElement).to.equal(input)
  })

  it('filters items when typing', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    input.focus()
    await sendKeys({ press: '1' })
    await nextFrame() // Let input event bubble
    expect(document.activeElement).to.equal(input)
    expect(input.value).to.equal('1')
    expect(uDatalist.options[0].hidden).to.equal(false)
    expect(uDatalist.options[1].hidden).to.equal(true)
    expect(uDatalist.options[2].hidden).to.equal(true)
  })

  it('does not filter items added while in focus', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    input.focus()
    uDatalist.innerHTML = '<u-option>New option</u-option>'
    await nextFrame() // Let MutationObserver run
    expect(uDatalist.options[0].hidden).to.equal(false)

    await sendKeys({ press: '1' })
    await nextFrame() // Let focus event bubble
    expect(document.activeElement).to.equal(input)
    expect(input.value).to.equal('1')
    expect(uDatalist.options[0].value).to.equal('New option')
    expect(uDatalist.options[0].hidden).to.equal(false)
  })

  it('respects event.preventDefault', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input] = items as [HTMLLabelElement, HTMLInputElement]

    input.addEventListener('keydown', (event) => event.preventDefault())
    input.focus()
    await sendKeys({ press: 'ArrowDown' })
    expect(document.activeElement).to.equal(input)
  })

  it('re-opens on click on input', async () => {
    const items = [...toDOM(DEFAULT_TEST_HTML).querySelectorAll('*')]
    const [, input, uDatalist] = items as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    input.focus()
    expect(uDatalist.hidden).to.equal(false)

    await sendKeys({ press: 'Escape' })
    await nextFrame() // Let blur event bubble
    expect(uDatalist.hidden).to.equal(true)

    input.click()
    expect(uDatalist.hidden).to.equal(false)
  })

  it('handles multiple u-datalist on same page', async () => {
    const div = toDOM(`
      <div>
        ${DEFAULT_TEST_HTML}
        ${DEFAULT_TEST_HTML.replace(/datalist-1/g, 'datalist-2')}
      </div>
    `)
    const items1 = [...div.querySelectorAll('form:first-child *')]
    const items2 = [...div.querySelectorAll('form:last-child *')]
    const [, input1, uDatalist1] = items1 as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]
    const [, input2, uDatalist2] = items2 as [HTMLLabelElement, HTMLInputElement, UHTMLDataListElement]

    input1.focus()
    await nextFrame() // Let focus event bubble
    expect(uDatalist1.hidden).to.equal(false)
    expect(uDatalist2.hidden).to.equal(true)

    input2.focus()
    await nextFrame() // Let focus event bubble
    await nextFrame() // Let setTimout in onBlur run
    expect(uDatalist2.hidden).to.equal(false)
    expect(uDatalist1.hidden).to.equal(true)
  })
})
