import '@builder.io/qwik/qwikloader.js'
import { render } from '@builder.io/qwik'
import { JSX } from '@builder.io/qwik/jsx-runtime'
import { component$, useSignal } from '@builder.io/qwik'
import '../../../src/u-progress/u-progress'

type MyTpe = JSX.IntrinsicElements['u-progress'];

const App = component$(() => {
  const count = useSignal(0)

  return (
    <>
      <h1>Vite + Qwik</h1>
      <button onClick$={() => count.value++}>count is {count.value}</button>
      <u-progress value="15"></u-progress>
    </>
  )
})

render(document.getElementById('app') as HTMLElement, <App />)
