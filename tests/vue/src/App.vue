<script setup lang="ts">
import { ref } from 'vue'
import '../../../src/u-progress/u-progress'

const count = ref(0)
</script>

<template>
  <h1>Vite + Vue</h1>
  <button type="button" @click="count++">count is {{ count }}</button>
  <u-progress :value="5" :max="10">33%</u-progress>
</template>
