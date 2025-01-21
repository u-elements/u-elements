import '@builder.io/qwik/qwikloader.js'
import { render } from '@builder.io/qwik'
import { component$, useSignal } from '@builder.io/qwik'
import '../../packages/u-progress'
import '../../packages/u-datalist'
import '../../packages/u-tags'

const App = component$(() => {
  const count = useSignal(0)
  const value = useSignal('')

  return (
    <div>
      <h1>Qwik + u-elements</h1>
      <button onClick$={() => count.value++}>count is {count.value}</button>
      <u-progress value="15" max="20"></u-progress>
      <br />
      <br />
      {/* @ts-ignore */}
      <input list="my-list" value={value.value} onInput$={() => (value.value = '-') && (value.value = '')} />
      <u-datalist id="my-list" data-sr-singular="%d hit" data-sr-plural="%d hits">
        <u-option value="test-1">Test 1</u-option>
        <u-option value="test-2">Test 2</u-option>
        <u-option value="test-3">Test 3</u-option>
      </u-datalist>
      <u-tags class="my-class" onTags$={console.log}>
        <data>Kokkos</data>
        <data>Banan</data>
        <data>Jordbær</data>
        <input type="text" />
      </u-tags>
    </div>
  )
})

render(document.getElementById('app') as HTMLElement, <App />)
