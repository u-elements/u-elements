<script setup>
import { ref, watch } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { html } from '@codemirror/lang-html'

let timer = null
const code = ref('')
const iframe = ref(null)
const slots = ref(null)
const style = { height: '100%', outline: 'none!important', fontSize: '.875em' }
const extensions = [html({
  extraTags: {
    'u-datalist': { globalAttrs: true },
    'u-option': { globalAttrs: true, attrs: { label: null, value: null, disabled: null, selected: null } },
    'u-progress': { globalAttrs: true, attrs: { max: null, value: null } },
    'u-details': { globalAttrs: true, attrs: { name: null, open: null } },
    'u-summary': { globalAttrs: true }
  }
})]

const updateIframe = () => {
  const body = iframe.value.contentDocument?.body
  if (body) body.innerHTML = code.value
}

watch(slots, () => updateIframe(code.value = slots.value.textContent.trim()))
watch(code, () => clearTimeout(timer) || (timer = setTimeout(updateIframe, 300)))
</script>
<style>
  .demo { border-radius: 8px; border: 2px dashed var(--vp-c-divider); display: flex; margin-block: .5em; overflow: hidden }
  .demo > * { box-sizing: border-box; display: block!important; width: 50% }
  .demo > iframe { border-left: inherit; border-width: 0 0 0 2px; height: 300px; resize: vertical }
</style>
<template>
  <pre ref="slots" hidden><slot></slot></pre>
  <div class="demo">
    <codemirror :extensions="extensions" :style="style" :tab-size="2" v-model="code" />
    <iframe ref="iframe" srcdoc="<script type=&quot;module&quot; src=&quot;https://unpkg.com/@u-elements/u-elements@latest/dist/index.js&quot;></script>"></iframe>
  </div>
</template>