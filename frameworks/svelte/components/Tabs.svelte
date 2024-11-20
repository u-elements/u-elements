<script lang="ts">
  import "../../../packages/u-tabs/dist/u-tabs";
  import selectedTabStore, { tabs } from "./store.js";
</script>

<u-tabs>
  <u-tablist>
    {#each tabs as tab (tab.name)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <u-tab
        aria-selected={$selectedTabStore.name === tab.name}
        on:click={() => selectedTabStore.set(tab)}
        aria-controls={`tab-${tab.name}`}
      >
        {tab.name}
      </u-tab>
    {/each}
  </u-tablist>
  <u-tabpanel id={`tab-${tabs[0].name}`}> Panel 1 with ✨ </u-tabpanel>
  <u-tabpanel id={`tab-${tabs[1].name}`}> Panel 2 with 🎖️ </u-tabpanel>
  <u-tabpanel id={`tab-${tabs[2].name}`}> Panel 3 with ¿ </u-tabpanel>
</u-tabs>

<style>
  u-tab {
    padding: 0.5em;
  }

  u-tab[aria-selected="true"] {
    border-bottom: 4px solid;
  }

  u-tabpanel {
    padding: 3em;
    border: 1px solid;
  }
</style>
