<script setup lang="ts">
import { ref } from 'vue'
import '../../packages/u-progress'
import '../../packages/u-datalist'

const count = ref(0)
const value = ref('')
</script>

<template>
  <h1>Vue + u-elements</h1>
  <button type="button" @click="count++">count is {{ count }}</button>
  <u-progress :value="5" :max="10">33%</u-progress>
  <br />
  <br />
  <input list="my-list" :value="value" @input="() => (value = '-') && (value = '')" />
  <u-datalist id="my-list">
    <u-option value="test-1">Test 1</u-option>
    <u-option value="test-2">Test 2</u-option>
    <u-option value="test-3">Test 3</u-option>
  </u-datalist>
</template>
