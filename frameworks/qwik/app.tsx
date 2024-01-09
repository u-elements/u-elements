import '@builder.io/qwik/qwikloader.js'
import { render } from '@builder.io/qwik'
import { component$, useSignal } from '@builder.io/qwik'
import '../../dist'

const App = component$(() => {
  const count = useSignal(0)

  return (
    <>
      <h1>Qwik + u-elements</h1>
      <button onClick$={() => count.value++}>count is {count.value}</button>
      <u-progress value="15" max="20"></u-progress>
    </>
  )
})

render(document.getElementById('app') as HTMLElement, <App />)
