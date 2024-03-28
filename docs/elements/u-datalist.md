<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-datalist&gt; <mark data-badge="html"></mark>
`<u-datalist>` lets you suggest values to a connected `<input>`. You can use it to make things like comboboxes, autosuggest, autocomplete, live search results, etc.

**Quick intro:**
- Use `<u-option>` as child elements - these will show the suggestions while typing
- Use matching `id` on `<u-datalist>` and `list` attribute on `<input>` to connect
- **Want to show suggestions from a data source?** See [dynamic suggestions &rarr;](#dynamic-suggestions)
- **MDN Web Docs:** [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist), [&lt;option&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option)

## Example
<Sandbox>
&lt;style&gt;
  u-option[aria-selected="true"] { text-decoration: underline }
&lt;/style&gt;
&lt;label&gt;
  Choose flavour of ice cream
  &lt;br /&gt;
  &lt;input type="text" list="my-list" /&gt;
&lt;/label&gt;
&lt;u-datalist id="my-list"&gt;
  &lt;u-option&gt;Coconut&lt;/u-option&gt;
  &lt;u-option&gt;Strawberries&lt;/u-option&gt;
  &lt;u-option&gt;Chocolate&lt;/u-option&gt;
  &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;u-option&gt;Licorice&lt;/u-option&gt;
  &lt;u-option&gt;Pistachios&lt;/u-option&gt;
  &lt;u-option&gt;Mango&lt;/u-option&gt;
  &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
&lt;/u-datalist&gt;
</Sandbox>

## Install <mark :data-badge="data['u-datalist']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-datalist
```

```bash [PNPM]
pnpm add -S @u-elements/u-datalist
```

```bash [Yarn]
yarn add -S @u-elements/u-datalist
```

```bash [Bun]
bun add -S @u-elements/u-datalist
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-datalist@latest/dist/u-datalist.js"></script>
```
:::

## Attributes
| Attributes `<u-datalist>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||

## Events
Coming

## Styling
Coming

## Dynamic suggestions
Coming

## Fetch suggesions
Coming

## Link suggestions
Coming

## Accessibility

| Screen reader | `<datalist>` | `<u-datalist>` |
| --- | --- | --- |
| VoiceOver (Mac) + Chrome | :x: Does not announce option count | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Firefox | :x: Does not announce option count  | :white_check_mark: |
| VoiceOver (Mac) + Safari | :x: Does not announce option count | :white_check_mark: |
| VoiceOver (iOS) + Chrome | :x: Does not announce options | :white_check_mark: |
| VoiceOver (iOS) + Safari | :x: Does not announce options | :white_check_mark: |
| Jaws (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Edge | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Firefox | :x: Does not show options | :white_check_mark: |
| TalkBack (Android) + Chrome | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Firefox | :x: Does not show options | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :white_check_mark: | :white_check_mark: |

## Specifications

- DOM interface: [HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)
- HTML Standard: [The &lt;datalist&gt; element](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element)
- DOM interface: [HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement)
- HTML Standard: [The &lt;option&gt; element](https://html.spec.whatwg.org/multipage/form-elements.html#the-option-element)