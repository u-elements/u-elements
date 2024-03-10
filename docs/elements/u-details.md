<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-details&gt; <mark data-badge="html"></mark>
`<u-details>` lets you open and close content when clicking on a child `<u-summary>`.
You can use it to make things like accordions, expandables, FAQs, dropdowns, etc.

**Quick intro:**
- Use `<u-summary>` as a direct child - this is the label
- Use any other content in `<u-details>` - this will hide/show
- Use the `open` attribute on `<u-details>` to change state
- **MDN Web Docs:** [&lt;details&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details),
[&lt;summary&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)

## Example
<Sandbox>
&lt;u-details&gt;
  &lt;u-summary&gt;Details&lt;/u-summary&gt;
  &lt;div&gt;
    Something small enough to escape casual notice.
  &lt;/div&gt;
&lt;/u-details&gt;
</Sandbox>

## Install <mark :data-badge="data['u-details']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-details
```

```bash [PNPM]
pnpm add -S @u-elements/u-details
```

```bash [Yarn]
yarn add -S @u-elements/u-details
```

```bash [Bun]
bun add -S @u-elements/u-details
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-details@latest/dist/u-details.js"></script>
```
:::

## Attributes

| Attributes `<u-details>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||
| `open` | When the `open` attribute is present, the content is shown. By default this attribute is absent which means the content is hidden. **Note:** Setting `open="false"` will not work as intended, as `open` is a boolean attribute you should provide or remove entirely. | Not present |

| Attributes `<u-summary>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||

## Events

In addition to the [usual events supported by HTML elements](https://developer.mozilla.org/en-US/docs/Web/API/Element#events), the `<u-details>` element dispatches a [`toggle` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement/toggle_event) _after_ the open state is changed:

```js
details.addEventListener('toggle', (event) => {
  if (details.open) {
    // the element was toggled open
  } else {
    // the element was toggled closed
  }
});
```

## Styling

Coming

## Specifications

- DOM interface: [HTMLDetailsElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
- HTML Standard: [The &lt;details&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
- HTML Standard: [The &lt;summary&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element)