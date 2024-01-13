import { describe, expect, test, vi } from 'vitest'
import { UHTMLProgressElement } from '..'

let MOCK_IS_IOS = false
vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../utils')>(),
  get IS_IOS() { return MOCK_IS_IOS }
}))

const toDOM = <T extends HTMLElement>(innerHTML: string): T =>
  Object.assign(document.body, { innerHTML }).firstElementChild as T

describe('u-progress', () => {
  test('snapshot', () => {
    const uProgress = toDOM<UHTMLProgressElement>(`<u-progress value="5" max="10"></u-progress>`)
    expect(uProgress).toMatchSnapshot()
  })

  test('is defined', () => {
    const uProgress = toDOM<UHTMLProgressElement>(`<u-progress value="5" max="10"></u-progress>`)

    expect(uProgress.max).toBe(10)
    expect(uProgress).toBeInstanceOf(UHTMLProgressElement)
    expect(window.customElements.get('u-progress')).toBe(UHTMLProgressElement)
  })

  test('sets up attributes', () => {
    const uProgress = toDOM<UHTMLProgressElement>(`<u-progress value="5" max="10"></u-progress>`)

    expect(uProgress.getAttribute('role')).toBe('progressbar')
    expect(uProgress.hasAttribute('aria-busy')).toBe(false)
    expect(uProgress.getAttribute('aria-valuenow')).toBe('50%')
    expect(uProgress.getAttribute('aria-valuemax')).toBe('100')
    expect(uProgress.getAttribute('aria-valuemin')).toBe('0')

    uProgress.value = null

    expect(uProgress.getAttribute('aria-busy')).toBe('true')
  })

  test('sets up IOS attributes', () => {
    MOCK_IS_IOS = true
    const uProgress = toDOM<UHTMLProgressElement>(`<u-progress value="5" max="10"></u-progress>`)

    expect(uProgress.getAttribute('role')).toBe('img')
    expect(uProgress.hasAttribute('aria-busy')).toBe(false)
    expect(uProgress.getAttribute('aria-label')).toBe('50%')
    expect(uProgress.getAttribute('aria-valuemax')).toBe('100')
    expect(uProgress.getAttribute('aria-valuemin')).toBe('0')

    uProgress.value = null

    expect(uProgress.getAttribute('aria-busy')).toBe('true')
    MOCK_IS_IOS = false
  })

  test('sets up properties', () => {
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

    expect(uProgress.labels.length).toBe(2)
    expect(uProgress.position).toBe(.5)
    expect(uProgress.max).toBe(10)
    expect(uProgress.value).toBe(5)
  })

  test('calculates position and percentage', () => {
    const uProgress = toDOM<UHTMLProgressElement>(`<u-progress value="5" max="10"></u-progress>`);

    expect(uProgress.max).toBe(10)
    expect(uProgress.position).toBe(.5)
    expect(uProgress.value).toBe(5)

    uProgress.max = 20

    expect(uProgress.max).toBe(20)
    expect(uProgress.position).toBe(.25)
    expect(uProgress.value).toBe(5)

    uProgress.value = 10

    expect(uProgress.max).toBe(20)
    expect(uProgress.position).toBe(.5)
    expect(uProgress.value).toBe(10)
  })

  test('handles invalid numeric value and max', () => {
    const uProgress = toDOM<UHTMLProgressElement>(`<u-progress></u-progress>`);

    expect(() => (uProgress.max = 'banana')).toThrow()
    expect(() => (uProgress.value = 'banana')).toThrow()
    expect(uProgress.value).toBe(null)
    expect(uProgress.max).toBe(1)
  })
})
