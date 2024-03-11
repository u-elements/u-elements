import { useState } from 'react'
import ReactDOM from 'react-dom/client'
// import { render } from 'react-dom' // For React 16.8
import '../../packages/u-progress'
import '../../packages/u-datalist'

export default function App() {
  const [count, setCount] = useState(0)
  const [value, setValue] = useState('')

  return (
    <div>
      <h1>React + u-elements</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <u-progress value="5" max="15"></u-progress>
      <br />
      <br />
      <input list="my-list" value={value} onChange={() => setValue('')} />
      <u-datalist id="my-list">
        <u-option value="test-1">Test 1</u-option>
        <u-option value="test-2">Test 2</u-option>
        <u-option value="test-3">Test 3</u-option>
      </u-datalist>
    </div>
  )
}

// @ts-ignore
const mount = window.mount = window.mount || ReactDOM.createRoot(document.getElementById('root')!)
mount.render(<App />)
// render(<App />, document.getElementById('root')!); // For React 16.8
