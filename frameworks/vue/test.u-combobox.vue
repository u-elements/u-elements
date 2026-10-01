<script setup lang="ts">
// Vue harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Items are rendered from reactive state (controlled), the input uses v-model,
// and all combobox events are bound with Vue event listeners.
import { nextTick, reactive } from "vue";
import "../../packages/u-datalist/u-datalist";
import "../../packages/u-combobox/u-combobox";
import {
	comboboxAttrs,
	createHarness,
	type HarnessConfig,
	handleBeforeSelect,
	handleInput,
	handleSubmit,
	listId,
	log,
	optionAttrs,
	optionKey,
	optionTag,
} from "../../packages/u-combobox/u-combobox.harness";

const state = reactive<{ cfgs: HarnessConfig[] }>({ cfgs: [] });

createHarness({
	render: async (cfgs) => {
		state.cfgs = cfgs;
		await nextTick();
	},
	update: async (patch, index) => {
		Object.assign(state.cfgs[index], patch);
		await nextTick();
	},
});

const inputAttrs = (cfg: HarnessConfig) => ({
	type: cfg.inputAttrs.type,
	readonly: cfg.inputAttrs.readonly !== undefined,
	disabled: cfg.inputAttrs.disabled !== undefined,
	form: cfg.form === "outside" ? "form" : undefined,
});
</script>

<template>
  <template v-for="(cfg, index) in state.cfgs" :key="index">
    <template v-if="cfg.mounted">
      <label v-if="cfg.label" :for="cfg.id">Label</label>
      <form v-if="cfg.form === 'outside'" id="form" @submit="handleSubmit">
        <input id="other" name="other" value="keep" />
        <button type="submit">Send</button>
      </form>
      <component
        :is="cfg.form === true ? 'form' : 'div'"
        :id="cfg.form === true ? 'form' : undefined"
        @submit="handleSubmit"
      >
        <u-combobox
          v-bind="comboboxAttrs(cfg)"
          @comboboxbeforeselect="handleBeforeSelect($event, cfg, (items) => (cfg.items = items))"
          @comboboxafterselect="log('comboboxafterselect', $event)"
          @comboboxbeforematch="log('comboboxbeforematch', $event)"
          @comboboxprogrammaticinput="log('comboboxprogrammaticinput', $event)"
          @input="handleInput($event, cfg, (options) => (cfg.options = options))"
          @change="log('change', $event)"
        >
          <select v-if="cfg.select" :name="cfg.select" hidden></select>
          <data v-for="item in cfg.items" :key="item.value" :value="item.value">{{ item.label }}</data>
          <input :id="cfg.id" :list="listId(cfg)" v-model="cfg.value" v-bind="inputAttrs(cfg)" />
          <button v-if="cfg.toggle" type="button" aria-expanded="false">Toggle</button>
          <del v-if="cfg.clear === 'del'"></del>
          <button v-else-if="cfg.clear" type="reset">Clear</button>
          <component
            v-if="cfg.options"
            :is="cfg.listTag"
            :key="cfg.listKey"
            :id="listId(cfg)"
            :data-nofilter="cfg.nofilter ? '' : null"
          >
            <component
              v-for="option in cfg.options"
              :is="optionTag(cfg)"
              :key="optionKey(option)"
              v-bind="optionAttrs(option)"
            >{{ option.text }}</component>
          </component>
        </u-combobox>
        <template v-if="cfg.form === true">
          <input id="other" name="other" value="keep" />
          <button type="submit">Send</button>
        </template>
      </component>
    </template>
  </template>
</template>
