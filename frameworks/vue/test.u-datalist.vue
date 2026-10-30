<script setup lang="ts">
// Vue harness page for the shared u-datalist suite (packages/u-datalist/u-datalist.suite.ts).
// Options are rendered from keyed reactive state, the input uses v-model, and input is bound with @input
import "../../packages/u-datalist/u-datalist";
import { log } from "../../packages/harness";
import {
	DEFAULTS,
	datalistAttrs,
	type HarnessConfig,
	inputIds,
	listAttr,
	optionAttrs,
} from "../../packages/u-datalist/u-datalist.harness";
import { harnessState } from "./harness";

const state = harnessState(DEFAULTS);

const inputAttrs = (cfg: HarnessConfig) => ({
	readonly: cfg.inputAttrs.readonly !== undefined,
	disabled: cfg.inputAttrs.disabled !== undefined,
});
</script>

<template>
  <template v-for="(cfg, index) in state.cfgs" :key="index">
    <template v-if="cfg.mounted">
      <template v-for="(id, i) in inputIds(cfg)" :key="id">
        <label :for="id">Label {{ id }}</label>
        <input
          v-if="i === 0"
          :key="cfg.inputKey"
          :id="id"
          :list="listAttr(cfg)"
          v-model="cfg.value"
          v-bind="inputAttrs(cfg)"
          @input="log('input', $event)"
        />
        <input v-else :id="id" :list="listAttr(cfg)" v-bind="inputAttrs(cfg)" />
      </template>
      <u-datalist v-if="cfg.options" v-bind="datalistAttrs(cfg)">
        <u-option v-for="option in cfg.options" :key="option.key" v-bind="optionAttrs(option)">{{ option.text }}</u-option>
      </u-datalist>
      <u-datalist v-if="cfg.options2" v-bind="datalistAttrs(cfg, `${cfg.listId}-2`)">
        <u-option v-for="option in cfg.options2" :key="option.key" v-bind="optionAttrs(option)">{{ option.text }}</u-option>
      </u-datalist>
    </template>
  </template>
</template>
