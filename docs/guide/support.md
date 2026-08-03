---
title: Browser support
---
<script setup>
import { data } from '../features.data.ts'

const percent = (num) => `${Number(num).toFixed(2)}%`
const browsers = Object.entries(data.features?.[0].requiredBrowsers || {}).map(([name, data]) => [
  name.replace(/_/g, ' ')
    .replace(/\b./g, (m) => m.toUpperCase())
    .replace('Samsunginternet', 'Samsung Internett')
    .replace('Safari Ios', 'iOS browsers')
    .trim(),
  data
]);

const withReleaseDate = browsers.filter(([, data]) => !!data.releaseDate);
const withLessThan100 = data.features.filter(({globalSupportScore}) => globalSupportScore < 100);
/* percent(data.features[0]?.world.total)
new Intl.ListFormat('en', {style: 'long',type: 'conjunction',}).format(Object.names(data.browsers))
<table>
  <thead><tr><th>Browser version</th><th>Release date</th></tr></thead>
  <tbody>
    <tr v-for="({version, date}, name) in data.browsers"><td>{{name}} {{version}}+</td><td>{{date}}</td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th>Feature</th><th>Browser support</th></tr></thead>
  <tbody>
    <template v-for="{name, norway, world} in data.features">
      <tr>
        <td>{{name}}</td>
        <td>{{percent(world.total)}}</td>
      </tr>
    </template>
  </tbody>
</table>*/
</script>

# Browser support

`u-elements` is committed to provide great support for all users and technologies, including older browser versions. 

Based on up-to-date statistics from [caniuse.com](https://caniuse.com/), `u-elements` currently support <strong>{{percent(data.features?.[0].globalSupportScore || 100)}}</strong> of all users on
{{new Intl.ListFormat('en', {style: 'long',type: 'conjunction',}).format(browsers.map(([name]) => name))}}.

## Minimum requirements

<table>
  <thead><tr><th>Browser version</th><th>Release date</th></tr></thead>
  <tbody>
    <tr v-for="([name, {version, releaseDate}]) in withReleaseDate"><td>{{name}} {{version}}+</td><td>{{releaseDate.split('-').reverse().join('.')}}</td></tr>
  </tbody>
</table>

## Web features in use

<table>
  <thead><tr><th>Feature</th><th>Browser support</th></tr></thead>
  <tbody>
    <template v-for="{feature, globalSupportScore} in withLessThan100">
      <tr>
        <td>{{feature}}</td>
        <td>{{percent(globalSupportScore)}}</td>
      </tr>
    </template>
  </tbody>
</table>

`u-elements` tracks browser support by monitoring the web features it uses. This is done by analyzing source code with [JSHint](https://github.com/jshint/jshint/) and cross-referencing the identified features against [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data) and [caniuse.com usage statistics](https://caniuse.com/). 
Here are the web features used by `u-elements` that are not yet fully supported by all browsers:


## Content Security Policy (CSP)

`u-elements` uses [constructable stylesheets](https://web.dev/articles/constructable-stylesheets) to inject styles. If the browser does not support constructable stylesheets (iOS 16.3 and older), `u-elements` will fall back to instead inject an inline `<style>` element. Be aware that if you enforce a strict Content Security Policy that blocks the `style-src-elem` directive, these inline `<style>` elements will be blocked as well and thus cause styling issues for users on iOS 16.3 and older.