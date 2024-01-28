---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "u-elements"
  text: "Native HTML tags, just truly accessible"
  tagline: CustomElement implementations of modern HTML tags, ensuring outstanding accessibility.
  image:
      src: /logo.svg
      alt: 
  actions:
    - theme: brand
      text: Get started
      link: /markdown-examples
    - theme: alt
      text: Why u-elements?
      link: /why
    - theme: alt
      text: View on GitHub
      link: https://github.com/u-elements/u-elements

features:
  - icon: ☑️
    title: W3C standards compliant,<br />but accessible
    details: u-elements ensures native HTML tags remain truly accessible. By seamlessly integrating CustomElements, we bridge the gap for assistive technologies, making your web applications inclusive and user-friendly.
  - icon: 📋
    title: Battle-tested with<br />real screen readers
    details: u-elements has undergone rigorous testing to seamlessly replace native HTML elements with their accessible counterparts. With u-elements, you can be confident in delivering a web experience that is both robust and inclusive.
  - icon: ⚙️
    title: Super lightweight and<br />framework independent
    details: Built on CustomElements, u-elements seamlessly integrates into any project, regardless of the framework in use. Developers will appreciate the added convenience of VSCode autocomplete, inline documentation, and TypeScript definitions for popular frameworks like React, Solid, Svelte, Vue, and Qwik.
  - icon: 🪽
    title: Future-proof
    details: Invest in a solution that looks toward the future. U-elements not only meets W3C standards but also anticipates changes in assistive technology. As your codebase evolves, u-elements serves as a self-destructing enhancement, gradually becoming obsolete as assistive technologies catch up to the new HTML Elements. Plus, with easy opt-in and opt-out features, integrating or removing u-elements is a breeze. And did we mention it's lightweight, simple, and performant at just <span data-bytes="gzip"></span> (minified and compressed)?
---
<script setup>
import { data } from './filesize.data.ts'

// Let page render first
setTimeout(() =>
  document.querySelectorAll('[data-bytes]').forEach((el) => {
    el.textContent = data[el.getAttribute('data-bytes')]
  })
)
</script>

<!--
Drop in CustomElements enhancing accessibility of native HTML elements. Because assistive technology does not fully understand the new and shiny HTML tags yet. Briding the gap.
- icon: 🛠️
    title: Battletested
    details: U-elements empowers developers to effortlessly replace native HTML elements with their accessible counterparts, ensuring a truly inclusive web experience.
  - icon: 🛠️
    title: Framework independent
    details: As u-elements is buildt using Custom Elements, they can be used with any framework or even without. You can easily incorporate u-elements into your current projects without having to rewrite the existing codebases. But wait there is more; u-elements also comes with vscode autocomplete and inline documentation, as well as and typescript definitions for the frameworks React, Solid, Svelte, Vue and Qwik.
  - icon: 🛠️
    title: W3C standards compliant
    details: U-elements empowers developers to effortlessly replace native HTML elements with their accessible counterparts, ensuring a truly inclusive web experience. W3C standards compatible and truly accessible. Also exports compliant HTMLElement Javascript DOM interfaces.
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