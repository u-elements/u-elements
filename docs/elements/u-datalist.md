<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-datalist&gt; <mark data-badge="html"></mark>
`<u-datalist>` lets you suggest values to a connected `<input>`. You can use it to make things like comboboxes, autosuggest, autocomplete, live search results, etc.

**Quick intro:**
- Use `<u-option>` as child elements - these will be the values suggested while typing
- Use matching `id` on `<u-datalist>` and `list` attribute on `<input>` to connect
- **Want to control the suggestions?** Replace content as the user types <mark data-badge="non-standard" aria-description="Native &lt;datalist&gt; also supports replacing content on the fly, but suggestions will only show if they match the value of the connected &lt;input&gt;"></mark>
- **MDN Web Docs:** [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist), [&lt;option&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option)

## Example
<Sandbox>
&lt;style&gt;
  u-option[aria-selected=&quot;true&quot;] { text-decoration: underline }
&lt;/style&gt;
&lt;label&gt;
  Choose flavour of ice cream
  &lt;br /&gt;
  &lt;input type=&quot;text&quot; list=&quot;my-list&quot; /&gt;
&lt;/label&gt;
&lt;u-datalist id=&quot;my-list&quot;&gt;
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
npm add -D @u-elements/u-datalist
```

```bash [PNPM]
pnpm add -D @u-elements/u-datalist
```

```bash [Yarn]
yarn add -D @u-elements/u-datalist
```

```bash [Bun]
bun add -D @u-elements/u-datalist
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-datalist@latest/dist/u-datalist.js"></script>
```
:::

## Attributes
| Attributes `<u-datalist>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||

## Styling

Coming

## Specifications

- DOM interface: [HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)
- HTML Standard: [The &lt;datalist&gt; element](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element)
- DOM interface: [HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement)
- HTML Standard: [The &lt;option&gt; element](https://html.spec.whatwg.org/multipage/form-elements.html#the-option-element)