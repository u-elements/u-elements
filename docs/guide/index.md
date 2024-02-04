# Getting started

## You might already know how to use u-elements 🎉

u-elements follow the same rules as existing HTML tags, meaning [online resources](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/) and your existing knowledge about the tags
[details](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details),
[summary](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary),
[datalist](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist),
[option](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) and 
[progress](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) is applicable to their u-elements counterparts. The goal is to learn and use regular HTML, but also outstanding accessibility as a bonus! 🌟 

The only thing that's different is that you need to load the u-elements javascript:

<!-- `u-elements` comply with W3C spesifications of existing HTML tags. This means that your existing knowledge and the abundance of online resources about the HTML tags
[details](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details),
[summary](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary),
[datalist](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist),
[option](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) and 
[progress](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress) is applicable to their `u-elements` counterparts.
<br />The only difference, is that you need to load the u-elements javascript: -->


## Install
Install u-elements from NPM:

::: code-group

```bash [NPM]
$ npm add -D @u-elements/u-elements
```

```bash [PNPM]
$ pnpm add -D @u-elements/u-elements
```

```bash [Yarn]
$ yarn add -D @u-elements/u-elements
```

```bash [Bun]
$ bun add -D @u-elements/u-elements
```

:::

## CDN

https://unpkg.com/@u-elements/u-elements@latest/dist/index.js

## Import
Import `@u-elements/u-elements` to automatically initialize u-elements:

```js
// your-main-app-file.js
import '@u-elements/u-elements';
```

::: tip 💡 What happens when I `import` u-elements?

- **If browser:** u-elements are automatically registered through [customElements.define()](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define).
- **If server:** [DOM registration](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define) is skipped, but you can write u-elements markup in HTML and frameworks just like you would with regular HTML tags.
- **If loading multiple versions:** The first loaded version of u-elements will be used.

:::

## Usage

Refer to the [elements reference](/reference/) for more guidance on using each component.

## Usage in HTML

Add a `u-` to the relevant HTML tags in your markup. Example:

```html [u-progress]
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>u-elements example</title>
  </head>
  <body>
    <!-- Use u-elements in your HTML like regular built-in elements -->
    <progress value="10" max="100"></progress> // [!code --]
    <u-progress value="10" max="100"></u-progress> // [!code ++]

    <script type="module" src="your-main-app-file.js" defer async></script>
 </body>
</html>
```


## Usage in Javascript

When 

## Usage with a framework

React, Svelte, Vue, Solid or Qwick

