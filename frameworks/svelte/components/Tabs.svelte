<script lang="ts">
  import '../../../packages/u-tabs/dist/u-tabs'
</script>

<u-tabs>
  <u-tablist>
    <u-tab>Tab 1</u-tab>
    <u-tab aria-selected="true">Tab 2</u-tab>
    <u-tab>Tab 3</u-tab>
  </u-tablist>
  <u-tabpanel>Panel 1 with <a href="#">link</a></u-tabpanel>
  <u-tabpanel>Panel 2 with <a href="#">link</a></u-tabpanel>
  <u-tabpanel>Panel 3 with <a href="#">link</a></u-tabpanel>
</u-tabs>

<style>
  u-tab {
    padding: 0.5em;
  }

  u-tab[aria-selected='true'] {
    border-bottom: 4px solid;
  }

  u-tabpanel {
    padding: 1em;
    border: 1px solid;
  }
</style>
