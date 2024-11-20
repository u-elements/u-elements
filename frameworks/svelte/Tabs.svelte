<script lang="ts">
  import "../../packages/u-tabs/u-tabs.ts";
  import selectedTabStore, { tabs } from "./store";
  const selected = $selectedTabStore.name;
  let showtada = false;
</script>

<u-tabs>
  <u-tablist>
    {#each tabs as tab (tab.name)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <u-tab
        aria-selected={selected === tab.name}
        on:click={() => selectedTabStore.set(tab)}
        aria-controls={`tab-${tab.name}`}
      >
        {tab.name} - {selected === tab.name}
      </u-tab>
    {/each}
  </u-tablist>
  <u-tabpanel id={`tab-${tabs[0].name}`}> Panel 1 with ✨ </u-tabpanel>
  <u-tabpanel id={`tab-${tabs[1].name}`}> Panel 2 with 🎖️ </u-tabpanel>
  <u-tabpanel id={`tab-${tabs[2].name}`}> Panel 3 with ¿ </u-tabpanel>
</u-tabs>

<div aria-selected={true}>true</div>
<div aria-selected={false}>false</div>
<u-tabs>
  <u-tablist>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <u-tab
      aria-selected={showtada}
      on:click={() => (showtada = true)}
      aria-controls={`tab-tada`}
    >
      tada
    </u-tab>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <u-tab
      aria-selected={!showtada}
      on:click={() => (showtada = false)}
      aria-controls={`tab-meh`}
    >
      meh
    </u-tab>
  </u-tablist>
  <u-tabpanel id={`tab-tada`}> Panel tada 🎉 </u-tabpanel>
  <u-tabpanel id={`tab-meh`}> Panel meh 😥 </u-tabpanel>
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