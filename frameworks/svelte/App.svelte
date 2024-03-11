<script lang="ts">
  import '../../packages/u-progress'
  import '../../packages/u-datalist'

  let count: number = 0
  let value: string = ''
  const increment = () => {
    count += 1
  }
  const setValue = (content: string) => {
    value = content
  }
</script>
<main>
  <h1>Svelte + u-elements</h1>
  <button on:click={increment}>
    count is {count}
  </button>
  <u-progress value="5" max="10">33%</u-progress>
  <br />
  <input
        list="my-list"
        value={value}
        on:input={() => {
          setValue('-') // Need to set to something else first to force re-render overwrite
          setValue('')
        }}
      />
      <u-datalist id="my-list">
        <u-option value="test-1">Test 1</u-option>
        <u-option value="test-2">Test 2</u-option>
        <u-option value="test-3">Test 3</u-option>
      </u-datalist>
</main>
