---
title: u-tabs
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-tabs&gt; <mark data-badge="ARIA"></mark>
`<u-tabs>` is not a native HTML element, but follows [ARIA authoring practices for tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). It lets you navigate between groups of information that appear in the same context.

**Quick intro:**
- Use `<u-tabs>` to group all tabbing-elements
- Use `<u-tablist>` around multiple `<u-tab>` direct children - these are the labels
- Use `<u-tab aria-selected="true">` to set the open tab (defaults to first tab)
- Use `<u-tab aria-controls="id-of-panel">` if you need panels outside `<u-tabs>`
- Use `<u-tabpanel>`s after  `<u-tablist>` - these hide/show content of related `<u-tab>`
- **ARIA Authoring Practices Guide Docs:** [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

## Example

<Sandbox label="u-tabs code example" />
<pre hidden>
&lt;u-tabs&gt;
  &lt;u-tablist&gt;
    &lt;u-tab&gt;Tab 1&lt;/u-tab&gt;
    &lt;u-tab&gt;Tab 2&lt;/u-tab&gt;
    &lt;u-tab&gt;Tab 3&lt;/u-tab&gt;
  &lt;/u-tablist&gt;
  &lt;u-tabpanel&gt;Panel 1 with &lt;a href="#"&gt;link&lt;/a&gt;&lt;/u-tabpanel&gt;
  &lt;u-tabpanel&gt;Panel 2 with &lt;a href="#"&gt;link&lt;/a&gt;&lt;/u-tabpanel&gt;
  &lt;u-tabpanel&gt;Panel 3 with &lt;a href="#"&gt;link&lt;/a&gt;&lt;/u-tabpanel&gt;
&lt;/u-tabs&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-tab { padding: .5em }
  u-tab[aria-selected="true"] { border-bottom: 4px solid }
  u-tabpanel { padding: 1em; border: 1px solid }
&lt;/style&gt;
</pre>

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

## Attributes and props

### `<u-tabs>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
- **DOM interface:** `UHTMLTabsElement` extends [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
  - `UHTMLTabsElement.tabList` returns the contained `UHTMLTabListElement`
  - `UHTMLTabsElement.selectedIndex` sets or gets a `number` reflecting the index of the first selected `<u-tab>` element. Will ignore invalid indexes.
  - `UHTMLTabsElement.tabs` returns a `NodeListOf<UHTMLTabElement>`
  - `UHTMLTabsElement.panels` returns a `NodeListOf<UHTMLTabPanelElement>`

### `<u-tablist>`
- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
- **DOM interface:** `UHTMLTabListElement` extends [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
  - `UHTMLTabListElement.tabsElement` returns the parent `UHTMLTabsElement`
  - `UHTMLTabsElement.selectedIndex` sets or gets a `number` reflecting the index of the first selected `<u-tab>` element. Will ignore invalid indexes.
  - `UHTMLTabsElement.tabs` returns a `NodeListOf<UHTMLTabElement>`

### `<u-tab>`
- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `aria-selected` can contain `"true"` or `"false"` to set the currently selected tab 
  - `aria-controls` can contain ID the `<u-tabpanel>` to control
- **DOM interface:** `UHTMLTabElement` extends [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
  - `UHTMLTabElement.tabsElement` returns the parent `UHTMLTabsElement`
  - `UHTMLTabElement.selected` sets or gets `true` or `false`, indicating whether this tab is currently selected
  - `UHTMLTabElement.index` returns a `number` representing the position/index within the list of tabs
  - `UHTMLTabElement.panel` returns the associated `UHTMLTabPanelElement`

### `<u-tabpanel>`
- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
- **DOM interface:** `UHTMLTabPanelElement` extends [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
  - `UHTMLTabPanelElement.tabsElement` returns the parent `UHTMLTabsElement`
  - `UHTMLTabPanelElement.tabs` returns a associated `NodeListOf<UHTMLTabElement>`

## Events

No custom events beyond the [usual events supported by HTML elements](https://developer.mozilla.org/en-US/docs/Web/API/Element#events). Tabbing triggers a `click` (both with mouse and keyboard) so listen for this to check for tab change:
```js
document.addEventListener('click', ({ target }) => {
  const tab = target instanceof Element && target.closest('u-tab');

  if (tab) {
    console.log('changed to tab:', tab);
  }
})
```

## Styling

`<u-tabs>`, `<u-tablist>` and `<u-tabpanel>` renders as `display: block`, while `<u-tab>` renders as `display: inline-block`.

### Styling the tab state

`<u-tab>` automatically gets a `aria-selected="true"` or `aria-selected="false"` attribute, which can be utilized for styling:

```css
.my-tab[aria-selected="true"] {
  /* Your active tab styling here */
}
.my-tab[aria-selected="false"] {
  /* Your inactive tab styling here */
}
```

### Styling example: Scrolling tablist

<Sandbox label="u-tabs scrolling example" />
<pre hidden>
&lt;style&gt;
  .my-tablist-scrolls {
    display: flex;
    overflow: auto;
    white-space: nowrap;
  }
&lt;/style&gt;
&lt;u-tabs&gt;
  &lt;u-tablist class="my-tablist-scrolls"&gt;
    &lt;u-tab&gt;Tab 1&lt;/u-tab&gt;&lt;u-tab&gt;Tab 2&lt;/u-tab&gt;&lt;u-tab&gt;Tab 3&lt;/u-tab&gt;&lt;u-tab&gt;Tab 4&lt;/u-tab&gt;&lt;u-tab&gt;Tab 5&lt;/u-tab&gt;&lt;u-tab&gt;Tab 6&lt;/u-tab&gt;&lt;u-tab&gt;Tab 7&lt;/u-tab&gt;
  &lt;/u-tablist&gt;
  &lt;u-tabpanel&gt;Panel 1&lt;/u-tabpanel&gt;
&lt;/u-tabs&gt;
</pre>



### Styling example: Wrapping tablist

<Sandbox label="u-tabs wrapping example" />
<pre hidden>
&lt;style&gt;
  .my-tablist-wrapps {
    display: flex;
    flex-wrap: wrap;
  }
&lt;/style&gt;
&lt;u-tabs&gt;
  &lt;u-tablist class="my-tablist-wrapps"&gt;
    &lt;u-tab&gt;Tab 1&lt;/u-tab&gt;&lt;u-tab&gt;Tab 2&lt;/u-tab&gt;&lt;u-tab&gt;Tab 3&lt;/u-tab&gt;&lt;u-tab&gt;Tab 4&lt;/u-tab&gt;&lt;u-tab&gt;Tab 5&lt;/u-tab&gt;&lt;u-tab&gt;Tab 6&lt;/u-tab&gt;&lt;u-tab&gt;Tab 7&lt;/u-tab&gt;
  &lt;/u-tablist&gt;
  &lt;u-tabpanel&gt;Panel 1&lt;/u-tabpanel&gt;
&lt;/u-tabs&gt;
</pre>

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

- DOM interface: [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
- ARIA Authoring Practices: [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)