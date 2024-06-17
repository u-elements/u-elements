import { expect } from '@esm-bundle/chai'
import { compareSnapshot } from '@web/test-runner-commands'
import { UHTMLTagsElement } from './u-tags'
import { IS_FIREFOX } from '../utils'

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

describe('u-tabs', () => {
  it('matches snapshot', async () => {
    await compareSnapshot({
      name: `u-tabs${IS_FIREFOX ? '-android' : ''}`,
      content: toDOM(`<u-tags></u-tags>`).outerHTML
    })
  })

  it('is defined', () => {
    const uTags = toDOM<UHTMLTagsElement>(`<u-tags></u-tags>`)

    expect(uTags.items.length).to.equal(0)
    expect(uTags).to.be.instanceOf(UHTMLTagsElement)
    expect(window.customElements.get('u-tags')).to.equal(UHTMLTagsElement)
  })
})
