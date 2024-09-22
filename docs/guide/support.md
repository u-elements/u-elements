---
title: Browser support
---
<script setup>
import { data } from '../support.data.ts'

const percent = (num) => `${Number(num).toFixed(2)}%`
</script>

# Browser support

`u-elements` is committed to provide great support for all users and technologies, including older browser versions. 

Based on up-to-date statistics from [caniuse.com](https://caniuse.com/), `u-elements` currently support <strong>{{percent(data.features[0].world.total)}}</strong> of all users on {{new Intl.ListFormat('en', {style: 'long',type: 'conjunction',}).format(Object.keys(data.browsers))}}.

## Minimum requirements

<table>
  <thead><tr><th>Browser version</th><th>Release date</th></tr></thead>
  <tbody>
    <tr v-for="({version, date}, name) in data.browsers"><td>{{name}} {{version}}+</td><td>{{date}}</td></tr>
  </tbody>
</table>

## Web features in use

`u-elements` tracks browser support by monitoring the web features it uses. This is done by analyzing source code with [JSHint](https://github.com/jshint/jshint/) and cross-referencing the identified features against [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data) and [caniuse.com usage statistics](https://caniuse.com/). 
Here are the web features used by `u-elements` that are not yet fully supported by all browsers:

<table>
  <thead><tr><th>Feature</th><th>Browser support</th></tr></thead>
  <tbody>
    <template v-for="{name, norway, world} in data.features">
      <tr>
        <td>{{name}}</td>
        <td>{{percent(world.total)}}</td>
      </tr>
      <!-- <tr>
        <td colspan="2">
          <table>
            <thead><tr><th>Browser version</th><th>Release date</th></tr></thead>
            <tbody>
              <tr v-for="({ percentage, version, date }, name) in world.agents">
                <td>{{name}} {{version}}+</td><td>Released {{date}}</td>
              </tr>
              <tr><td>Norway</td><td>{{percent(norway.total)}}</td></tr>
            </tbody>
          </table>
        </td>
      </tr> -->
    </template>
  </tbody>
</table>

