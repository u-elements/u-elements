---
title: u-tags
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-tags&gt; <mark data-badge="EXTENSION"></mark>
`<u-tags>` extends `<input>` with multiselect abilities. While multiselect combobox does not exist as a HTML element or ARIA pattern, `<u-tags>` adhere closely to HTML conventions while providing a thoroughly tested and accessible user experience.

**Quick intro:**
- Use `<data>` as direct child elements - these are the removable tags
- Use `<input>` and optionally `<u-datalist>` to allow adding and suggesting tags
- Use `data-*` attributes to translate screen reader announcements
- Use matching `id` on `<input>` and `for` attribute on `<label>` to connect
- **MDN Web Docs:** [&lt;data&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/data) ([HTMLDataElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)) / [&lt;input&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input) ([HTMLInputElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement)) / [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) ([HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)) / [&lt;option&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) ([HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement))


## Example

<Sandbox label="u-tags code example" />
<pre hidden>
&lt;label for="my-input"&gt;
  Choose flavor of ice cream
&lt;/label&gt;
&lt;u-tags&gt;
  &lt;data&gt;Coconut&lt;/data&gt;
  &lt;data&gt;Banana&lt;/data&gt;
  &lt;data&gt;Pineapple&lt;/data&gt;
  &lt;data&gt;Orange&lt;/data&gt;
  &lt;input id="my-input" list="my-list" /&gt;
  &lt;u-datalist id="my-list" data-singular="%d flavor" data-plural="%d flavours"&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
    &lt;u-option&gt;Licorice&lt;/u-option&gt;
    &lt;u-option&gt;Pistachios&lt;/u-option&gt;
    &lt;u-option&gt;Mango&lt;/u-option&gt;
    &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-tags&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-tags { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Install <mark :data-badge="data['u-tags']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-tags
```

```bash [PNPM]
pnpm add -S @u-elements/u-tags
```

```bash [Yarn]
yarn add @u-elements/u-tags
```

```bash [Bun]
bun add -S @u-elements/u-tags
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-tags@latest/dist/u-tags.js"></script>
```
:::

## Attributes and props

### `<u-tags>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `data-sr-added` prefixes announcements about additions. Defaults to `"Added"`
  - `data-sr-removed` prefixes announcements about removals. Defaults to `"Removed"`
  - `data-sr-empty` announces no selected items. Defaults to `"No selected"`
  - `data-sr-found` announces where to find amount of selected items. Defaults to `"Navigate left to find %d selected"`
  - `data-sr-of` separates "number _of_ total" in announcements. Defaults to `"of"`
- **DOM interface:** `UHTMLTagsElement` extends [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
  - `UHTMLTagsElement.control` returns `HTMLInputElement` contained in `<u-tags>`
  - `UHTMLTagsElement.items` returns `NodeListOf<HTMLDataElement>`

### `<data>`
- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `value` optionally specify the machine-readable translation of the text content.
- **DOM interface:** [`HTMLDataElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)
  - `HTMLDataElement.value` string reflecting the `value` HTML attribute.

## Events

In addition to the [usual events supported by HTML elements](https://developer.mozilla.org/en-US/docs/Web/API/Element#events), the `<u-tags>` elements dispatches a custom `tags` event before change, allowing you to keep track of and prevent additions and removal:
```js
myUTags.addEventListener('tags', (event) => {
  event.detail.action // String 'add' or 'remove'
  event.detail.item // HTMLDataElement to add or remove
  event.preventDefault() // Optionally prevent action
})
```


## Styling

`<u-tags>` renders as `display: block`, while `<data>` renders as `display: inline-block` with a `::after` element to render the removal `×`.


## Example: Norwegian

<Sandbox label="u-details language example" lang="no" />
<pre hidden>
&lt;label for="my-norwegian-tags"&gt;
  Velg type iskrem
&lt;/label&gt;
&lt;u-tags
  data-added="La til"
  data-remove="Trykk for å fjerne"
  data-removed="Fjernet"
  data-empty="Ingen valgte"
  data-found="Naviger til venstre for å finne %d valgte"
  data-of="av"
  id="my-norwegian-tags"
&gt;
  &lt;data&gt;Kokkos&lt;/data&gt;
  &lt;data&gt;Banan&lt;/data&gt;
  &lt;data&gt;Ananas&lt;/data&gt;
  &lt;data&gt;Appelsin&lt;/data&gt;
  &lt;input list="my-norwegian-list" /&gt;
  &lt;u-datalist id="my-norwegian-list" data-singular="%d smak" data-plural="%d smaker"&gt;
    &lt;u-option&gt;Kokkos&lt;/u-option&gt;
    &lt;u-option&gt;Jordbær&lt;/u-option&gt;
    &lt;u-option&gt;Sjokolade&lt;/u-option&gt;
    &lt;u-option&gt;Vanilje&lt;/u-option&gt;
    &lt;u-option&gt;Lakris&lt;/u-option&gt;
    &lt;u-option&gt;Pistasj&lt;/u-option&gt;
    &lt;u-option&gt;Mango&lt;/u-option&gt;
    &lt;u-option&gt;Hasselnøtt&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-tags&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-tags { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>


## Accessibility

| Screen reader | `<u-tags>` |
| --- | --- |
| VoiceOver (Mac) + Chrome | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: |
| VoiceOver (Mac) + Firefox  | :white_check_mark: |
| VoiceOver (Mac) + Safari | :white_check_mark: |
| VoiceOver (iOS) + Safari | :white_check_mark: |
| Jaws (PC) + Chrome | :white_check_mark: |
| Jaws (PC) + Edge | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: |
| NVDA (PC) + Chrome | :white_check_mark: |
| NVDA (PC) + Edge | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: needs focus mode to announce tag removal |
| Narrator (PC) + Chrome | :white_check_mark: |
| Narrator (PC) + Edge | :white_check_mark: |
| Narrator (PC) + Firefox | :white_check_mark: |
| TalkBack (Android) + Chrome | :white_check_mark: |
| TalkBack (Android) + Firefox | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :white_check_mark: |

## Specifications

- DOM interface: [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
- HTML Standard: [The &lt;div&gt; element](https://html.spec.whatwg.org/multipage/grouping-content.html#the-div-element)
- DOM interface: [HTMLDataElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)
- HTML Standard: [The &lt;data&gt; element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-data-element)