<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-progress&gt; <mark data-badge="html5"></mark>
Documentation coming

**Quick intro:**
- Use the `max` attribute to change the amount of total work to be done
- Use the `value` attribute to change the amount of completed work
- **MDN Web Docs:** [&lt;progress&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress)

## Example
<Sandbox>
&lt;u-progress value=&quot;5&quot; max=&quot;10&quot;&gt;&lt;/u-progress&gt;
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