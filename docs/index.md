---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "u-elements"
  text: "Native HTML tags, just truly accessible"
  tagline: Drop in CustomElements enhancing accessibility of native HTML elements. Because assistive technology does not fully understand the new and shiny HTML tags yet. Briding the gap.
  actions:
    - theme: brand
      text: Get started
      link: /markdown-examples
    - theme: alt
      text: Why u-elements?
      link: /api-examples
    - theme: alt
      text: View on GitHub
      link: https://github.com/u-elements/u-tags

features:
  - icon: 🛠️
    title: Battletested
    details: U-elements empowers developers to effortlessly replace native HTML elements with their accessible counterparts, ensuring a truly inclusive web experience.
  - icon: 🛠️
    title: Framework independent
    details: Even with strong typing.
  - icon: 🛠️
    title: W3C standards compliant
    details: U-elements empowers developers to effortlessly replace native HTML elements with their accessible counterparts, ensuring a truly inclusive web experience.
  - icon: 🛠️
    title: Future-proof
    details: W3C standards compatible and truly accessible.
  - icon: 🛠️
    title: Easy opt in and opt out
    details: By prioritizing W3C standards compatibility, our project not only facilitates smooth integration but also guarantees a reliable and future-proof solution.
  - icon: 🛠️
    title: Easy opt out
    details: W3C standards compatible and truly accessible.
  - icon: 🛠️
    title: Lightweight, simple, performant
    details: Only <span data-bytes="gzip"></span> (minified and compressed)
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