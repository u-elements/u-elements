---
title: u-combobox
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-combobox&gt; <mark data-badge="BETA"></mark>
`<u-combobox>` extends `<datalist>` with support for multiselect, separate label and programmatic value and clear button. While these features are [not yet](https://open-ui.org/components/combobox.explainer/) part of any official ARIA pattern or HTML element, `<u-combobox>` adhere closely to HTML conventions.

:::warning IMPORTANT
`u-combobox` is work in progress. Changes might apply and documentation is not complete.
:::

**Quick intro:**
- Use `<data>` as direct child elements - these are the removable items
- Use `<input>` and `<u-datalist>` to allow adding and suggesting items
- Use `<del>` between `input` and `datalist` to create a clear button
- Use `data-multiple` oto allow selecting multiple items
- Use `data-creatable` to allow creating items not in the list
- Use `data-*` attributes to translate screen reader announcements
- Use `beforechange`, `afterchange` and `beforematch` events to manipulate state
- Add `<select>` as child for `FormData` or form submittion compatibility
- Use matching `id` on `<input>` and `for` attribute on `<label>` to connect
- **MDN Web Docs:** [&lt;data&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/data) ([HTMLDataElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)) / [&lt;input&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input) ([HTMLInputElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement)) / [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) ([HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)) / [&lt;option&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) ([HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement))


## Example

<Sandbox label="u-combobox code example" />
<pre hidden>
&lt;label for="my-input"&gt;
  Choose flavor of ice cream
&lt;/label&gt;
&lt;u-combobox data-multiple&gt;
  &lt;data&gt;Coconut&lt;/data&gt;
  &lt;data&gt;Banana&lt;/data&gt;
  &lt;data&gt;Pineapple&lt;/data&gt;
  &lt;data&gt;Orange&lt;/data&gt;
  &lt;input id="my-input" list="my-list" /&gt;
  &lt;u-datalist id="my-list" data-sr-singular="%d flavor" data-sr-plural="%d flavours"&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
    &lt;u-option&gt;Licorice&lt;/u-option&gt;
    &lt;u-option&gt;Pistachios&lt;/u-option&gt;
    &lt;u-option&gt;Mango&lt;/u-option&gt;
    &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Install <mark :data-badge="data['u-combobox']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-combobox
```

```bash [PNPM]
pnpm add -S @u-elements/u-combobox
```

```bash [Yarn]
yarn add @u-elements/u-combobox
```

```bash [Bun]
bun add -S @u-elements/u-combobox
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-combobox@latest/dist/u-combobox.js"></script>
```
:::

## Attributes and props

### `<u-combobox>`


- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `data-sr-added` prefixes announcements about additions. Defaults to `"Added"`
  - `data-sr-removed` prefixes announcements about removals. Defaults to `"Removed"`
  - `data-sr-remove` announces ability to remove. Defaults to `"Press to remove"`
  - `data-sr-empty` announces no selected items. Defaults to `"No selected"`
  - `data-sr-found` announces where to find amount of selected items. Defaults to `"Navigate left to find %d selected"`
  - `data-sr-invalid` announces if trying to select invalid value. Defaults to `"Invalid value""`
  - `data-sr-of` separates "number _of_ total" in announcements. Defaults to `"of"`
- **DOM interface:** `UHTMLComboboxElement` extends [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
  - `UHTMLComboboxElement.control` returns `HTMLInputElement | null`
  - `UHTMLComboboxElement.items` returns `HTMLCollectionOf<HTMLDataElement>`
  - `UHTMLComboboxElement.list` returns `HTMLDataListElement | null`
  - `UHTMLComboboxElement.options` returns `HTMLCollectionOf<HTMLOptionElement> | undefined`
  - `UHTMLComboboxElement.values` returns `string[]` with `value` of each item

### `<data>`
- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `value` optionally specify the machine-readable translation of the text content.
- **DOM interface:** [`HTMLDataElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)
  - `HTMLDataElement.value` string reflecting the `value` HTML attribute.

## Events

In addition to the [usual events supported by HTML elements](https://developer.mozilla.org/en-US/docs/Web/API/Element#events), the `<u-combobox>` elements dispatches custom events allowing you to affect state:

### `beforechange`
```js
myCombobox.addEventListener('beforechange', (event) => {
  event.detail // HTMLDataElement to add or remove
  event.detail.isConnnected // true if removing, false if adding
  event.preventDefault() // Optionally prevent action
})
```

### `afterchange`
```js
myCombobox.addEventListener('afterchange', (event) => {
  event.detail // HTMLDataElement added or removed
  event.detail.isConnnected // false if removing, true if adding
})
```

### `beforematch`
```js
myCombobox.addEventListener('beforematch', (event) => {
  event.detail // HTMLOptionElement | undefined match in option list
})
```


## Styling

`<u-combobox>` renders as `display: block`, while `<data>` renders as `display: inline-block` with a `::after` element to render the removal `×`.

## Example: Norwegian

<Sandbox label="u-details language example" lang="no" />
<pre hidden>
&lt;label for="my-norwegian-combobox"&gt;
  Velg type iskrem
&lt;/label&gt;
&lt;u-combobox
  data-sr-added="La til"
  data-sr-remove="Trykk for å fjerne"
  data-sr-removed="Fjernet"
  data-sr-empty="Ingen valgte"
  data-sr-found="Naviger til venstre for å finne %d valgte"
  data-sr-of="av"
  id="my-norwegian-combobox"
&gt;
  &lt;data&gt;Kokkos&lt;/data&gt;
  &lt;data&gt;Banan&lt;/data&gt;
  &lt;data&gt;Ananas&lt;/data&gt;
  &lt;data&gt;Appelsin&lt;/data&gt;
  &lt;input list="my-norwegian-list" /&gt;
  &lt;u-datalist id="my-norwegian-list" data-sr-singular="%d smak" data-sr-plural="%d smaker"&gt;
    &lt;u-option&gt;Kokkos&lt;/u-option&gt;
    &lt;u-option&gt;Jordbær&lt;/u-option&gt;
    &lt;u-option&gt;Sjokolade&lt;/u-option&gt;
    &lt;u-option&gt;Vanilje&lt;/u-option&gt;
    &lt;u-option&gt;Lakris&lt;/u-option&gt;
    &lt;u-option&gt;Pistasj&lt;/u-option&gt;
    &lt;u-option&gt;Mango&lt;/u-option&gt;
    &lt;u-option&gt;Hasselnøtt&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>


## Accessibility

| Screen reader | `<u-combobox>` |
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
| NVDA (PC) + Firefox | :white_check_mark: needs focus mode to announce item removal |
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

## Changelog

- **0.0.10:** Only remove `<data>` during change event for React compatiliby
- **0.0.9:** Improve browser compatibility by avoiding `toggleAttribute`
- **0.0.8:** Avoid hiding `<del>` when clicking option without `value`
- **0.0.7:** Add support for `<del>` element to clear the input
- **0.0.6:** Ensure correct value of hidden `<select>`
- **0.0.5:** Prevent `input` value change when `beforechange` is prevented
- **0.0.4:** Bugfix
- **0.0.3:** Prevent add if `u-option` has empty value attribute
- **0.0.2:** Reset value when clicking option in multiple mode
- **0.0.1:** Support async `u-option` initialization
- **0.0.0:** Beta release