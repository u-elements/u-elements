<script setup>
  import { ref, watch } from 'vue'
  import { Codemirror } from 'vue-codemirror'
  import { html } from '@codemirror/lang-html'

  // Import all uElements
  const modules = Object.values(import.meta.glob('../../../packages/*/u-!(*.spec).ts'))
  const loading = Promise.all(modules.map((module) => module()))
  const htmlConfig = ref(html());
  
  // Auto generate htmlConfig for codeMirror
  loading.then((klasses) => {
    const extraTags = Object.fromEntries(
      klasses
        .flatMap((module) => Object.entries(module))
        .map(([type, { observedAttributes: attr = [] }]) => [
          type.replace(/UHTML(\S+)Element/g, 'u-$1').toLowerCase(),
          { globalAttrs: true, attrs: Object.fromEntries(attr.map((v) => [v, null])) }
        ])
      )
    htmlConfig.value = html({ extraTags });
  })

  let timer = null
  const code = ref('')
  const view = ref(null)
  const slots = ref(null)
  const style = { height: '100%', outline: 'none!important', fontSize: '.875em' }
  const updateView = () => (view.value.innerHTML = code.value);

  watch(slots, () => updateView(code.value = slots.value.textContent.trim()))
  watch(code, () => clearTimeout(timer) || (timer = setTimeout(updateView, 300)))
</script>
<style>
  .demo { border-radius: 8px; border: 2px dashed var(--vp-c-divider); display: flex; margin-block: .5em; overflow: hidden }
  .demo > div { box-sizing: border-box; display: block!important; width: 50% }
  .demo > div:last-child { border-left: inherit; border-width: 0 0 0 2px; min-height: 200px; padding: 1rem }
</style>
<template>
  <pre ref="slots" hidden><slot></slot></pre>
  <div class="demo">
    <codemirror :extensions="[htmlConfig]" :style="style" :tab-size="2" v-model="code" />
    <div ref="view"></div>
  </div>
</template>