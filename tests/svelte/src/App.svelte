<script lang="ts">
  import '../../../src/u-progress/u-progress'

  let count: number = 0
  const increment = () => {
    count += 1
  }
</script>
<main>
  <h1>Vite + Svelte</h1>
  <button on:click={increment}>
    count is {count}
  </button>
  <u-progress value="5" max="10">33%</u-progress>
</main>
