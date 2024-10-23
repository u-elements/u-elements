<script setup>
import DefaultTheme from 'vitepress/theme'
import { watch } from "vue";
import { useRouter } from 'vitepress';

const { Layout } = DefaultTheme
const { route } = useRouter();

// Only run this on the client, not during build: Remove tabindex from syntax highlight
watch(() => route.data.relativePath, () => {
	if (typeof window !== 'undefined') setTimeout(() => {
    for(const el of document.querySelectorAll('[tabindex]:is(pre,table)')) el.removeAttribute('tabindex');
    for(const el of document.querySelectorAll('[title]:is(a)')) el.removeAttribute('title');
  });
}, { immediate: true });
</script>

<template>
  <Layout />
</template>