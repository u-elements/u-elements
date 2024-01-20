/* @refresh reload */
import { createSignal } from 'solid-js'
import '../../dist'

export default function App() {
  const [count, setCount] = createSignal(0)

  return (
    <>
      <h1>Solid + u-elements</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count()}
      </button>
      <u-progress value={5} max={15}></u-progress>
    </>
  )
}


