---
layout: home

hero:
  name: "u-elements"
  text: "HTML tags, just truly accessible"
  tagline: CustomElement implementations of modern HTML tags, ensuring outstanding accessibility.
  image:
      src: /logo.svg
      alt: 
  actions:
    - theme: brand
      text: Get started
      link: /guide/
    - theme: alt
      text: Why u-elements?
      link: /guide/why
    - theme: alt
      text: View on GitHub
      link: https://github.com/u-elements/u-elements

features:
  - icon: ☑️
    title: W3C standards compliant, accessible for everyone
    details: Some HTML tags/ARIA patterns are not yet supported by screen readers. u&#8209;elements bridges that gap, while still allowing you to use MDN et al. as documentation.
  - icon: 📋
    title: Battle-tested with real screen readers
    details: No compatibility assumptions; all u&#8209;elements have been manually tested across all major screen readers, browsers and devices.
  - icon: 🪽
    title: Lightweight, headless and framework independent
    details: Zero dependencies. CSS styling. Compatible with any javascript framework, without a framework, or even in markdown or server side strings - just like HTML.
  - icon: ⚙️
    title: Future proof and easy opt out
    details: Think of u-elements as a HTML web standards compliant polyfill. As assistive technologies catch up, simply remove a "u-", and you're back on native HTML.
---
<script setup>
import { data } from './filesize.data.ts'

// Let page render first
if (typeof document !== 'undefined') setTimeout(() =>
  document.querySelectorAll('[data-bytes]').forEach((el) => {
    el.textContent = data[el.getAttribute('data-bytes')]
  })
)
</script>

<!--Polyfill-->
<!-- Drop in replacements for modern HTML tags that . By seamlessly integrating CustomElements, we Bridging the gap between assistive technologies, making your web applications inclusive and user-friendly. -->
<!-- ,  testing to seamlessly replace HTML elements with their accessible counterparts. With u-elements, you can be confident in delivering a web experience that is both robust and inclusive. -->
<!-- in into any project, regardless of the framework in use. Developers will appreciate the added convenience of VSCode autocomplete, inline documentation, and TypeScript definitions for popular frameworks like React, Solid, Svelte, Vue, and Qwik. So you can use them with a framework, without one, or even directly in a markdown file. These components will work regardless of your project's architecture. regardless of your project's architecture -->
<!--
Drop in CustomElements enhancing accessibility of HTML elements. Because assistive technology does not fully understand the new and shiny HTML tags yet. Briding the gap.
- icon: 🛠️
    title: Battletested
    details: U-elements empowers developers to effortlessly replace HTML elements with their accessible counterparts, ensuring a truly inclusive web experience.
  - icon: 🛠️
    title: Framework independent
    details: As u-elements is buildt using Custom Elements, they can be used with any framework or even without. You can easily incorporate u-elements into your current projects without having to rewrite the existing codebases. But wait there is more; u-elements also comes with vscode autocomplete and inline documentation, as well as and typescript definitions for the frameworks React, Solid, Svelte, Vue and Qwik.
  - icon: 🛠️
    title: W3C standards compliant
    details: U-elements empowers developers to effortlessly replace HTML elements with their accessible counterparts, ensuring a truly inclusive web experience. W3C standards compatible and truly accessible. Also exports compliant HTMLElement Javascript DOM interfaces.
  - icon: 🛠️
    title: Future-proof
    details: u-elements is a self destructing, in the sense that it will gradually not be needed, along with assistive technology increasing support for the new HTML Elements.
  - icon: 🛠️
    title: Easy opt in and opt out
    details: By prioritizing W3C standards compatibility, our project not only facilitates smooth integration but also guarantees a reliable and future-proof solution. Want to start using u-elements? Just add a "u-" to your element names. Want to stop using u-elements? Find and replace "u-" with "" and you're done!
  - icon: 🛠️
    title: Lightweight, simple, performant
    details: Only <span data-bytes="gzip"></span> (minified and compressed)
-->