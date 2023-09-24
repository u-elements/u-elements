import { useState } from 'react'
// import ReactDOM from 'react-dom/client'
import { render } from 'react-dom'
import '../../dist'


export default function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Vite + React</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <u-progress value="5" max="15"></u-progress>
    </>
  )
}

render(<App />, document.getElementById('root')!);

// ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
