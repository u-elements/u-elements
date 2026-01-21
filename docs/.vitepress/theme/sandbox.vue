<script setup lang="ts">
import { ref, watch } from "vue";
import * as datalist from "../../../packages/u-datalist/u-datalist";
import "../../../packages/u-details/polyfill";

const { label, lang } = defineProps<{ label: string; lang?: string }>();

// Import all uElements
Promise.all(
	Object.values(
		// @ts-expect-error
		import.meta.glob("../../../packages/*/u-!(*.spec).ts"),
	).map((module) => (module as () => void)()),
);

let timer: ReturnType<typeof setTimeout> | number = 0;
const code = ref("");
const view = ref<HTMLElement | null>(null);
const demo = ref<HTMLElement | null>(null);
const updateView = () => {
	if (!view.value) return;
	view.value.innerHTML = code.value;
	Object.assign(window, datalist); // Special handle utils exported from u-datalist

	for (const script of view.value.querySelectorAll("script"))
		Function(script.textContent?.replace(/import [^;]+;/g, "") || "")(); // Exec scripts
};

watch(demo, () => {
	const pre = demo.value?.nextElementSibling;
	if (pre?.nodeName !== "PRE")
		console.log("Sandbox is missing <pre> for source code", demo.value);
	code.value = pre?.textContent || "";
	updateView();
});
watch(code, () => {
	clearTimeout(timer);
	timer = setTimeout(updateView, 300);
});
</script>
<style>
  .demo { border-radius: 8px; border: 2px dashed var(--vp-c-divider); margin-block: .5em }
  .demo-code, .demo-view { box-sizing: border-box; display: block; max-width: 100%; min-width: 0 }
  .demo-code { font: .875rem/1.5 var(--vp-font-family-mono); field-sizing: content; background: none; padding: .5em; resize: vertical; }
  .demo-view { border-bottom: inherit; min-height: 200px; padding: 1rem; margin: -2px }
  .demo-view :where(button,input) { all: revert }
</style>
<template>
  <pre hidden><slot></slot></pre>
  <div class="demo" ref="demo">
		<div class="demo-view" :lang="lang" ref="view"></div>
		<textarea :aria-label="label" class="demo-code" v-model="code" wrap="off" autocomplete="off"></textarea>
  </div>
</template>