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
&lt;u-progress value=&quot;7.5&quot; max=&quot;10&quot;&gt;&lt;/u-progress&gt;
&lt;u-progress&gt;&lt;/u-progress&gt;
</Sandbox>

## Install <mark :data-badge="data['u-progress']"></mark>

::: code-group

```bash [NPM]
npm add -D @u-elements/u-progress
```

```bash [PNPM]
pnpm add -D @u-elements/u-progress
```

```bash [Yarn]
yarn add -D @u-elements/u-progress
```

```bash [Bun]
bun add -D @u-elements/u-progress
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-progress@latest/dist/index.js"></script>
```
:::

## Attributes

| Attributes `<u-progress>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||
| `max` | Amount of total work to be done. Must be a valid number greater than `0` | `1` |
| `value` | Amount of completed work. If present, `value` must be a valid number between `0` and `max`. If there is no `value` attribute, the progress bar is indeterminate; indicating work is being done, but withouth knowing of how long it will take. | Not present |

## Styling

Coming

## Specifications

- DOM interface: [HTMLProgressElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLProgressElement)
- HTML Standard: [The &lt;progress&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-progress-element)