/* @refresh reload */
import { createSignal } from 'solid-js'
import '../../packages/u-progress'
import '../../packages/u-datalist'
import '../../packages/u-combobox'
import type { UHTMLComboboxElement } from '../../packages/u-combobox'

export default function App() {
  const [count, setCount] = createSignal(0)
  const [value, setValue] = createSignal('')
  let ref!: UHTMLComboboxElement
  const onTags = () => console.log(ref.items)

  return (
    <div>
      <h1>Solid + u-elements</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count()}
      </button>
      <u-progress value={5} max={15}></u-progress><br />
      <br />
      <input
        list="my-list"
        value={value()}
        onInput={() => {
          setValue('-') // Need to set to something else first to force re-render overwrite
          setValue('')
        }}
      />
      <u-datalist id="my-list" data-sr-singular="%d hit" data-sr-plural="%d hits">
        <u-option value="test-1">Test 1</u-option>
        <u-option value="test-2">Test 2</u-option>
        <u-option value="test-3">Test 3</u-option>
      </u-datalist>
      <u-combobox ref={ref} on:comboboxafterselect={onTags}>
        <data>Kokkos</data>
        <data>Banan</data>
        <data>Jordbær</data>
        <input type="text" />
      </u-combobox>
    </div>
  )
}


