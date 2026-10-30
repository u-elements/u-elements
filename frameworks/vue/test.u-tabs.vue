<script setup lang="ts">
// Vue harness page for the shared u-tabs suite (packages/u-tabs/u-tabs.suite.ts).
// Tabs and panels are rendered from keyed reactive state, aria-selected is rendered from state in controlled mode,
// and click is bound with @click, which Vue attaches directly to the element
import "../../packages/u-tabs/u-tabs";
import {
	DEFAULTS,
	handleClick,
	panelAttrs,
	tabAttrs,
	tabsProps,
	visiblePanels,
} from "../../packages/u-tabs/u-tabs.harness";
import { harnessState } from "./harness";

const state = harnessState(DEFAULTS);
</script>

<template>
  <template v-for="(cfg, index) in state.cfgs" :key="index">
    <template v-if="cfg.mounted">
      <u-tabs v-bind="{ ...cfg.attrs, ...tabsProps(cfg) }" :data-rewrite="cfg.rewrite">
        <u-tablist>
          <u-tab
            v-for="tab in cfg.tabs"
            :key="tab.key"
            v-bind="tabAttrs(tab, cfg)"
            @click="handleClick($event, tab, cfg, (selected) => (cfg.selected = selected))"
          >{{ tab.label }}</u-tab>
        </u-tablist>
        <template v-if="!cfg.panelsOutside">
          <u-tabpanel v-for="panel in visiblePanels(cfg)" :key="panel.key" v-bind="panelAttrs(panel, cfg)">
            {{ panel.text }}
            <u-tabs v-if="cfg.nested && panel.key === cfg.panels[0].key">
              <u-tablist>
                <u-tab>Nested 1</u-tab>
                <u-tab>Nested 2</u-tab>
              </u-tablist>
              <u-tabpanel>Nested panel 1</u-tabpanel>
              <u-tabpanel>Nested panel 2</u-tabpanel>
            </u-tabs>
          </u-tabpanel>
        </template>
      </u-tabs>
      <template v-if="cfg.panelsOutside">
        <u-tabpanel v-for="panel in visiblePanels(cfg)" :key="panel.key" v-bind="panelAttrs(panel, cfg)">{{ panel.text }}</u-tabpanel>
      </template>
    </template>
  </template>
</template>
