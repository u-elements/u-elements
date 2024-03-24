<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-progress&gt; <mark data-badge="html"></mark>
`<u-progress>` lets you indicatate the amount of completed work, typically displayed as a progress bar.

**Quick intro:**
- Use the `max` attribute to change the amount of total work to be done
- Use the `value` attribute to change the amount of completed work
- Remove the `value` attribute to change to indeterminate/unknown amount of work
- **MDN Web Docs:** [&lt;progress&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)

## Example
<Sandbox>
&lt;u-progress value="7.5" max="10"&gt;&lt;/u-progress&gt;
&lt;u-progress&gt;&lt;/u-progress&gt;
</Sandbox>

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

## Attributes

| Attributes `<u-progress>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||
| `max` | Amount of total work to be done. Must be a valid number greater than `0` | `1` |
| `value` | Amount of completed work. If present, `value` must be a valid number between `0` and `max`. If there is no `value` attribute, the progress bar is indeterminate; indicating work is being done, but withouth knowing of how long it will take. | Not present |

## Styling

### Styling the value bar
Currently, there are no standardized pseudo-element selectors specifically designated for `<progress>` elements (all existing selectors include a `::-vendor-` prefix). Consequently, `<u-progress>` simply renders its value bar using a `::before` pseudo-element:

<Sandbox>
&lt;style&gt;
  .my-progress {
    border-radius: 9em;
    border: 1px solid gray;
    background: gainsboro;
  }
  .my-progress::before {
    background: tomato;
  }
&lt;/style&gt;
&lt;u-progress class="my-progress" value="6" max="10"&gt;&lt;/u-progress&gt;
</Sandbox>

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
| VoiceOver (Mac) + Firefox | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Safari | :white_check_mark: | :white_check_mark: |
| VoiceOver (iOS) + Safari | :x: Does not announce state | :white_check_mark: |
| Jaws (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Chrome | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Firefox | :white_check_mark: | :white_check_mark: |

## Specifications

- DOM interface: [HTMLProgressElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLProgressElement)
- HTML Standard: [The &lt;progress&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-progress-element)