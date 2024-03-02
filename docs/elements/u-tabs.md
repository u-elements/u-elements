<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-tabs&gt; <mark data-badge="wcag"></mark>
Documentation coming

**Quick intro:**
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