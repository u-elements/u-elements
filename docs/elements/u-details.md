<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-details&gt; <mark data-badge="html"></mark>
`<u-details>` lets you open and close content when clicking on a child `<u-summary>`.
You can use it to make things like accordions, expandables, FAQs, dropdowns, etc.

**Quick intro:**
- Use `<u-summary>` as first child - this is the label
- Use any HTML element as second child - this will hide/show content <mark data-badge="non-standard" aria-description="Native &lt;details&gt; does not need a second child wrapping the content, but we need it to make screen readers see understand relation between &lt;u-summary&gt; and the content."></mark>
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
npm add -D @u-elements/u-details
```

```bash [PNPM]
pnpm add -D @u-elements/u-details
```

```bash [Yarn]
yarn add -D @u-elements/u-details
```

```bash [Bun]
bun add -D @u-elements/u-details
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

In addition to the [usual events supported by HTML elements](https://developer.mozilla.org/en-US/docs/Web/API/Element#events), the `<u-details>` element dispatches a `toggle` event _after_ the open state is changed:

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