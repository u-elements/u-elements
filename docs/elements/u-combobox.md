---
title: u-combobox
---
<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-combobox&gt;
`<u-combobox>` extends `<datalist>` with support for multiselect, separate label and programmatic value and clear button. While these features are [not yet](https://open-ui.org/components/combobox.explainer/) part of any official ARIA pattern or HTML element, `<u-combobox>` adhere closely to HTML conventions.

**Quick intro:**
- Use `<data>` as direct child elements - these are the removable items
- Use `<input>` as direct child and `<u-datalist>` to allow adding and suggesting items
- Use `data-multiple` to allow selecting multiple items
- Use `data-creatable` to allow creating items not in the list
- Use `--sr-*` CSS custom properties to translate screen reader texts
- Use matching `id` on `<input>` and `for` attribute on `<label>` to connect
- Optionally use `<select>` as child for `FormData` or form submission compatibility
- Optionally use `<button type="reset">` after `input` to create a clear button
- Optionally use `<button aria-expanded="false">` after `input` to create a toggle button
- Use `comboboxbeforeselect`, `comboboxafterselect` and `comboboxbeforematch` events to manipulate state
- **MDN Web Docs:** [&lt;data&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/data) ([HTMLDataElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)) / [&lt;input&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input) ([HTMLInputElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement)) / [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) ([HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)) / [&lt;option&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) ([HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement))


## Example

<Sandbox label="u-combobox code example" />
<pre hidden>
&lt;label for="my-input"&gt;
  Choose flavor of ice cream
&lt;/label&gt;
&lt;u-combobox data-multiple&gt;
  &lt;data&gt;Coconut&lt;/data&gt;
  &lt;data&gt;Banana&lt;/data&gt;
  &lt;data&gt;Pineapple&lt;/data&gt;
  &lt;data&gt;Orange&lt;/data&gt;
  &lt;input id="my-input" list="my-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden id="my-list" style="--sr-singular: '%d flavor'; --sr-plural: '%d flavours'"&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
    &lt;u-option&gt;Licorice&lt;/u-option&gt;
    &lt;u-option&gt;Pistachios&lt;/u-option&gt;
    &lt;u-option&gt;Mango&lt;/u-option&gt;
    &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Install <mark :data-badge="data['u-combobox']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-combobox
```

```bash [PNPM]
pnpm add -S @u-elements/u-combobox
```

```bash [Yarn]
yarn add @u-elements/u-combobox
```

```bash [Bun]
bun add -S @u-elements/u-combobox
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-combobox@latest/dist/u-combobox.js"></script>
```
:::

## Attributes and props

### `<u-combobox>`

- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `data-multiple` allows selecting multiple items
  - `data-creatable` allows creating items not in the list
- **Screen reader texts:** set through [`--sr-*` CSS custom properties](#screen-reader-texts)
- **DOM interface:** `UHTMLComboboxElement` extends [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
  - `UHTMLComboboxElement.control` returns `HTMLInputElement | null`
  - `UHTMLComboboxElement.items` returns `HTMLCollectionOf<HTMLDataElement>`
  - `UHTMLComboboxElement.list` returns `HTMLDataListElement | null`
  - `UHTMLComboboxElement.options` returns `HTMLCollectionOf<HTMLOptionElement>`
  - `UHTMLComboboxElement.values` returns `string[]` with `value` of each item

### `<data>`
- **Attributes:** [all global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) such as `id`, `class`, `data-`
  - `value` optionally specify the machine-readable translation of the text content.
- **DOM interface:** [`HTMLDataElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)
  - `HTMLDataElement.value` string reflecting the `value` HTML attribute.

## Events

In addition to the [usual events supported by HTML elements](https://developer.mozilla.org/en-US/docs/Web/API/Element#events), the `<u-combobox>` elements dispatches custom events allowing you to affect state:

### `comboboxbeforeselect`
```js
myCombobox.addEventListener('comboboxbeforeselect', (event) => {
  event.target // UHTMLComboboxElement
  event.detail // HTMLDataElement to add or remove
  event.detail.isConnected // true if removing, false if adding
  event.preventDefault() // Optionally prevent action
})
```

### `comboboxafterselect`
```js
myCombobox.addEventListener('comboboxafterselect', (event) => {
  event.target // UHTMLComboboxElement
  event.detail // HTMLDataElement added or removed
  event.detail.isConnected // false if removing, true if adding
})
```

### `comboboxbeforematch`
Dispatched on `Enter`, and in single mode also on blur, when the input has text and a datalist is present. Never dispatched while typing, when empty input or when missing datalist. Hidden and disabled options are not matched. Prevent the event and set `option.selected` on all options to change or reject match.

```js
myCombobox.addEventListener('comboboxbeforematch', (event) => {
  event.target // UHTMLComboboxElement
  event.detail // HTMLOptionElement | undefined match in option list
  // You can change match by looping options and setting option.selected:
  // for (const opt of event.target.options) opt.selected = your-condition-here;
})
```


## Styling

- `<u-combobox>` renders as `display: block`, while `<data>` renders as `display: inline-block` with a `::after` element to render the removal `×`.
- Customize or hide the removal `×` via `--x: ''` on `<u-combobox>`; don’t change CSS `content`, as this can break screen reader announcements
- Style the wrapper around `<data>`-elements can be styled using `::part(items)`.
- `<data>` elements uses a `::before` with `position: absolute` for screen reader announcements
- If `<button type="reset">` is empty, a `×` renders with `::before`
- If `<button aria-expanded="false"></button>` is empty, a `▼` renders with `::before`

### Screen reader texts

Screen reader texts are set through CSS custom properties. They inherit, so a translation can be set once for a page or a language, i.e. `:lang(nb) { --sr-clear: "Tøm" }`.

- `--sr-added` prefixes announcements about additions. Defaults to `"Added"`
- `--sr-removed` prefixes announcements about removals. Defaults to `"Removed"`
- `--sr-remove` announces ability to remove. Defaults to `"Press to remove"`
- `--sr-empty` announces no selected items. Defaults to `"No selected"`
- `--sr-found` announces where to find amount of selected items. Defaults to `"Navigate left to find %d selected"`
- `--sr-invalid` announces if trying to select invalid value. Defaults to `"Invalid value"`
- `--sr-items` aria-label for listbox containing selected items. Defaults to `"Selected"`
- `--sr-clear` name of clear button. Defaults to `"Clear input"`
- `--sr-toggle` name of toggle list button. Defaults to `"Options"`
- `--sr-singular` and `--sr-plural` announce hits, see [`<u-datalist>`](./u-datalist#attributes-and-props)

::: tip Note:
If you are using a strict Content Security Policy (CSP), inline `style` HTML attributes are blocked. Set the properties in your CSS, or through `element.style.setProperty('--sr-clear', '"New string"')` (note that the string must be quoted) or a framework `style` binding.
:::

## Example: Norwegian

<Sandbox label="u-details language example" lang="no" />
<pre hidden>
&lt;label for="my-norwegian-input"&gt;
  Velg type iskrem
&lt;/label&gt;
&lt;u-combobox id="my-norwegian"&gt;
  &lt;data&gt;Kokkos&lt;/data&gt;
  &lt;input id="my-norwegian-input" list="my-norwegian-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden id="my-norwegian-list"&gt;
    &lt;u-option&gt;Kokkos&lt;/u-option&gt;
    &lt;u-option&gt;Jordbær&lt;/u-option&gt;
    &lt;u-option&gt;Sjokolade&lt;/u-option&gt;
    &lt;u-option&gt;Vanilje&lt;/u-option&gt;
    &lt;u-option&gt;Lakris&lt;/u-option&gt;
    &lt;u-option&gt;Pistasj&lt;/u-option&gt;
    &lt;u-option&gt;Mango&lt;/u-option&gt;
    &lt;u-option&gt;Hasselnøtt&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;style&gt;
  /* Screen reader texts inherit, so they also apply to the u-datalist inside. Set them on :root or :lang() to translate a whole page */
  #my-norwegian {
    --sr-added: "La til";
    --sr-clear: "Fjern tekst";
    --sr-empty: "Ingen valgte";
    --sr-found: "Naviger til venstre for å finne %d valgte";
    --sr-invalid: "Ugyldig verdi";
    --sr-items: "Valgte";
    --sr-plural: "%d smaker";
    --sr-remove: "Trykk for å fjerne";
    --sr-removed: "Fjernet";
    --sr-singular: "%d smak";
    --sr-toggle: "Valg";
  }
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Example: Custom matching

<Sandbox label="u-details language example" lang="no" />
<pre hidden>
&lt;label for="my-matching-input"&gt;
  Matches from start of word
&lt;/label&gt;
&lt;br&gt;
&lt;small&gt;Try typing "c" and hitting "Enter"&lt;/small&gt;
&lt;u-combobox id="my-matching-combobox"&gt;
  &lt;input id="my-matching-input" list="my-matching-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist id="my-matching-list"&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;script type="module"&gt;
  const combobox = document.getElementById('my-matching-combobox');
  combobox.addEventListener('comboboxbeforematch', (event) => {
    event.preventDefault();
    const input = combobox.control;
    const query = input.value.toLowerCase().trim();

    for(const opt of input.list.options) {
      opt.selected = !!query && opt.label.toLowerCase().trim().startsWith(query);
    }
  });
&lt;/script&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Example: Custom filtering

Notice: `<u-datalist>` has `data-nofilter` to allow custom filtering

<Sandbox label="u-details language example" lang="no" />
<pre hidden>
&lt;label for="my-filtering-input"&gt;
  Filters case sensitive
&lt;/label&gt;
&lt;br&gt;
&lt;small&gt;Try typing "v" versus "V"&lt;/small&gt;
&lt;u-combobox id="my-filtering-combobox"&gt;
  &lt;input id="my-filtering-input" list="my-filtering-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden data-nofilter id="my-filtering-list"&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;script type="module"&gt;
  const combobox = document.getElementById('my-filtering-combobox');
  combobox.addEventListener('input', (event) => {
    event.preventDefault();
    const input = combobox.control;
    const query = input.value.trim();

    for(const opt of input.list.options) {
      opt.hidden = !!query && !opt.label.trim().includes(query);
    }
  });
&lt;/script&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Example: API results

<Sandbox label="u-details api example" lang="no" />
<pre hidden>
&lt;label for="my-api-input"&gt;
  Search for a recipe
&lt;/label&gt;
&lt;u-combobox id="my-api-combobox"&gt;
  &lt;input id="my-api-input" list="my-api-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden id="my-api-list" data-nofilter&gt;
    &lt;u-option value=""&gt;Type to search...&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;script type="module"&gt;
  const combobox = document.getElementById('my-api-combobox');
  const xhr = new XMLHttpRequest(); // Easy to abort
  let debounceTimer; // Debounce so we do not spam API

  // Same handler every time
  xhr.addEventListener('load', () => {
    const list = combobox.control.list;
    try {
      list.replaceChildren(...JSON.parse(xhr.responseText).recipes.map((recipe) => {
        const option = document.createElement('u-option');
        option.text = recipe.name;
        return option;
      }));
    } catch (err) {
      list.innerHTML = '&lt;u-option value=""&gt;No results&lt;/u-option&gt;';
    }
  });

  combobox.addEventListener('input', (event) =&gt; {
    const { list, value } = combobox.control;
    const query = encodeURIComponent(value.trim());
    list.innerHTML = query ? '&lt;u-option value=""&gt;Loading&lt;/u-option&gt;' : '';
    
    xhr.abort();
    clearTimeout(debounceTimer);

    if (query) {
      debounceTimer = setTimeout(() => {
        xhr.open('GET', `https://dummyjson.com/recipes/search?q=${query}`, true);
        xhr.send();
      }, 600);
    } 
  });
&lt;/script&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Example: Only filter during typing

<Sandbox label="u-details typing example" lang="no" />
<pre hidden>
&lt;label for="my-typing-input"&gt;
  All results will be visible on load and after selection:
&lt;/label&gt;
&lt;u-combobox id="my-typing-combobox"&gt;
  &lt;input id="my-typing-input" list="my-typing-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden id="my-typing-list" data-nofilter&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;script type="module"&gt;
  const combobox = document.getElementById('my-typing-combobox');

  combobox.addEventListener('input', (event) =&gt; {
    // Only user can cause trusted typing events
    combobox.list.toggleAttribute('data-nofilter', !event.isTrusted);
  });
&lt;/script&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Example: Creatable

<Sandbox label="u-details creatable example" lang="no" />
<pre hidden>
&lt;label for="my-creatable-input"&gt;
  Type a new item:
&lt;/label&gt;
&lt;u-combobox id="my-creatable-combobox" data-creatable data-multiple&gt;
  &lt;input id="my-creatable-input" list="my-creatable-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden id="my-creatable-list"&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-datalist"&gt;u-datalist&lt;/u-option&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-progress"&gt;u-progress&lt;/u-option&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-details"&gt;u-details&lt;/u-option&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-combobox"&gt;u-combobox&lt;/u-option&gt;
    &lt;u-option value=""&gt;&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;script type="module"&gt;
  const combobox = document.getElementById('my-creatable-combobox');
  const handleAddButton = () =&gt; {
    const value = combobox.control.value.trim();
    const options = combobox.list.options;
    const add = options[options.length - 1];
    add.hidden = !value || combobox.values.includes(value);
    add.value = value;
    add.label = value;
    add.textContent = `Add "${value}"`
  };

  combobox.addEventListener('comboboxafterselect', handleAddButton);
  combobox.addEventListener('input', handleAddButton);
&lt;/script&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Example: Links

<Sandbox label="u-details link example" lang="no" />
<pre hidden>
&lt;label for="my-link-input"&gt;
  Click on a result:
&lt;/label&gt;
&lt;u-combobox id="my-link-combobox"&gt;
  &lt;input id="my-link-input" list="my-link-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden id="my-link-list"&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-datalist"&gt;u-datalist&lt;/u-option&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-progress"&gt;u-progress&lt;/u-option&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-details"&gt;u-details&lt;/u-option&gt;
    &lt;u-option value="https://u-elements.github.io/u-elements/elements/u-combobox"&gt;u-combobox&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;script type="module"&gt;
  const combobox = document.getElementById('my-link-combobox');

  combobox.addEventListener('click', (event) =&gt; {
    const { ctrlKey, metaKey, target } = event;
    const option = target instanceof Element && target.closest('u-option');

    if (option) {
      event.preventDefault(); // Prevent filling input
      if (ctrlKey || metaKey) window.open(option.value);
      else window.location.href = option.value;
    }
  });
&lt;/script&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>

## Example: React controlled render

`u-combobox` adds and removes `<data>` elements, which can be confusing for frameworks such as React.
If you encounter issues, it’s recommended to call `event.preventDefault()` inside the `comboboxbeforeselect` handler, 
and then manually add or remove `<data>` elements as needed:

<script>
// Fake store for controlled example
if (typeof window !== 'undefined') {
  window.values = [];
  window.useState = (values) => [window.values, (values) => {
    const { items, control } = document.getElementById('my-controlled-combobox');
    const add = values.find((item) => !window.values.includes(item));
    const remove = window.values.findIndex((item) => !values.includes(item));

    if (add) control.insertAdjacentElement('beforebegin', Object.assign(document.createElement('data'), { value: add.value, textContent: add.label }))
    else items[remove]?.remove();
    window.values.length = 0; // Empty
    window.values.push(...values);
  }]
}
</script>
<Sandbox label="u-details controlled example" lang="no" />
<pre hidden>
&lt;label for="my-controlled-input"&gt;
  Controlled render:
&lt;/label&gt;
&lt;u-combobox id="my-controlled-combobox" data-multiple&gt;
  &lt;!--
    Your framework rendering here, i.e. React:
    {values.map(({ value, label }) => (
      &lt;data key={value} value={value}&gt;
        {label}
      &lt;/data&gt;
    ))}
  --&gt;
  &lt;input id="my-controlled-input" list="my-controlled-list" /&gt;
  &lt;button type="button" aria-expanded="false"&gt;&lt;/button&gt;
  &lt;button type="reset"&gt;&lt;/button&gt;
  &lt;u-datalist hidden id="my-controlled-list"&gt;
    &lt;u-option&gt;Coconut&lt;/u-option&gt;
    &lt;u-option&gt;Strawberries&lt;/u-option&gt;
    &lt;u-option&gt;Chocolate&lt;/u-option&gt;
    &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;/u-datalist&gt;
&lt;/u-combobox&gt;
&lt;script type="module"&gt;
  const combobox = document.getElementById('my-controlled-combobox');
  const [values, setValues] = useState([]);

  combobox.addEventListener('comboboxbeforeselect', (event) =&gt; {
    event.preventDefault(); // Stops u-combobox
    const data = event.detail;
    const label = data.textContent;
    const value = data.value;
    const isAdd = !data.isConnected;

    // Add/remove:
    if (isAdd) setValues([...values, { label, value }]);
    else setValues(values.filter((item) => item.value !== value));
  });
&lt;/script&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-combobox { border: 1px solid; display: flex; flex-wrap: wrap; gap: .5em; padding: .5em; position: relative }
  u-option[selected] { font-weight: bold }
  u-datalist { position: absolute; z-index: 9; inset: 100% -1px auto; border: 1px solid; background: white; padding: .5em }
&lt;/style&gt;
</pre>


## Accessibility

| Screen reader | `<u-combobox>` |
| --- | --- |
| VoiceOver (Mac) + Chrome | :white_check_mark: |
| VoiceOver (Mac) + Edge | :white_check_mark: |
| VoiceOver (Mac) + Firefox  | :white_check_mark: |
| VoiceOver (Mac) + Safari | :white_check_mark: |
| VoiceOver (iOS) + Safari | :white_check_mark: |
| Jaws (PC) + Chrome | :white_check_mark: |
| Jaws (PC) + Edge | :white_check_mark: |
| Jaws (PC) + Firefox | :white_check_mark: |
| NVDA (PC) + Chrome | :white_check_mark: |
| NVDA (PC) + Edge | :white_check_mark: |
| NVDA (PC) + Firefox | :white_check_mark: needs focus mode to announce item removal |
| Narrator (PC) + Chrome | :warning: Needs "scanning off" mode |
| Narrator (PC) + Edge | :warning: Needs "scanning off" mode |
| Narrator (PC) + Firefox | :warning: Needs "scanning off" mode |
| TalkBack (Android) + Chrome | :white_check_mark: |
| TalkBack (Android) + Firefox | :white_check_mark: |
| TalkBack (Android) + Samsung Internet | :white_check_mark: |

## Specifications

- DOM interface: [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
- HTML Standard: [The &lt;div&gt; element](https://html.spec.whatwg.org/multipage/grouping-content.html#the-div-element)
- DOM interface: [HTMLDataElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement)
- HTML Standard: [The &lt;data&gt; element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-data-element)

## Server side rendering
You can server side render `<u-combobox>` by using [Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom).
Styling and markup needed is exported as `UHTMLComboboxShadowRoot`. Example:

 ```TS
import { UHTMLComboboxShadowRoot } from '@u-elements/u-combobox';
import { UHTMLDataListShadowRoot } from '@u-elements/u-datalist';

const renderToStaticMarkup = (data: string, options: string) =>
  `<label for="my-ssr-input">Server side rendered</label>
  <u-combobox>
    ${UHTMLComboboxShadowRoot}
    ${data}
    <input id="my-ssr-input" />
    <u-datalist>
      ${UHTMLDataListShadowRoot}
      ${options}
    </u-datalist>
  </u-combobox>`
```

## Notes
- `<datalist>` or `<u-datalist>` must be a child of `<u-combobox>`. The `list` attribute on `<input>` is managed automatically
- Without a datalist, single mode is free text: the input is never overwritten, blur does nothing, and `Enter` only creates an item when `data-creatable` is set. The item is removed through the clear button
- Single mode acts on the first `<data>` only
- The toggle button is hidden when using native `<datalist>`, as the native suggestion popup can not be detected programmatically
- In controlled mode, `change` is dispatched by the input sync that follows the `<data>` change. A deferred render (i.e. React `startTransition`, a debounced state update) still dispatches `change` when it renders the item the user picked or matched. On blur, the input shows the previous item until the deferred render lands, as a prevented match can not be told apart from a deferred one
- ARC Toolkit incorrectly reports `aria-description` as an invalid ARIA-attribute
- ARC Toolkit does not correctly read the relation between items with `role="option"` and the ShadowDOM wrapping container `role="listbox"`
- See full behavior spec in [u-combobox source](https://github.com/u-elements/u-elements/blob/main/packages/u-combobox/u-combobox.ts)

## Changelog

- **3.0.0:** Framework compatibility and matching changes
  - **How to upgrade:**
    - Update `@u-elements/u-datalist` to 3.0.0 or newer
    - Ensure `<input>` a direct child of `<u-combobox>`
    - Ensure clear button is a `<button type="reset"></button>`
    - Replace `data-sr-*` attributes with [`--sr-*` CSS custom properties](#screen-reader-texts)
    - Remove `comboboxprogrammaticinput` listeners - the event is removed
  - **Single mode:**
    - **Important:** No longer matches while typing, only on `Enter` and blur
    - `Enter` no longer reverts text on match; text is kept until blur
    - `input.value` is only synced to the `<data>` if a datalist is present
    - `values` returns at most one value, matching the mirrored `<data>`
    - Mirrors only the first `<data>` into `<select>`, so submitted value matches the input
  - **Multiple mode:**
    - `Enter` only adds. A matched option that is already an item is kept, as removal is intended through a pick or an explicit item removal
  - **Changes in both single and multiple mode:**
    - Better support for async rendering and events in frameworks
    - Better performance when frameworks syncs attributes
    - `change` is only dispatched when the input sync follows a user commit (option pick, `Enter`, blur, clear or item removal), never on mount, programmatic `<data>` changes or form reset, aligning with  conventions from other native elements
    - `Enter` match on `keyup` instead of `keydown` to support native datalist in Safari
    - `form.reset()` syncs the clear and toggle buttons
    - Toggle button is hidden when the input is `disabled` or `readonly`
    - Firefox spell check and autofill are not seen as option-picks
    - Synthetic `InputEvent` (i.e. testing-library) does not cause incorrect option click
    - Framework typings for Qwik 1, Qwik 2 and Preact 11 uses `HTMLElementTagNameMap`
- **2.1.5:** Fix state handling when mode is multiple and controlled (i.e. React)
- **2.1.4:** Fix internal state when preventing a selection or setting value programmatically
- **2.1.3:** Fix issue where item behind datalist could receive focus
- **2.1.2:** Prevent unnecessary matching after option `click` in single mode
- **2.1.1:** Fix support for rendering without datalist
- **2.1.0:** Add support for toggle button and prevent horizontal scroll on items
- **2.0.5:** Fix issue where VoiceOver is confused by display: contents on selected listbox
- **2.0.4:** Fix issue when moving focus between multiple u-combobox inputs
- **2.0.3:** Use document.activeElement instead of .matches(":focus-within") for JSDOM testing compatibility
- **2.0.2:** Respect existing aria-label on clear button
- **2.0.1:** Fix single mode value sync for React users
- **2.0.0:** Plays nice with strict CSP and with axe tests, and uses `u-datalist@2.0.0`
- **1.0.7:** Fixes so display: flex on u-combobox renders as expected
- **1.0.6:** Fixes FormsMode compatibility for JAWS and NVDA
- **1.0.5:** Allow clicks even when `ctrlKey`, `altKey` or `shiftKey`
- **1.0.4:** Prevent focus trap on Safari caused by `tabindex="-1"` on `<del>`
- **1.0.3:** Let `Delete` key do native text deletion instead of chip removal
- **1.0.2:** Fix sync issue when single mode and deleting `<data>` element
- **1.0.1:** Support setting `aria-label` on input and enable declarative shadow root support and export `UHTMLComboboxShadowRoot` for easier server side rendering
- **1.0.0:** Renamed events to avoid conflict with native events:
 - `afterchange` => `comboboxafterselect`
 - `beforechange` => `comboboxbeforeselect`
 - `beforematch` => `comboboxbeforematch`
- **0.0.20:** Clean up unused comma from `aria-label` when single mode
- **0.0.19:** Respects input `disabled` and `readonly` and moves caret to end of text on `arrow up`
- **0.0.18:** Input value is now reverted instead of cleared when no match on blur/enter
- **0.0.17:** Input now gets new `list` attribute `id` of `datalist` changes
- **0.0.15:** Sync input value when data-elements change and only trigger `beforechange` and `afterchange` on click, enter or blur, but not while typing in single mode
- **0.0.14:** Fix issue where removing single element programmatically caused focus
- **0.0.13:** Update sync state when options are changed
- **0.0.12:** Always sync `<del>` with input value on mount
- **0.0.11:** Improved performance
- **0.0.10:** Only remove `<data>` during change event for React compatiliby
- **0.0.9:** Improve browser compatibility by avoiding `toggleAttribute`
- **0.0.8:** Avoid hiding `<del>` when clicking option without `value`
- **0.0.7:** Add support for `<del>` element to clear the input
- **0.0.6:** Ensure correct value of hidden `<select>`
- **0.0.5:** Prevent `input` value change when `beforechange` is prevented
- **0.0.4:** Bugfix
- **0.0.3:** Prevent add if `u-option` has empty value attribute
- **0.0.2:** Reset value when clicking option in multiple mode
- **0.0.1:** Support async `u-option` initialization
- **0.0.0:** Beta release