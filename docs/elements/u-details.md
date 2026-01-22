---
title: u-details
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# <del>&lt;u-details&gt;</del> <mark data-badge="POLYFILL"></mark>
There is no longer need for `<u-details>` :tada:<br />
Please use native [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) as it has sufficient support
in major browsers and screen readers, but import `@u-details/polyfill` to support [Android Firefox users with Talkback screen reader](https://bugzilla.mozilla.org/show_bug.cgi?id=1834198).

`<details>` lets you open and close content when clicking on a child `<summary>`.
You can use it to make things like accordions, expandables, FAQs, dropdowns, etc.

**Quick intro:**
- Use `<summary>` as a direct child - this is the label
- Use any other content in `<details>` - this will hide/show
- Use the `open` attribute on `<details>` to change state
- **MDN Web Docs:** [&lt;details&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) ([HTMLDetailsElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)) /
[&lt;summary&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary) ([HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement))

## Example
<Sandbox label="details code example" />
<pre hidden>
&lt;details&gt;
  &lt;summary&gt;Details&lt;/summary&gt;
  Something small enough to escape casual notice.
&lt;/details&gt;
</pre>

## Install polyfill <mark :data-badge="data['polyfill']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/polyfill
```

```bash [PNPM]
pnpm add -S @u-elements/polyfill
```

```bash [Yarn]
yarn add @u-elements/polyfill
```

```bash [Bun]
bun add -S @u-elements/polyfill
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-details@latest/dist/polyfill.js"></script>
```
:::

## Attributes and props

### `<details>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `open` shows content if attribute is present. By default this attribute is absent which means the content is hidden. **Note:** Setting `open="false"` will not work as intended, as `open` is a boolean attribute you should provide or remove entirely.
  - `name` enables multiple `<details>` elements to be connected, with only one open at a time.
- **DOM interface:** [`HTMLDetailsElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
  - `HTMLDetailsElement.open` returns `true` of `false` reflecting the state
  - `HTMLDetailsElement.name` returns the corresponding `name` attribute

### `<summary>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
- **DOM interface:** [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)

## Events

In addition to the [usual events supported by HTML elements](https://developer.mozilla.org/en-US/docs/Web/API/Element#events), the `<details>` element dispatches a [`toggle` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement/toggle_event) _after_ the open state is changed:

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

The `<summary>` element is styled with `display: list-item`, but you can hide the triangle with `list-style:none`.

`<details>` hides its *content* - the `::details-content` pseudo element.
If your [browser supports `interpolate-size`](https://caniuse.com/mdn-css_properties_interpolate-size), you can animate open/close with pure css:

<Sandbox label="details styling example" />
<pre hidden>
&lt;details class="animate"&gt;
  &lt;summary&gt;Details animating if supported&lt;/summary&gt;
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent interdum diam quis eros sollicitudin, et scelerisque arcu malesuada. Nunc pellentesque eleifend nulla a convallis.
&lt;/details&gt;
&lt;style&gt;
  .animate{
    @media (prefers-reduced-motion: no-preference) {
      interpolate-size: allow-keywords;
    }

    &amp;::details-content {
      block-size: 0;
      overflow-y: clip; 
      transition: content-visibility 500ms allow-discrete,
                  height 500ms;
    }
    
    &amp;[open]::details-content {
      height: auto;
    }
  }
&lt;/style&gt;
</pre>

## Find-in-page
Even when a `<details>` element is closed, all of its content remains discoverable through the find-in-page search feature (e.g., Ctrl or Command + F keys). This behavior is [supported by various browsers](https://caniuse.com/mdn-html_global_attributes_hidden_until-found_value). If a user conducts a search for content within a details element, it will automatically open and trigger the `toggle` event.

## Accessibility (tested 21.01.26)

| Screen reader | `<details>` | `@u-details/polyfill` |
| --- | --- | --- |
| VoiceOver (Mac) + Chrome | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Firefox | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Safari | :white_check_mark: | :white_check_mark: |
| VoiceOver (iOS) + Chrome | :white_check_mark: | :white_check_mark: |
| VoiceOver (iOS) + Safari | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Edge | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Chrome | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :white_check_mark: | | :white_check_mark: |
| TalkBack (Android) + Firefox | :x: Does not announce role or state | :white_check_mark: |

## Specifications

- DOM interface: [HTMLDetailsElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
- HTML Standard: [The &lt;details&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
- HTML Standard: [The &lt;summary&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element)

## Changelog

- **0.2.1:** Ensures single polyfill instance in hot-reloaded environments
- **0.2.0:** Deprecateds `<u-details>` and adds `@u-details/polyfill`
- **0.1.5:** Add `tabindex="-1"` to content when closed to preved Firefox from making it a tabstop
- **0.1.4:** Remove `aria-labelledby="summary-id"` to reduce information duplication
- **0.1.3:** Enable declarative shadow root support and export `UHTMLDetailsShadowRoot` for easier server side rendering
- **0.1.2:** Add `role="group"` to align with semantics