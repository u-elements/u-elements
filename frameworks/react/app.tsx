import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
// import { render } from 'react-dom' // For React 16.8
import type { UHTMLTagsElement } from '../../packages/u-tags'
import '../../packages/u-progress'
import '../../packages/u-datalist'
import '../../packages/u-tags'

export default function App() {
  const [count, setCount] = useState(0)
  const [value, setValue] = useState('')
  const ref = useRef<UHTMLTagsElement>(null);

  useEffect(() => {
    const self = ref.current
    const onTags = (event: GlobalEventHandlersEventMap['tags']) => console.log(event.detail)

    self?.addEventListener('tags', onTags)
    return () => self?.removeEventListener('tags', onTags)
  }, []);

  return (
    <div>
      <h1>React + u-elements</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <u-progress value="5" max="15"></u-progress>
      <br />
      <br />
      <label htmlFor="my-input"></label>
      <input id="my-input" list="my-list" value={value} onChange={() => setValue('')} />
      <u-datalist id="my-list" class="my-class-name">
        <u-option value="test-1">Test 1</u-option>
        <u-option value="test-2">Test 2</u-option>
        <u-option value="test-3">Test 3</u-option>
      </u-datalist>
      <u-tags ref={ref}>
        <data>Kokkos</data>
        <data>Banan</data>
        <data>Jordbær</data>
        <input type="text" />
      </u-tags>
    </div>
  )
}

// @ts-ignore
const mount = window.mount = window.mount || ReactDOM.createRoot(document.getElementById('root')!)
mount.render(<App />)
// render(<App />, document.getElementById('root')!); // For React 16.8
