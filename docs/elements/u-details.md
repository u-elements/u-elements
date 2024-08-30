---
title: u-details
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-details&gt; <mark data-badge="HTML"></mark>
`<u-details>` lets you open and close content when clicking on a child `<u-summary>`.
You can use it to make things like accordions, expandables, FAQs, dropdowns, etc.

**Quick intro:**
- Use `<u-summary>` as a direct child - this is the label
- Use any other content in `<u-details>` - this will hide/show
- Use the `open` attribute on `<u-details>` to change state
- **MDN Web Docs:** [&lt;details&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) ([HTMLDetailsElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)) /
[&lt;summary&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary) ([HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement))

## Example
<Sandbox>
&lt;u-details&gt;
  &lt;u-summary&gt;Details&lt;/u-summary&gt;
  Something small enough to escape casual notice.
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

## Attributes and props

### `<u-details>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `open` shows content if attribute is present. By default this attribute is absent which means the content is hidden. **Note:** Setting `open="false"` will not work as intended, as `open` is a boolean attribute you should provide or remove entirely.
- **DOM interface:** [`HTMLDetailsElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
  - `HTMLDetailsElement.open` returns `true` of `false` reflecting the state

### `<u-summary>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
- **DOM interface:** [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)

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

`<summary>`/`<u-summary>` is rendered with `display: list-item` to display the open/close triangle, which is also announced by screen readers. If you wish to remove the triangle and its announcement, you can use `list-style: none`.

`<details>`/`<u-details>` hides its *content*, implying that only the `open` attribute (not CSS) can alter its open state. Animating the open/close action consequently requires some workarounds: [example 1](https://linkedlist.ch/animate_details_element_60/) and [example 2](https://css-tricks.com/how-to-animate-the-details-element/).

## Find-in-page
Even when a `<details>`/`<u-details>` element is closed, all of its content remains discoverable through the find-in-page search feature (e.g., Ctrl or Command + F keys). This behavior is [supported by various browsers](https://caniuse.com/mdn-html_global_attributes_hidden_until-found_value). If a user conducts a search for content within a details element, it will automatically open and trigger the `toggle` event.

## Accessibility

| Screen reader | `<details>` | `<u-details>` |
| --- | --- | --- |
| VoiceOver (Mac) + Chrome | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Firefox | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Safari | :x: Does not announce state + looses screen reader focus | :white_check_mark: |
| VoiceOver (iOS) + Chrome | :white_check_mark: | :white_check_mark: |
| VoiceOver (iOS) + Safari | :x: Does not announce role or state on focus | :white_check_mark: |
| Jaws (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Edge | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Chrome | :x: Does not announce state | :white_check_mark: |
| Narrator (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Chrome | :x: Does not announce role | :white_check_mark: |
| TalkBack (Android) + Firefox | :x: Does not announce role or state on focus | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :x: Does not announce role | :white_check_mark: |

## Specifications

- DOM interface: [HTMLDetailsElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
- HTML Standard: [The &lt;details&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
- HTML Standard: [The &lt;summary&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element)