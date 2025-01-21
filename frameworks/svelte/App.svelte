<script lang="ts">
  import './../../packages/u-progress'
  import './../../packages/u-datalist'
  import './../../packages/u-tags'
  import Tabs from './Tabs.svelte'
</script>

<main>
  <h1>Svelte + u-elements</h1>
  <u-progress value="5" max="10">33%</u-progress>
  <br />
  <u-datalist id="my-list" data-sr-singular="%d hit" data-sr-plural="%d hits">
    <u-option value="test-1">Test 1</u-option>
    <u-option value="test-2">Test 2</u-option>
    <u-option value="test-3">Test 3</u-option>
  </u-datalist>
  <u-tags on:tags={(event) => console.log(event.detail)}>
    <data>Kokkos</data>
    <data>Banan</data>
    <data>Jordbær</data>
    <input type="text" />
  </u-tags>
  <Tabs />
</main>