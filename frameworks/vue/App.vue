<script setup lang="ts">
import { ref } from 'vue'
import '../../dist'

const count = ref(0)
</script>

<template>
  <h1>Vue + u-elements</h1>
  <button type="button" @click="count++">count is {{ count }}</button>
  <u-progress :value="5" :max="10">33%</u-progress>
</template>
