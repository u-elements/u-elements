<script setup lang="ts">
import { onMounted, ref } from "vue";
import "../../packages/u-progress";
import "../../packages/u-datalist";
import "../../packages/u-combobox";
import type { UHTMLComboboxElement } from "../../packages/u-combobox";

const count = ref(0);
const value = ref("");
const tags = ref<UHTMLComboboxElement>();
const handleBeforeSelect = (
	event: GlobalEventHandlersEventMap["comboboxbeforeselect"],
) => console.log(event.detail);

onMounted(() => console.log(tags.value?.items));
</script>

<template>
  <h1>Vue + u-elements</h1>
  <button type="button" @click="count++">count is {{ count }}</button>
  <u-progress :value="5" :max="10">33%</u-progress>
  <br />
  <br />
  <input list="my-list" :value="value" @input="() => (value = '-') && (value = '')" />
  <u-combobox ref="tags" v-on:comboboxbeforeselect="handleBeforeSelect">
    <data>Kokkos</data>
    <data>Banan</data>
    <data>Jordbær</data>
    <input type="text" />
    <u-datalist data-sr-singular="%d hit" data-sr-plural="%d hits">
      <u-option value="test-1">Test 1</u-option>
      <u-option value="test-2">Test 2</u-option>
      <u-option value="test-3">Test 3</u-option>
    </u-datalist>
  </u-combobox>
</template>
