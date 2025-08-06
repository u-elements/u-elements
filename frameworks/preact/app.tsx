import { render } from 'preact'
import { useRef, useState } from 'preact/hooks'
import type { UHTMLComboboxElement } from '../../packages/u-combobox'
import '../../packages/u-progress'
import '../../packages/u-datalist'
import '../../packages/u-combobox'

export default function App() {
  const [count, setCount] = useState(0)
  const [value, setValue] = useState('')
  const ref = useRef<UHTMLComboboxElement>(null);

  return (
    <div>
      <h1>Preact + u-elements</h1>
      <button type="button" onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <u-progress value="5" max="15"></u-progress>
      <br />
      <br />
      <label htmlFor="my-input">Hei</label>
      <u-combobox ref={ref} oncomboboxbeforeselect={console.log}>
        <input id="my-input" value={value} onChange={() => setValue('')} />
        <data>Kokkos</data>
        <data>Banan</data>
        <data>Jordbær</data>
        <u-datalist class="my-class-name" data-sr-singular="%d hit" data-sr-plural="%d hits">
          <u-option value="test-1">Test 1</u-option>
          <u-option value="test-2">Test 2</u-option>
          <u-option value="test-3">Test 3</u-option>
        </u-datalist>
      </u-combobox>
    </div>
  )
}

render(<App />, document.getElementById('root')!)