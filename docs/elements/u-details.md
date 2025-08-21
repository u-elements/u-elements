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
<Sandbox label="u-details code example" />
<pre hidden>
&lt;u-details&gt;
  &lt;u-summary&gt;Details&lt;/u-summary&gt;
  Something small enough to escape casual notice.
&lt;/u-details&gt;
</pre>

## Install <mark :data-badge="data['u-details']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-details
```

```bash [PNPM]
pnpm add -S @u-elements/u-details
```

```bash [Yarn]
yarn add @u-elements/u-details
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
  - `name` enables multiple `<u-details>` elements to be connected, with only one open at a time.
- **DOM interface:** [`HTMLDetailsElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
  - `HTMLDetailsElement.open` returns `true` of `false` reflecting the state
  - `HTMLDetailsElement.name` returns the corresponding `name` attribute

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

## Styling and animating

The `<summary>` element is normally styled with `display: list-item`, but `<u-summary>` uses `display: block`. This change prevents screen readers from announcing the open/close triangle and resolves the double-announcement bug in iOS Safari VoiceOver. To change the triangle and its announcement, you can apply the `u-summary::before { display: none }` to hide or `u-summary::before { all: unset; ...your-styling-here }` to restyle.

`<details>`/`<u-details>` hides its *content* - the `::details-content` pseudo element. Since custom pseudo selector are not
possible to replicate in custom elements, `u-details` instead provide `::part(details-content)`.
If your [browser supports `interpolate-size`](https://caniuse.com/mdn-css_properties_interpolate-size), you can animate open/close with pure css:

<Sandbox label="u-details styling example" />
<pre hidden>
&lt;u-details class="animate"&gt;
  &lt;u-summary&gt;Details animating if supported&lt;/u-summary&gt;
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent interdum diam quis eros sollicitudin, et scelerisque arcu malesuada. Nunc pellentesque eleifend nulla a convallis.
&lt;/u-details&gt;
&lt;style&gt;
  .animate{
    @media (prefers-reduced-motion: no-preference) {
      interpolate-size: allow-keywords;
    }

    &amp;::part(details-content) {
      block-size: 0;
      overflow-y: clip; 
      transition: content-visibility 500ms allow-discrete,
                  height 500ms;
    }
    
    &amp;[open]::part(details-content) {
      height: auto;
    }
  }
&lt;/style&gt;
</pre>

## Find-in-page
Even when a `<details>`/`<u-details>` element is closed, all of its content remains discoverable through the find-in-page search feature (e.g., Ctrl or Command + F keys). This behavior is [supported by various browsers](https://caniuse.com/mdn-html_global_attributes_hidden_until-found_value). If a user conducts a search for content within a details element, it will automatically open and trigger the `toggle` event.

## Server side rendering
You can server side render `<u-details>` by using [Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom).
Styling and markup needed is exported as `UHTMLDetailsShadowRoot`. Example:

 ```TS
import { UHTMLDetailsShadowRoot } from '@u-elements/u-details';

const renderToStaticMarkup = (title: string, content: string) =>
  `<u-details>
    ${UHTMLDetailsShadowRoot}
    <u-summary slot="summary">${title}</u-summary>
    ${content}
  </u-details>`
```

## Accessibility (tested 16.09.24)

| Screen reader | `<details>` | `<u-details>` |
| --- | --- | --- |
| VoiceOver (Mac) + Chrome | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Firefox | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Safari | :x: Does not announce state + looses screen reader focus | :white_check_mark: |
| VoiceOver (iOS) + Chrome | :white_check_mark: | :white_check_mark: |
| VoiceOver (iOS) + Safari | :white_check_mark: | :white_check_mark: |
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

## Changelog

- **0.1.3:** Enable declarative shadow root support and export `UHTMLDetailsShadowRoot` for easier server side rendering
- **0.1.2:** Add `role="group"` to align with semantics