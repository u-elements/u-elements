<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-tabs&gt; <mark data-badge="aria"></mark>
`<u-tabs>` is not a native HTML element, but follows [ARIA authoring practices for tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). It lets you navigate between groups of information that appear in the same context.

**Quick intro:**
- Use `<u-tablist>` as first child, grouping multiple `<u-tab>` - these are the labels
- Use `<u-tabpanel>` as adjacent children - these hide/show content of related `<u-tab>`
- Use `<u-tab aria-selected="true">` to set the open tab (defaults to first tab)
- Use `<u-tab aria-controls="id-of-panel">` if you need panels outside `<u-tabs>`
- **ARIA Authoring Practices Guide Docs:** [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

## Example
<Sandbox>
&lt;style&gt;
  u-tab { padding: .5em }
  u-tab[aria-selected="true"] { border-bottom: 4px solid }
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
npm add -S @u-elements/u-tabs
```

```bash [PNPM]
pnpm add -S @u-elements/u-tabs
```

```bash [Yarn]
yarn add -S @u-elements/u-tabs
```

```bash [Bun]
bun add -S @u-elements/u-tabs
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-tabs@latest/dist/u-tabs.js"></script>
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
| `aria-controls` | Specify id of a `<u-panel>` to control panel regardless of DOM position | |

| Attributes `<u-tabpanel>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||

## Events

No custom events. Changing tabs is done through `click` so listening for this is sufficient:
```js
document.addEventListener('click', ({ target }) => {
  const tab = target instanceof Element && target.closest('u-tab');

  if (tab) {
    console.log('changed to tab:', tab);
  }
})
```

## Styling

### Styling the tab state

`<u-tab>` automatically gets a `aria-selected="true"` or `aria-selected="false"` attribute, which can be utilized for styling purposes:

```css
.my-tab[aria-selected="true"] {
  /* Your active tab styling here */
}
.my-tab[aria-selected="false"] {
  /* Your inactive tab styling here */
}
```


### Styling the tablist

`<u-tabs>`, `<u-tablist>` and `<u-tabpanel>` renders as `display: block`, while `<u-tab>` renders as `display: inline-block`.
Setting `<u-tablist>` to `display: flex` gives you great control of how to align tabs, and whether or not to allow horizontal scroll or wrapping:


<Sandbox>
&lt;style&gt;
  .my-tablist-scrolls {
    display: flex;
    overflow: auto;
    white-space: nowrap;
  }
  .my-tablist-wrapps {
    display: flex;
    flex-wrap: wrap;
  }
&lt;/style&gt;
.my-tablist-scrolls:
&lt;u-tabs&gt;
  &lt;u-tablist class="my-tablist-scrolls"&gt;
    &lt;u-tab&gt;Tab 1&lt;/u-tab&gt;&lt;u-tab&gt;Tab 2&lt;/u-tab&gt;&lt;u-tab&gt;Tab 3&lt;/u-tab&gt;&lt;u-tab&gt;Tab 4&lt;/u-tab&gt;&lt;u-tab&gt;Tab 5&lt;/u-tab&gt;&lt;u-tab&gt;Tab 6&lt;/u-tab&gt;&lt;u-tab&gt;Tab 7&lt;/u-tab&gt;
  &lt;/u-tablist&gt;
  &lt;u-tabpanel&gt;Panel 1&lt;/u-tabpanel&gt;
&lt;/u-tabs&gt;
&lt;br /&gt;.my-tablist-wrapps:
&lt;u-tabs&gt;
  &lt;u-tablist class="my-tablist-wrapps"&gt;
    &lt;u-tab&gt;Tab 1&lt;/u-tab&gt;&lt;u-tab&gt;Tab 2&lt;/u-tab&gt;&lt;u-tab&gt;Tab 3&lt;/u-tab&gt;&lt;u-tab&gt;Tab 4&lt;/u-tab&gt;&lt;u-tab&gt;Tab 5&lt;/u-tab&gt;&lt;u-tab&gt;Tab 6&lt;/u-tab&gt;&lt;u-tab&gt;Tab 7&lt;/u-tab&gt;
  &lt;/u-tablist&gt;
  &lt;u-tabpanel&gt;Panel 1&lt;/u-tabpanel&gt;
&lt;/u-tabs&gt;
</Sandbox>

## Accessibility

| Screen reader | `<u-tabs>` |
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
| NVDA (PC) + Firefox | :white_check_mark: |
| Narrator (PC) + Chrome | :white_check_mark: |
| Narrator (PC) + Edge | :white_check_mark: |
| Narrator (PC) + Firefox | :white_check_mark: |
| TalkBack (Android) + Chrome | :white_check_mark: |
| TalkBack (Android) + Firefox | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :white_check_mark: |

## Specifications

- ARIA Authoring Practices: [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)