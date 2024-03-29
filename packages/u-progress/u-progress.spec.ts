import { expect } from '@esm-bundle/chai'
import { compareSnapshot } from '@web/test-runner-commands'
import { UHTMLProgressElement } from './u-progress'
import { IS_FIREFOX, IS_IOS } from '../utils'

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

describe('u-progress', () => {
  it('matches snapshot', async () => {
    await compareSnapshot({
      name: `u-progress${IS_IOS ? '-ios' : IS_FIREFOX ? '-firefox' : ''}`,
      content: toDOM(`<u-progress value="5" max="10"></u-progress>`).outerHTML
    })
  })

  it('is defined', () => {
    const uProgress = toDOM<UHTMLProgressElement>(
      `<u-progress value="5" max="10"></u-progress>`
    )

    expect(uProgress.max).to.equal(10)
    expect(uProgress).to.be.instanceOf(UHTMLProgressElement)
    expect(window.customElements.get('u-progress')).to.equal(
      UHTMLProgressElement
    )
  })

  it('sets up attributes', () => {
    const asImage = IS_IOS || IS_FIREFOX
    const uProgress = toDOM<UHTMLProgressElement>(
      `<u-progress value="5" max="10"></u-progress>`
    )

    expect(
      uProgress.getAttribute(asImage ? 'aria-label' : 'aria-valuenow')
    ).to.equal(asImage ? '50%' : '50')
    expect(uProgress.getAttribute('role')).to.equal(
      asImage ? 'img' : 'progressbar'
    )
    expect(uProgress.getAttribute('aria-valuemin')).to.equal('0')
    expect(uProgress.getAttribute('aria-valuemax')).to.equal('100')
    expect(uProgress.hasAttribute('aria-busy')).to.equal(false)

    uProgress.value = null
    expect(uProgress.getAttribute('aria-busy')).to.equal('true')
  })

  it('sets up properties', () => {
    const uProgress = toDOM(`
      <div>
        <label for="progress-1">Label 1</label>
        <label>
          Label 2
          <u-progress id="progress-1" value="5" max="10"></u-progress>
        <label>
        <label>Label 3</label>
      </div>
    `).querySelector('u-progress') as UHTMLProgressElement

    expect(uProgress.labels.length).to.equal(2)
    expect(uProgress.position).to.equal(0.5)
    expect(uProgress.max).to.equal(10)
    expect(uProgress.value).to.equal(5)
  })

  it('calculates position and percentage', () => {
    const uProgress = toDOM<UHTMLProgressElement>(
      `<u-progress value="5" max="10"></u-progress>`
    )

    expect(uProgress.max).to.equal(10)
    expect(uProgress.position).to.equal(0.5)
    expect(uProgress.value).to.equal(5)

    uProgress.max = 20

    expect(uProgress.max).to.equal(20)
    expect(uProgress.position).to.equal(0.25)
    expect(uProgress.value).to.equal(5)

    uProgress.value = 10

    expect(uProgress.max).to.equal(20)
    expect(uProgress.position).to.equal(0.5)
    expect(uProgress.value).to.equal(10)
  })

  it('handles invalid numeric value and max', () => {
    const uProgress = toDOM<UHTMLProgressElement>(`<u-progress></u-progress>`)

    expect(() => (uProgress.max = 'banana')).to.throw()
    expect(() => (uProgress.value = 'banana')).to.throw()
    expect(uProgress.value).to.equal(null)
    expect(uProgress.max).to.equal(1)
  })
})
