<script setup>
import { data } from '../filesize.data.ts'
</script>

# &lt;u-details&gt; <mark data-badge="html5"></mark>
`<u-details>` lets you open and close content when clicking on a child `<u-summary>` element.
You can use it to make things like accordions, expandables, FAQs, dropdowns, etc.

**Quick intro:**
- Use `<u-summary>` as first child - this becomes the label
- Use <abbr aria-description="Native &lt;details&gt; does not have this requirement, but screen readers needs to know what element the &lt;u-summary&gt; is controlling">any HTML element as second child</abbr> - this becomes the content to hide and show
- Use the `open` attribute on `<u-details>` to change state
- **MDN Web Docs:** [&lt;details&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details),
[&lt;summary&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary)

## Example
<Sandbox>
&lt;u-details&gt;
  &lt;u-summary&gt;Details&lt;/u-summary&gt;
  &lt;div&gt;
    Something small enough to escape casual notice.
  &lt;/div&gt;
&lt;/u-details&gt;
</Sandbox>

## Install <mark :data-badge="data['u-details']"></mark>

::: code-group

```bash [NPM]
npm add -D @u-elements/u-details
```

```bash [PNPM]
pnpm add -D @u-elements/u-details
```

```bash [Yarn]
yarn add -D @u-elements/u-details
```

```bash [Bun]
bun add -D @u-elements/u-details
```

```html [CDN]
<script type="module" src="https://unpkg.com/@u-elements/u-details@latest/dist/index.js"></script>
```

:::

## Attributes

This element includes the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes)

- `open`: This Boolean attribute indicates whether the details — that is, the contents of the `<u-details>` element — are currently visible. The details are shown when this attribute exists, or hidden when this attribute is absent. By default this attribute is absent which means the details are not visible.

    > **Note:** You have to remove this attribute entirely to make the details hidden. `open="false"` makes the details visible because this attribute is Boolean.

## Events

In addition to the usual events supported by HTML elements, the `<u-details>` element supports the `toggle` event, which is dispatched to the `<u-details>` element whenever its state changes between open and closed. It is sent _after_ the state is changed, although if the state changes multiple times before the browser can dispatch the event, the events are coalesced so that only one is sent.

You can use an event listener for the `toggle` event to detect when the widget changes state:

```js
details.addEventListener("toggle", (event) => {
  if (details.open) {
    /* the element was toggled open */
  } else {
    /* the element was toggled closed */
  }
});
```

## Styling

### Creating an open disclosure box

To start the `<u-details>` box in its open state, add the Boolean `open` attribute:

```html
<u-details open>
  <u-summary>System Requirements</u-summary>
  <p>
    Requires a computer running an operating system. The computer must have some
    memory and ideally some kind of long-term storage. An input device as well
    as some form of output device is recommended.
  </p>
</u-details>
```

#### Result

### Customizing the appearance

Now let's apply some CSS to customize the appearance of the disclosure box.

#### CSS

```css
details {
  font: 16px "Open Sans", Calibri, sans-serif;
  width: 620px;
}

details > summary {
  padding: 2px 6px;
  width: 15em;
  background-color: #ddd;
  border: none;
  box-shadow: 3px 3px 4px black;
  cursor: pointer;
}

details > p {
  border-radius: 0 0 10px 10px;
  background-color: #ddd;
  padding: 2px 6px;
  margin: 0;
  box-shadow: 3px 3px 4px black;
}

details[open] > summary {
  background-color: #ccf;
}
```

This CSS creates a look similar to a tabbed interface, where clicking the tab opens it to reveal its contents.

The selector `details[open]` can be used to style the element which is open.

#### HTML

```html
<u-details>
  <u-summary>System Requirements</u-summary>
  <p>
    Requires a computer running an operating system. The computer must have some
    memory and ideally some kind of long-term storage. An input device as well
    as some form of output device is recommended.
  </p>
</u-details>
```

#### Result

### Customizing the disclosure widget

The disclosure triangle itself can be customized, although this is not as broadly supported. There are variations in how browsers support this customization due to experimental implementations as the element was standardized, so we'll have to use multiple approaches for a while.

The `<u-summary>` element supports the `list-style` shorthand property and its longhand properties, such as `list-style-type`, to change the disclosure triangle to whatever you choose (usually with `list-style-image`). For example, we can remove the disclosure widget icon by setting `list-style: none`.

#### CSS

```css
details {
  font: 16px "Open Sans", Calibri, sans-serif;
  width: 620px;
}

details > summary {
  padding: 2px 6px;
  width: 15em;
  background-color: #ddd;
  border: none;
  box-shadow: 3px 3px 4px black;
  cursor: pointer;
  list-style: none;
}

details > p {
  border-radius: 0 0 10px 10px;
  background-color: #ddd;
  padding: 2px 6px;
  margin: 0;
  box-shadow: 3px 3px 4px black;
}
```

This CSS creates a look similar to a tabbed interface, where activating the tab expands and opens it to reveal its contents.

#### HTML

```html
<u-details>
  <u-summary>System Requirements</u-summary>
  <p>
    Requires a computer running an operating system. The computer must have some
    memory and ideally some kind of long-term storage. An input device as well
    as some form of output device is recommended.
  </p>
</u-details>
```

#### Result


## See also

- DOM interface: [HTMLDetailsElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
- Specifications: [HTML Standard: the-details-element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)