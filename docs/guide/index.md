# Getting started

You might already know u-elements :tada:

`u-elements` mainly re-implements existing HTML tags. This means [online resources](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/) and your existing knowledge about HTML is applicable to u-elements counterparts. The goal is to learn and use regular HTML, but also [ensure outstanding accessibility](/guide/why) :rocket:

[Browse elements &rarr;](/elements/)

## Install

Install the elements you want through `@u-elements/[u-element-name-here]`.
<br />Refer to the [individual elements](/elements/) for exact install name.

::: code-group

```bash [NPM]
npm add -S @u-elements/[u-element-name-here]
```

```bash [PNPM]
pnpm add -S @u-elements/[u-element-name-here]
```

```bash [Yarn]
yarn add -S @u-elements/[u-element-name-here]
```

```bash [Bun]
bun add -S @u-elements/[u-element-name-here]
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/[u-element-name-here]@latest/dist/[u-element-name-here].js"></script>
```

:::

## Import
Import the elements you want through `import '@u-elements/[u-element-name-here]'`
- **If browser:** u-elements are automatically registered through [customElements.define()](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define)
- **If server:** Write u-elements markup in HTML/TSX/JSX/Svelte/Vue just like you would with regular HTML.
[DOM registration](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define) only happens when reaching a browser
- **If loading multiple versions:** The first loaded version of a u-element will be used


```js
// your-main-app-file.js
import '@u-elements/[u-element-name-here]';
```

## Usage

Add a `u-` to the relevant HTML tags in your markup.
<br />Refer to the [individual elements](/elements/) for supported attributes and Javascript properties.

```html [u-progress]
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>u-elements example</title>
  </head>
  <body>
    <!-- Use u-elements in your HTML just like regular HTML elements -->
    <progress value="10" max="100"></progress> // [!code --]
    <u-progress value="10" max="100"></u-progress> // [!code ++]

    <script type="module" src="your-main-app-file.js" defer async></script>
 </body>
</html>
```

## Usage in a framework

Works with [every framework supporting CustomElements](https://custom-elements-everywhere.com/) (even React as we do not need any CustomEvents).
As an added bonus; All `u-elements` ships with Typescript definitions for  React, Svelte, Vue, Solid and Qwick.

:::warning Using React 18 or older?
React 18 and lower does not support [`className` on CustomElements](https://github.com/facebook/react/issues/4933),
but you can [work around this](https://react.dev/reference/react-dom/components#custom-html-elements) by using `class` instead:

```jsx
<u-datalist
  className="your-className-here" // [!code --]
  class="your-className-here" // [!code ++]
>
```
:::

## Usage in VSCode

If you want autocompletion and inline documentation for u-elements while writing HTML in VSCode, 
create folder + file `.vscode/settings.json` in your project, with the content:

```json
{
  "html.customData": [
    "./node_modules/@u-elements/[u-element-name-here]/dist/[u-element-name-here].vscode.json"
  ]
}
```

Example with `<u-datalist>` and `<u-details>`:

```json
{
  "html.customData": [
    "./node_modules/@u-elements/u-datalist/dist/u-datalist.vscode.json",
    "./node_modules/@u-elements/u-details/dist/u-details.vscode.json"
  ]
}
```