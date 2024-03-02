<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-datalist&gt; <mark data-badge="html5"></mark>
Documentation coming

**Quick intro:**
- **MDN Web Docs:** [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist)

## Example
<Sandbox>
&lt;style&gt;
  u-option[aria-selected=&quot;true&quot;] { text-decoration: underline }
&lt;/style&gt;
&lt;label&gt;
  Choose flavour of ice cream
  &lt;br /&gt;
  &lt;input type=&quot;text&quot; list=&quot;my-list&quot; /&gt;
&lt;/label&gt;
&lt;u-datalist id=&quot;my-list&quot;&gt;
  &lt;u-option&gt;Coconut&lt;/u-option&gt;
  &lt;u-option&gt;Strawberries&lt;/u-option&gt;
  &lt;u-option&gt;Chocolate&lt;/u-option&gt;
  &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;u-option&gt;Licorice&lt;/u-option&gt;
  &lt;u-option&gt;Pistachios&lt;/u-option&gt;
  &lt;u-option&gt;Mango&lt;/u-option&gt;
  &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
&lt;/u-datalist&gt;
</Sandbox>

## Install <mark :data-badge="data['u-datalist']"></mark>

::: code-group

```bash [NPM]
npm add -D @u-elements/u-datalist
```

```bash [PNPM]
pnpm add -D @u-elements/u-datalist
```

```bash [Yarn]
yarn add -D @u-elements/u-datalist
```

```bash [Bun]
bun add -D @u-elements/u-datalist
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-datalist@latest/dist/index.js"></script>
```