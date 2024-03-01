import { expect } from '@esm-bundle/chai'
import { compareSnapshot } from '@web/test-runner-commands'
import { UHTMLOptionElement } from './u-option'

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

describe('u-option', () => {
  it('matches snapshot', async () => {
    await compareSnapshot({
      name: 'u-option',
      content: toDOM(`
      <div>
        <u-option>Option 1</u-option>
        <u-option selected>Option 2</u-option>
        <u-option disabled>Option 2</u-option>
      </div>
    `).outerHTML
    })
  })

  it('is defined', () => {
    const uOption = toDOM<UHTMLOptionElement>(`<u-option>Option 1</u-option>`)

    expect(uOption.label).to.equal('Option 1')
    expect(uOption).to.be.instanceOf(UHTMLOptionElement)
    expect(window.customElements.get('u-option')).to.equal(UHTMLOptionElement)
  })

  it('sets up properties', () => {
    const form = toDOM(`
      <form>
        <u-datalist>
          <u-option>Option 1</u-option>
          <u-option>TMP</u-option>
        </u-datalist>
      </form>
    `)
    const [uOption1, uOption2] = form.querySelectorAll<UHTMLOptionElement>('u-option')
    const uOptionEmptyAndIsolated = toDOM<UHTMLOptionElement>(`<u-option></u-option>`)

    uOption1.defaultSelected = true
    uOption1.disabled = true
    uOption1.selected = true
    uOption2.label = 'Option 2'
    uOption2.text = 'Text 2'
    uOption2.value = 'Value 2'
    uOption2.selected = false
    uOption2.disabled = false

    expect(uOption1.form).to.equal(form)
    expect(uOption1.disabled).to.equal(true)
    expect(uOption1.defaultSelected).to.equal(true)
    expect(uOption1.selected).to.equal(true)
    expect(uOption1.index).to.equal(0)
    expect(uOption1.label).to.equal('Option 1')
    expect(uOption1.text).to.equal('Option 1')
    expect(uOption1.value).to.equal('Option 1')
    expect(uOption2.form).to.equal(form)
    expect(uOption2.disabled).to.equal(false)
    expect(uOption2.defaultSelected).to.equal(false)
    expect(uOption2.selected).to.equal(false)
    expect(uOption2.index).to.equal(1)
    expect(uOption2.label).to.equal('Option 2')
    expect(uOption2.text).to.equal('Text 2')
    expect(uOption2.value).to.equal('Value 2')

    expect(uOptionEmptyAndIsolated.index).to.equal(0)
    expect(uOptionEmptyAndIsolated.text).to.equal('')
  })

  it('sets up attributes', () => {
    const uOption = toDOM<UHTMLOptionElement>(`<u-option>Option 1</u-option>`)

    expect(uOption.hasAttribute('aria-selected')).to.equal(false)
    expect(uOption.hasAttribute('aria-disabled')).to.equal(false)

    uOption.setAttribute('selected', '')
    uOption.setAttribute('disabled', '')
    expect(uOption.getAttribute('aria-selected')).to.equal('true')
    expect(uOption.getAttribute('aria-disabled')).to.equal('true')

    uOption.setAttribute('selected', 'banana')
    uOption.setAttribute('disabled', 'banana')
    expect(uOption.getAttribute('aria-selected')).to.equal('true')
    expect(uOption.getAttribute('aria-disabled')).to.equal('true')

    uOption.removeAttribute('selected')
    uOption.removeAttribute('disabled')
    expect(uOption.hasAttribute('aria-selected')).to.equal(false)
    expect(uOption.hasAttribute('aria-disabled')).to.equal(false)

    uOption.label = 'Label 1'
    expect(uOption.getAttribute('label')).to.equal('Label 1')
    
    uOption.value = 'Value 1'
    expect(uOption.getAttribute('value')).to.equal('Value 1')

    uOption.selected = true
    expect(uOption.hasAttribute('selected')).to.equal(true)
    expect(uOption.hasAttribute('aria-selected')).to.equal(true)

    uOption.selected = false
    expect(uOption.hasAttribute('selected')).to.equal(false)
    expect(uOption.hasAttribute('aria-selected')).to.equal(false)

    uOption.disabled = true
    expect(uOption.hasAttribute('disabled')).to.equal(true)
    expect(uOption.hasAttribute('aria-disabled')).to.equal(true)

    uOption.disabled = false
    expect(uOption.hasAttribute('disabled')).to.equal(false)
    expect(uOption.hasAttribute('aria-disabled')).to.equal(false)
  })
})
