<script setup lang="ts">
// Vue harness page for the shared u-progress suite (packages/u-progress/u-progress.suite.ts).
// value and max are bound as props, which Vue writes as properties on the custom element
import "../../packages/u-progress/u-progress";
import {
	DEFAULTS,
	labelId,
	progressAttrs,
} from "../../packages/u-progress/u-progress.harness";
import { harnessState } from "./harness";

const state = harnessState(DEFAULTS);
</script>

<template>
  <template v-for="(cfg, index) in state.cfgs" :key="index">
    <template v-if="cfg.mounted">
      <label v-if="cfg.label === 'for'" :for="cfg.id">{{ cfg.text }}</label>
      <span v-if="cfg.label === 'aria-labelledby'" :id="labelId(cfg)">{{ cfg.text }}</span>
      <label v-if="cfg.label === 'wrap'">
        {{ cfg.text }}
        <u-progress v-bind="progressAttrs(cfg)" :value="cfg.value" :max="cfg.max" :hidden="cfg.hidden"></u-progress>
      </label>
      <u-progress v-else v-bind="progressAttrs(cfg)" :value="cfg.value" :max="cfg.max" :hidden="cfg.hidden"></u-progress>
    </template>
  </template>
</template>
