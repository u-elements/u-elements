---
title: u-datalist
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-datalist&gt; <mark data-badge="html"></mark>
`<u-datalist>` lets you suggest values to a connected `<input>`. You can use it to make things like comboboxes, autosuggest, autocomplete, live search results, etc.

**Quick intro:**
- Use `<u-option>` as direct child elements - these will show the suggestions while typing
- Use matching `id` on `<u-datalist>` and `list` attribute on `<input>` to connect
- **Want to show suggestions from a data source?** See [example: API &rarr;](#example-api)
- **MDN Web Docs:** [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) ([HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)) / [&lt;option&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) ([HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement))

## Example
<Sandbox>
&lt;style&gt;
  u-option[selected] { font-weight: bold }
&lt;/style&gt;
&lt;label for="my-input"&gt;
  Choose flavor of ice cream
&lt;/label&gt;
&lt;input id="my-input" list="my-list" /&gt;
&lt;u-datalist id="my-list"&gt;
  &lt;u-option&gt;Coconut&lt;/u-option&gt;
  &lt;u-option&gt;Strawberries&lt;/u-option&gt;
  &lt;u-option&gt;Chocolate&lt;/u-option&gt;
  &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;u-option&gt;Licorice&lt;/u-option&gt;
  &lt;u-option&gt;Pistachios&lt;/u-option&gt;
  &lt;u-option&gt;Mango&lt;/u-option&gt;
  &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
&lt;/u-datalist&gt;
</Sandbox>

## Install <mark :data-badge="data['u-datalist']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-datalist
```

```bash [PNPM]
pnpm add -S @u-elements/u-datalist
```

```bash [Yarn]
yarn add -S @u-elements/u-datalist
```

```bash [Bun]
bun add -S @u-elements/u-datalist
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-datalist@latest/dist/u-datalist.js"></script>
```
:::

## Attributes and props

### `<u-datalist>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `id` must be identical to value of `list` attribute on associated `<input>`
- **DOM interface:** [`HTMLDataListElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataListElement)
  - `HTMLDataListElement.options` returns `HTMLCollectionOf<HTMLOptionElement>`

### `<u-option>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `disabled` disables and hides the element if present. **Note:** Setting `disabled="false"` will not work as intended, as `disabled` is a boolean attribute you should provide or remove entirely.
  - `label` label sets text indicating the meaning of the option. If `label` isn't defined, its value is that of the element text content.
  - `selected` sets option selected state. **Note:** Setting `selected="false"` will not work as intended, as `selected` is a boolean attribute you should provide or remove entirely.
  - `value` represents the value to be filled into associated `<input>`. If `value` isn't defined, the value is taken from the text content of the option element.
- **DOM interface:** [`HTMLOptionElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement)
  - `HTMLOptionElement.defaultSelected` returns `true` or `false` indicating state
  - `HTMLOptionElement.disabled` returns `true` of `false` reflecting the `disabled` attribute
  - `HTMLOptionElement.form` returns parent `HTMLFormElement`
  - `HTMLOptionElement.index` returns a `number` representing the position/index within the list of options
  - `HTMLOptionElement.label` sets or gets `string` of option `label`
  - `HTMLOptionElement.selected` sets or gets `true` or `false` indicating state
  - `HTMLOptionElement.text` sets og gets `string` of option text content
  - `HTMLOptionElement.value` sets og gets `string` of option `value`

## Events
While `<u-datalist>` support all events, *native* datalist does not as it is rendered as part of the browser UI.  Therefore, it's recommended to avoid binding events to `<u-datalist>` or `<u-option>` if you want to ensure native compatibility and future seamless opt-out.

Instead, you can detect the selection of an option element by
binding an `input` listener to the `<input>` element and check for a falsy `event.inputType`:

```html
<input type="text" list="my-list" />
<datalist id="my-list">
  <option>Option 1</option>
  <option>Option 2</option>
</datalist>
<script>
  const input = document.querySelector('input')

  input.addEventListener('input', (event) => {
    if (!event.inputType) {
      // Event is triggered by user selecting an option in datalist
    } else {
      // Event is triggered by user typing in input
    }
  })
</script>
```

## Styling


While `<u-datalist>` and `<u-option>` are styleable, *native* datalist and option elements are currently not. However, there is a possibility that the [native elements may become styleable in the future](https://open-ui.org/components/selectlist/#styling).

### Styling with the display property

`<u-datalist>` and `<u-option>` are both rendered as `display: block` when visible, and are hidden by the `hidden` attribute. Styling with a `display` property will override the `hidden` attribute, thus disabling datalist show/hide and option filtering, unless you wrap your styling in a `:not([hidden])` selector:

```css
u-datalist:not([hidden]) {
  display: flex;
  /* Use :not([hidden]) if you wish to change u-datalist display
   * without disabling open/close */
}
u-option:not([hidden]) {
  display: flex;
  /* Use :not([hidden]) if you wish to change u-option display
   * without disabling filtering */
}
```

### Styling option focus and selected state
`<u-option>` receive real focus on keyboard navigation, and a `selected` attribute on selection, which both can be utilized for styling:

```css
u-option:focus {
  /* Focused option styling here */
}
u-option:not(:focus) {
  /* Un-focused option styling here */
}
u-option[selected] {
  /* Selected option styling here */
}
u-option:not([selected]) {
  /* Un-selected option styling here */
}
```

### Styling example: Datalist position and animation

<Sandbox>
&lt;style&gt;
  .my-input,
  .my-list {
    background: #fff;
    border-radius: .25em;
    border: 2px solid #090C33;
    box-sizing: border-box;
    color: #090C33;
    font: inherit;
    padding: .5em;
    width: 13em;
    transition: .2s; /* Animate */
  }
  .my-input {
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-width='2' d='m3 8 9 9 9-9'/%3E%3C/svg%3E") center right/2rem 1rem no-repeat;
  }
  .my-input[aria-expanded="true"] {
    background-color: #f9ffd7;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .my-input:focus-visible,
  .my-list u-option:focus {
    box-shadow: 0 0 0 1px #fff,0 0 0 3px #6325e7,0 0 0 4px #fff;
    outline: none;
  }
  .my-list {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    box-shadow: 0 .3em 1em #090C3333;
    display: block; /* Overwrites hidden attribute */
    margin-top: -2px;
    position: absolute;
  }
  .my-list[hidden] {
    opacity: 0;
    translate: 0 -.5em;
    visibility: hidden;
  }
  .my-list u-option {
    border-radius: .1em;
    padding: .5em;
    transition: .2s;
  }
  .my-list u-option:focus {
    background-color: #EBF0FA;
  }
  .my-list u-option[selected] {
    font-weight: bold;
    text-decoration: underline;
  }
&lt;/style&gt;
&lt;label&gt;
  Choose flavor of ice cream
  &lt;br /&gt;
  &lt;input type="text" class="my-input" list="my-styling" /&gt;
&lt;/label&gt;
&lt;u-datalist class="my-list" id="my-styling"&gt;
  &lt;u-option&gt;Coconut&lt;/u-option&gt;
  &lt;u-option&gt;Strawberries&lt;/u-option&gt;
  &lt;u-option&gt;Chocolate&lt;/u-option&gt;
  &lt;u-option&gt;Vanilla&lt;/u-option&gt;
&lt;/u-datalist&gt;
&lt;p&gt;
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique tellus massa, eget sollicitudin arcu luctus vel. Cras non purus accumsan, ultricies mi ut, blandit magna.
&lt;/p&gt;
</Sandbox>

## Example: API

<Sandbox>
&lt;label&gt;
  Choose country
  &lt;br /&gt;
  &lt;input type="text" id="my-api-input" list="my-api-list" /&gt;
&lt;/label&gt;
&lt;u-datalist id="my-api-list"&gt;
  Type to search for countries...
&lt;/u-datalist&gt;
&lt;script&gt;
  let debounceTimer; // Debounce so we do not spam API
  const input = document.getElementById('my-api-input');
  const list = input.list;
  const xhr = new XMLHttpRequest(); // Easy to abort

  // Same handler every time
  xhr.onload = () => {
    try {
      const data = JSON.parse(xhr.responseText);
      const options = data.map(({ name }, index) =>
        Object.assign(document.createElement('u-option'), {
          text: name,
          value: \`${index}: ${input.value}` // Prevent filtering by matching value and input
        })
      );
      list.replaceChildren(...options);
    } catch (err) {
      list.textContent = 'No results';
    }
  };

  input.addEventListener('input', (event) => {
    if (!event.inputType) {
      // User clicked u-option, lets get option.text
      const index = Number(input.value.split(\`:\`)[0])
      const option = list.options[index];
      input.value = option.text;
    } else if (!input.value) {
      list.textContent = 'Type to search for countries...';
    } else {
      // User is typing
      const value = encodeURIComponent(event.target.value.trim());
      list.textContent = 'Loading...';

      xhr.abort();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        xhr.open('GET', `https://restcountries.com/v2/name/${value}?fields=name`, true);
        xhr.send();
      }, 300);
    }
  });
&lt;/script&gt;
</Sandbox>

## Example: Dynamic

<Sandbox>
&lt;label&gt;
  Choose your email
  &lt;br /&gt;
  &lt;input type="text" id="my-dynamic-input" list="my-dynamic-list" /&gt;
&lt;/label&gt;
&lt;u-datalist id="my-dynamic-list"&gt;
  Type to choose email...
&lt;/u-datalist&gt;
&lt;script&gt;
  const input = document.getElementById('my-dynamic-input');

  input.addEventListener('input', (event) => {
    if (!event.inputType) return; // User clicked u-option
    const value = input.value.split('@')[0]
    const values = [
        \`${value}@live.com`,
        \`${value}@icloud.com`,
        \`${value}@hotmail.com`,
        \`${value}@gmail.com`
    ];

    if (!value) input.list.textContent = 'Type to choose email...';
    else input.list.replaceChildren(...values.map((text) =>
      Object.assign(document.createElement('u-option'), { text })
    ));
  });
&lt;/script&gt;
</Sandbox>

## Example: Link
<Sandbox>
&lt;label&gt;
  Open u-element documentation
  &lt;br /&gt;
  &lt;input type="text" id="my-link-input" list="my-link-list" /&gt;
&lt;/label&gt;
&lt;u-datalist id="my-link-list"&gt;
  &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-datalist"&gt;u-datalist&lt;/u-option&gt;
  &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-details"&gt;u-details&lt;/u-option&gt;
  &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-dialog"&gt;u-dialog&lt;/u-option&gt;
  &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-progress"&gt;u-progress&lt;/u-option&gt;
  &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-select"&gt;u-select&lt;/u-option&gt;
  &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-tabs"&gt;u-tabs&lt;/u-option&gt;
  &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-tags"&gt;u-tags&lt;/u-option&gt;
&lt;/u-datalist&gt;
&lt;script&gt;
  const input = document.getElementById('my-link-input');

  input.addEventListener('input', (event) => {
    if (!event.inputType) { // User clicked u-option
      window.location.href = input.value;
      input.value = ''; // Clear input
    }
  });
&lt;/script&gt;
</Sandbox>

## Accessibility

| Screen reader | `<datalist>` | `<u-datalist>` |
| --- | --- | --- |
| VoiceOver (Mac) + Chrome | :x: Does not announce option count | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: | :white_check_mark: |
| VoiceOver (Mac) + Firefox | :x: Does not announce option count  | :white_check_mark: |
| VoiceOver (Mac) + Safari | :x: Does not announce option count | :white_check_mark: |
| VoiceOver (iOS) + Chrome | :x: Does not announce options | :white_check_mark: |
| VoiceOver (iOS) + Safari | :x: Does not announce options | :white_check_mark: |
| Jaws (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Edge | :white_check_mark: | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Chrome | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Edge | :white_check_mark: | :white_check_mark: |
| Narrator (PC) + Firefox | :x: Does not show options | :white_check_mark: |
| TalkBack (Android) + Chrome | :white_check_mark: | :white_check_mark: |
| TalkBack (Android) + Firefox | :x: Does not show options | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :white_check_mark: | :white_check_mark: |

## Specifications

- DOM interface: [HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)
- HTML Standard: [The &lt;datalist&gt; element](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element)
- DOM interface: [HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement)
- HTML Standard: [The &lt;option&gt; element](https://html.spec.whatwg.org/multipage/form-elements.html#the-option-element)