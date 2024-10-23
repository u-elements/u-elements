---
title: u-progress
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-progress&gt; <mark data-badge="HTML"></mark>
`<u-progress>` lets you indicatate the amount of completed work, typically displayed as a progress bar.

**Quick intro:**
- Use the `max` attribute to change the amount of total work to be done
- Use the `value` attribute to change the amount of completed work
- Remove the `value` attribute to change to indeterminate/unknown amount of work
- **MDN Web Docs:** [&lt;progress&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) ([HTMLProgressElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLProgressElement))

## Example
<Sandbox label="u-progress code example" />
<pre hidden>
&lt;u-progress aria-label="Loading" value="7.5" max="10"&gt;&lt;/u-progress&gt;
&lt;u-progress aria-label="Loading"&gt;&lt;/u-progress&gt;
</pre>

## Install <mark :data-badge="data['u-progress']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-progress
```

```bash [PNPM]
pnpm add -S @u-elements/u-progress
```

```bash [Yarn]
yarn add -S @u-elements/u-progress
```

```bash [Bun]
bun add -S @u-elements/u-progress
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-progress@latest/dist/u-progress.js"></script>
```
:::

## Attributes and props

### `<u-progress>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `max` can contain amount of total work to be done. Must be a valid number greater than 0. Defaults to 1.
  - `value` can contain amount of completed work. If present, `value` must be a valid number between 0 and `max`. If there is no `value` attribute, the progress bar is indeterminate; indicating work is being done, but withouth knowing of how long it will take.
- **DOM interface:** [`HTMLProgressElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLProgressElement)
  - `HTMLProgressElement.max` returns `number` reflecting `max` attribute
  - `HTMLProgressElement.position` returns `number` between 0 and 1 reflecting the calculation `value / max`
  - `HTMLProgressElement.value` returns `number` reflecting `value` value attribute
  - `HTMLProgressElement.labels` returns `NodeListOf<HTMLLabelElement>`

## Styling

### Styling the value bar
Currently, there are no standardized pseudo-element selectors specifically designated for `<progress>` elements (all existing selectors include a `::-vendor-` prefix). Consequently, `<u-progress>` simply renders its value bar using a `::before` pseudo-element:

<Sandbox label="u-progress styled example" />
<pre hidden>
&lt;u-progress aria-label="Loading" class="my-progress" value="6" max="10"&gt;&lt;/u-progress&gt;
&lt;style&gt;
  /* Styling just for example: */
  .my-progress {
    border-radius: 9em;
    border: 1px solid gray;
    background: gainsboro;
  }
  .my-progress::before {
    background: tomato;
  }
&lt;/style&gt;
</pre>

### Styling the indeterminate state
Replicating the native CSS pseudo-class [`:indeterminate`](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate) is not possible. Instead, use the selector `:not([value])`, which is functionally identical, and compatible with both `<u-progress>` and native `<progress>`. Example:
```css
.my-progress:not([value]) {
  /* Your indeterminate styling here */
}
```

## Labeling

In most cases you should provide an accessible label when using `<u-progress>`. While you can use the standard ARIA labelling attributes `aria-labelledby` or `aria-label`, when using `<u-progress>` you can alternatively use the `<label>` element.

<!--## Describing a loading region
If the `<u-progress>` element is describing the loading progress of a region on your page, use `aria-describedby="my-progress-id"` to point to the `<u-progress id="my-progress-id">`, and set `aria-busy="true"` on the region that is loading. Removing the `aria-busy` attribute when it has finished loading.-->

## Accessibility

| Screen reader | `<progress>` | `<u-progress>` |
| --- | --- | --- |
| VoiceOver (Mac) + Chrome | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Firefox | :x: Does not announce value, unless nested in `<label>` | :white_check_mark: |
| VoiceOver (Mac) + Safari | :white_check_mark: | :white_check_mark: |
| VoiceOver (iOS) + Chrome | :x: Does not announce value | :white_check_mark: |
| VoiceOver (iOS) + Safari | :x: Announces value, but not related max | :white_check_mark: |
| Jaws (PC) + Chrome | :x: Announces value, but not related max | :white_check_mark: |
| Jaws (PC) + Edge | :x: Announces value, but not related max | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Chrome | :x: Announces value, but not related max | :white_check_mark: |
| NVDA (PC) + Edge | :x: Announces value, but not related max | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Chrome | :x: Announces value, but not related max | :white_check_mark: |
| TalkBack (Android) + Firefox | :x: Announces value, but not related max | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :x: Announces value, but not related max | :white_check_mark: |

## Specifications

- DOM interface: [HTMLProgressElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLProgressElement)
- HTML Standard: [The &lt;progress&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-progress-element)