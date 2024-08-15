---
title: u-tags
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-tags&gt; <mark data-badge="pending"></mark>
Coming soon

## Example

<Sandbox>
&lt;style&gt;
  u-tags { border: 1px solid; display: flex; flex-wrap: wrap; align-items: center; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
&lt;label for="my-tags"&gt;
  Choose flavour of ice cream
&lt;/label&gt;
&lt;u-tags id="my-tags"&gt;
  &lt;data&gt;Coconut&lt;/data&gt;
  &lt;data&gt;Banana&lt;/data&gt;
  &lt;data&gt;Pineapple&lt;/data&gt;
  &lt;data&gt;Orange&lt;/data&gt;
  &lt;input list="my-list" /&gt;
  &lt;u-datalist id="my-list"&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
    &lt;u-option&gt;Licorice&lt;/u-option&gt;
    &lt;u-option&gt;Pistachios&lt;/u-option&gt;
    &lt;u-option&gt;Mango&lt;/u-option&gt;
    &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-tags&gt;
</Sandbox>
