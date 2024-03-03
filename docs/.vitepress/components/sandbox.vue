<script setup>
  import CodeMirror from 'vue-codemirror6';
  import { ref, watch } from 'vue'
  import { html } from '@codemirror/lang-html'
  
  // Import all uElements
  const modules = Object.values(import.meta.glob('../../../packages/*/u-!(*.spec).ts'))
  const loading = Promise.all(modules.map((module) => module()))
  const htmlLang = ref(html());
  
  // Auto generate htmlLang for codeMirror
  loading.then((klasses) => {
    const extraTags = Object.fromEntries(
      klasses
        .flatMap((module) => Object.entries(module))
        .map(([type, { observedAttributes: attr = [] }]) => [
          type.replace(/UHTML(\S+)Element/g, 'u-$1').toLowerCase(),
          { globalAttrs: true, attrs: Object.fromEntries(attr.map((v) => [v, null])) }
        ])
      )
      htmlLang.value = html({ extraTags });
  })

  let timer = null
  const code = ref('')
  const view = ref(null)
  const slots = ref(null)
  const updateView = () => view.value && (view.value.innerHTML = code.value);
  
  watch(slots, () => updateView(code.value = slots.value.textContent.trim()))
  watch(code, () => clearTimeout(timer) || (timer = setTimeout(updateView, 300)))
</script>
<style>
  .demo { border-radius: 8px; border: 2px dashed var(--vp-c-divider); display: flex; flex-wrap: wrap; margin-block: .5em; overflow: clip }
  .demo-code, .demo-view { box-sizing: border-box; min-width: 0; flex: 1 0 100%; }
  .demo-code > * { font-size: .875rem; height: 100%; outline: none!important }
  .demo-view { border: inherit; min-height: 200px; padding: 1rem; margin: -2px }
  .demo-view :is(button,input) { all: revert }
  @media (min-width: 800px) { .demo-code, .demo-view { flex-basis: 50% } }
</style>
<template>
  <pre ref="slots" hidden><slot></slot></pre>
  <div class="demo">
    <ClientOnly>
      <CodeMirror class="demo-code" basic :lang="htmlLang" v-model="code" />
    </ClientOnly>
    <div class="demo-view" ref="view"></div>
  </div>
</template>