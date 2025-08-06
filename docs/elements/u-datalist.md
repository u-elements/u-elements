---
title: u-datalist
---
<script setup>
import { data } from '../filesize.data.ts'
</script>
<style>
  .demo-view input { display: block }
</style>

# &lt;u-datalist&gt; <mark data-badge="HTML"></mark>
`<u-datalist>` lets you suggest values to a connected `<input>`. You can use it to make things like comboboxes, autosuggest, autocomplete, live search results, etc.

**Quick intro:**
- Use `<u-option>` as direct child elements - these will show the suggestions while typing
- Use matching `id` on `<u-datalist>` and `list` attribute on `<input>` to connect
- Use `data-nofilter` to [prevent filtering](https://github.com/whatwg/html/issues/4882)
- Use `data-*` attributes to translate screen reader announcements
- Use `popover` attribute to activate [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- **Want to show suggestions from a data source?** [See u-combobox &rarr;](/elements/u-combobox)
- **MDN Web Docs:** [&lt;datalist&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) ([HTMLDatalistElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDatalistElement)) / [&lt;option&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option) ([HTMLOptionElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement))

## Example

<Sandbox label="u-datalist code example" />
<pre hidden>
&lt;label for="my-input"&gt;
  Choose flavor of ice cream
&lt;/label&gt;
&lt;input id="my-input" list="my-list" /&gt;
&lt;u-datalist id="my-list" data-sr-singular="%d flavor" data-sr-plural="%d flavours"&gt;
  &lt;u-option&gt;Coconut&lt;/u-option&gt;
  &lt;u-option&gt;Strawberries&lt;/u-option&gt;
  &lt;u-option&gt;Chocolate&lt;/u-option&gt;
  &lt;u-option&gt;Vanilla&lt;/u-option&gt;
  &lt;u-option&gt;Licorice&lt;/u-option&gt;
  &lt;u-option&gt;Pistachios&lt;/u-option&gt;
  &lt;u-option&gt;Mango&lt;/u-option&gt;
  &lt;u-option&gt;Hazelnut&lt;/u-option&gt;
&lt;/u-datalist&gt;
&lt;style&gt;
  /* Styling just for example: */
  u-option[selected] { font-weight: bold }
&lt;/style&gt;
</pre>

## Install <mark :data-badge="data['u-datalist']"></mark>

::: code-group

```bash [NPM]
npm add -S @u-elements/u-datalist
```

```bash [PNPM]
pnpm add -S @u-elements/u-datalist
```

```bash [Yarn]
yarn add @u-elements/u-datalist
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
  - Screen reader attributes required to meet [WCAG §4.1.3](https://www.w3.org/TR/WCAG21/#status-messages): 
    - `data-sr-singular="%d hit"` announces single hit
    - `data-sr-plural="%d hits"` announces multiple hits
    - ***Note:** If `<u-datalist>` has no options, visible text will be announced instead (i.e. No results)*
- **DOM interface:** [`HTMLDataListElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataListElement)
  - `HTMLDataListElement.options` returns `HTMLCollectionOf<HTMLOptionElement>`. However, note that there is inconsistency between Firefox and other browsers, regarding whether `disabled` options are included or not. To ensure access to all options, consider using `.children` instead.

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
While `<u-datalist>` support all events, *native* datalist does not as it is rendered as part of the browser UI. Therefore, it's recommended to avoid binding events to `<u-datalist>` or `<u-option>` if you want to ensure native compatibility and future seamless opt-out.

If you need to detect click on options or require a more fine-grained API — including `comboboxbeforeselect` and `comboboxafterselect` events — we recommend using [`<u-combobox>`](/elements/u-combobox), which extends `<u-datalist>` with [several useful features →](/elements/u-combobox)

## Styling

While `<u-datalist>` and `<u-option>` are styleable, *native* datalist and option elements are currently not. However, there is a possibility that the [native elements may support styling in the future](https://open-ui.org/components/customizableselect/#rich-content-in-options).

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

## Example: Styling
<Sandbox label="u-datalist position example" />
<pre hidden>
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
&lt;label for="my-styling-input"&gt;
  Choose flavor of ice cream
  &lt;input type="text" id="my-styling-input" class="my-input" list="my-styling" /&gt;
&lt;/label&gt;
&lt;u-datalist class="my-list" id="my-styling" data-sr-singular="%d flavor" data-sr-plural="%d flavours"&gt;
  &lt;u-option&gt;Coconut&lt;/u-option&gt;
  &lt;u-option&gt;Strawberries&lt;/u-option&gt;
  &lt;u-option&gt;Chocolate&lt;/u-option&gt;
  &lt;u-option&gt;Vanilla&lt;/u-option&gt;
&lt;/u-datalist&gt;
&lt;p&gt;
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus tristique tellus massa, eget sollicitudin arcu luctus vel. Cras non purus accumsan, ultricies mi ut, blandit magna.
&lt;/p&gt;
</pre>

## Example: Popover
Using [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) allows datalist to automatically render on [top layer](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer) and cross boundries of scroll containers. Keep in mind that you're responsible for styling and positioning the datalist, just as you would with any other element using `popover`.
<Sandbox label="u-datalist position example" />
<pre hidden>
&lt;label for="my-popover-input"&gt;
  Choose flavor of ice cream
  &lt;input type="text" id="my-popover-input" list="my-popover" /&gt;
&lt;/label&gt;
&lt;u-datalist popover id="my-popover" data-sr-singular="%d flavor" data-sr-plural="%d flavours"&gt;
  &lt;u-option&gt;Coconut&lt;/u-option&gt;
  &lt;u-option&gt;Strawberries&lt;/u-option&gt;
  &lt;u-option&gt;Chocolate&lt;/u-option&gt;
  &lt;u-option&gt;Vanilla&lt;/u-option&gt;
&lt;/u-datalist&gt;
</pre>


## Example: Dynamic

<Sandbox label="u-datalist dynamic example" />
<pre hidden>
&lt;label for="my-dynamic-input"&gt;Choose your email&lt;/label&gt;
&lt;input type="text" id="my-dynamic-input" list="my-dynamic-list" placeholder="Type email..." /&gt;
&lt;u-datalist id="my-dynamic-list" data-nofilter data-sr-singular="%d suggestion" data-sr-plural="%d suggestions"&gt;
&lt;/u-datalist&gt;
&lt;script type="module"&gt;
  const input = document.getElementById('my-dynamic-input');

  input.addEventListener('input', (event) => {
    const value = input.value.split("@")[0].trim();
    const values = [
      `${value}@live.com`,
      `${value}@icloud.com`,
      `${value}@hotmail.com`,
      `${value}@gmail.com`,
    ];

    input.list.textContent = '';
    if (value)
      input.list?.append(...values.map((text) =>
        Object.assign(document.createElement("u-option"), { text }))
      );
  });
&lt;/script&gt;
</pre>

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

## Changelog

- **1.0.13:** Prevent opening if `inputmode="none"`
- **1.0.12:** Prevent ESC from closing `dialog` when datalist is open
- **1.0.11:** Respects input `disabled` and `readonly` and moves caret to end of text on `arrow up`
- **1.0.10:** Automatically update `popovertarget` and `aria-controls` of input when `id` of datalist changes
- **1.0.9:** Fix issue when mousedown inside, but mouseup outside datalist prevented blur events
- **1.0.8:** Only accept `aria-hidden="true"`, `hidden` or `disabled` to hide options for improved performance
- **1.0.7:** Performance optimize by grouping read and write operations
- **1.0.6:** Prevent announce hits count if closed
- **1.0.5:** Improved support for nested DOM and CSS-hiding `options`
- **1.0.4:** Improved `Android` compatibility by not relying on focus events
- **1.0.3:** Improved `JSDOM` compatibility by not assigning `view` in `FocusEvent`
- **1.0.2:** Fix error when consumer removes `<input>` element during `input` event
- **1.0.1:** Improved `popover` compatibility
- **1.0.0:**
  - Removed support for `isDatalistClick`, `syncDatalistState` and `getDatalistValue`
  - Added support for [`data-nofilter`](https://github.com/whatwg/html/issues/4882)
  - Fixed bug where VoiceOver + Safari announced incorrect amount of list items
  - Improved support for changes in `disabled`, `hidden`, `label` and `value` attributes
  - Improved `popover` support