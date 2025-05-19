import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
// import { render } from 'react-dom' // For React 16.8
import type { UHTMLComboboxElement } from '../../packages/u-combobox'
import '../../packages/u-progress'
import '../../packages/u-datalist'
import '../../packages/u-combobox'
import '../../packages/u-tags'
import '../../packages/u-tabs'

export default function App() {
  const [count, setCount] = useState(0);
  const ref = useRef<UHTMLComboboxElement>(null);

  useEffect(() => {
    const self = ref.current
    const beforeChange = (event: CustomEvent<HTMLDataElement>) => {
      const target = event.target as UHTMLComboboxElement;
      const item = event.detail;
      event.preventDefault();
      setSelected(target.values.concat(item.value).filter((v) => item.value !== v || !item.isConnected));
    }

    self?.addEventListener('beforechange', beforeChange, true)
    return () => self?.removeEventListener('beforechange', beforeChange, true);
  }, []);

  const [selected, setSelected] = useState(["Test 1", "Test 2"]);

  return (
    <div>
      <style>{`u-option[selected]{color:red;font-weight:bold}`}</style>
      <h1>React + u-elements</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <u-progress value="5" max="15"></u-progress>
      <br />
      <br />
      <label htmlFor="my-input">Choose ice cream</label>
      <br />
      <select multiple value={selected} onChange={()=>{}}>
        {selected.map((opt) => <option key={opt}>{opt}</option>)}
      </select>
      <u-combobox ref={ref} data-multiple>
        {selected.map((opt) => <data key={opt}>{opt}</data>)}
        <input id="my-input" />
        <u-datalist id="my-list">
          <u-option>Test 1</u-option>
          <u-option>Test 2</u-option>
          <u-option>Test 3</u-option>
          <u-option>Bergen</u-option>
        </u-datalist>
      </u-combobox>
      <br />
      <br />
      <style>{`
        u-tab { padding: 2px 5px }
        u-tab[aria-selected="true"] { background: black; color: white }
        u-tabpanel { padding: 10px; border: 1px solid }
      `}</style>
      <div>
        `u-tabpanel`s are defined outside `u-tabs`. when using
        `aria-selected=true` the initial selected tab is `hidden`, and if you
        inspect the DOM you can see that the tab that has `aria-selected=true`
        has no value for the `aria-controls` attribute
      </div>
      <br />
      <br />
      <u-tablist>
        <u-tab id="t1" aria-controls="panel1" aria-selected="true">
          Tab 1
        </u-tab>
        <u-tab id="t2" aria-controls="panel2">
          Tab 2
        </u-tab>
        <u-tab id="t3" aria-controls="panel3">
          Tab 3
        </u-tab>
      </u-tablist>

      <u-tabpanel id="panel1">Panel 1</u-tabpanel>
      <u-tabpanel id="panel2">Panel 2</u-tabpanel>
      <u-tabpanel id="panel3">Panel 3</u-tabpanel>
    </div>
  )
}

// @ts-ignore
const mount = window.mount = window.mount || ReactDOM.createRoot(document.getElementById('root')!)
mount.render(<App />)
// render(<App />, document.getElementById('root')!); // For React 16.8
