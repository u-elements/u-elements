<script lang="ts">
import "../../packages/u-datalist";
import "../../packages/u-combobox";
// import Tabs from './Tabs.svelte'

function handleBeforeSelect(event: CustomEvent) {
	console.log(event.detail);
}
</script>

<main>
  <h1>Svelte + u-elements</h1>
  <u-progress value="5" max="10">33%</u-progress>
  <br />
  <u-combobox oncomboboxbeforeselect={handleBeforeSelect}>
    <data>Kokkos</data>
    <data>Banan</data>
    <data>Jordbær</data>
    <input type="text" list="my-list" />
    <u-datalist id="my-list" data-sr-singular="%d hit" data-sr-plural="%d hits">
      <u-option value="test-1">Test 1</u-option>
      <u-option value="test-2">Test 2</u-option>
      <u-option value="test-3">Test 3</u-option>
    </u-datalist>
  </u-combobox>
</main>