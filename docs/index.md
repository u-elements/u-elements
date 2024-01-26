---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "u-elements"
  text: "Native HTML tags, just truly accessible"
  tagline: Use new HTML tags today, while also delivering superb accessibility through CustomElements.
  image:
      src: data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 122.9 122.9'%3E%3Cpath fill='%23213578' d='M61.4 0A61.5 61.5 0 1 1 18 18 61.2 61.2 0 0 1 61.4 0ZM61 74.2l-8.9 24.7a5 5 0 0 1-2.6 2.8 5 5 0 0 1-6.8-6.2l6.2-17.3a26.3 26.3 0 0 0 1.2-4 40.6 40.6 0 0 0 .6-4.2l.5-7.9.3-7.3c0-2.6-.6-2.8-2.7-3.3h-.5l-18-3.4a5 5 0 0 1-3.2-2.1 5 5 0 0 1 5-7.7l19.4 3.6 2.3.2a57.6 57.6 0 0 0 7.2.6 81.1 81.1 0 0 0 8.9-.7l2.6-.3 18.3-3.4a5 5 0 0 1 3.7.7 5 5 0 0 1 1.3 7 5 5 0 0 1-3.2 2l-17.4 3.4-1.6.3c-1.8.3-2.7.4-2.6 3 0 2 .3 4.2.6 6.5a171.2 171.2 0 0 0 2.3 13l1.4 4.4 6 16.9a5 5 0 0 1-6.7 6.2A5 5 0 0 1 72 99l-9-24.7-1-1.8-1 1.8Zm.4-53.5a8.8 8.8 0 1 1-6.2 2.6 8.8 8.8 0 0 1 6.2-2.6ZM97.8 25a51.4 51.4 0 1 0 15 36.3 51.3 51.3 0 0 0-15-36.3Z'/%3E%3C/svg%3E
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