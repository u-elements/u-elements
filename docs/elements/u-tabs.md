<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-tabs&gt; <mark data-badge="aria"></mark>
`<u-tabs>` is not a native HTML element, but follows [ARIA best practice for tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). It lets you navigate between groups of information that appear in the same context.

**Quick intro:**
- Use `<u-tablist>` as first child, that groups multiple `<u-tab>` - these are the labels
- Use `<u-tabpanel>` as adjacent children - these hide/show content of related `<u-tab>`
- Use the `aria-selected="true"` on `<u-tab>` to set default open tab
- **ARIA Authoring Practices Guide Docs:** [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

## Example
<Sandbox>
&lt;style&gt;
  u-tab { padding: .5em }
  u-tab[aria-selected=&quot;true&quot;] { border-bottom: 4px solid }
  u-tabpanel { padding: 1em; border: 1px solid }
&lt;/style&gt;
&lt;u-tabs&gt;
  &lt;u-tablist&gt;
    &lt;u-tab&gt;Tab 1&lt;/u-tab&gt;
    &lt;u-tab&gt;Tab 2&lt;/u-tab&gt;
    &lt;u-tab&gt;Tab 3&lt;/u-tab&gt;
  &lt;/u-tablist&gt;
  &lt;u-tabpanel&gt;Panel 1&lt;/u-tabpanel&gt;
  &lt;u-tabpanel&gt;Panel 2&lt;/u-tabpanel&gt;
  &lt;u-tabpanel&gt;Panel 3&lt;/u-tabpanel&gt;
&lt;/u-tabs&gt;
</Sandbox>

## Install <mark :data-badge="data['u-tabs']"></mark>

::: code-group

```bash [NPM]
npm add -D @u-elements/u-tabs
```

```bash [PNPM]
pnpm add -D @u-elements/u-tabs
```

```bash [Yarn]
yarn add -D @u-elements/u-tabs
```

```bash [Bun]
bun add -D @u-elements/u-tabs
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-tabs@latest/dist/index.js"></script>
```
:::

## Attributes

| Attributes `<u-tabs>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||

| Attributes `<u-tablist>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||

| Attributes `<u-tab>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||
| `aria-selected` | Specify `"true"` or `"false"` to set tab state | `"false"` |

| Attributes `<u-tabpanel>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||


## Styling

Coming

## Specifications

- ARIA Authoring Practices: [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)