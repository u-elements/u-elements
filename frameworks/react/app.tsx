import { useState } from 'react'
import ReactDOM from 'react-dom/client'
// import { render } from 'react-dom' // For React 16.8
import '../../dist'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>React + u-elements</h1>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <u-progress value="5" max="15"></u-progress>
    </>
  )
}

// render(<App />, document.getElementById('root')!); // For React 16.8
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
