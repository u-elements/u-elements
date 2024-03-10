# <del>&lt;u-dialog&gt;</del> <mark data-badge="html"></mark>
There is no longer need for `<u-dialog>` :tada:
<br />[Native `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) now has sufficient screen reader 
<br />support in all major browsers and screen readers.

**Quick intro:**
- Use `<dialog>` to create a modal or non-modal dialog box
- **MDN Web Docs:** [&lt;dialog&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)

## Example
<Sandbox>
&lt;button type=&quot;button&quot; onclick=&quot;this.nextElementSibling.showModal()&quot;&gt;
  Open dialog
&lt;/button&gt;
&lt;dialog&gt;
  &lt;p&gt;Greetings, one and all!&lt;/p&gt;
  &lt;form method=&quot;dialog&quot;&gt;
    &lt;button&gt;OK&lt;/button&gt;
  &lt;/form&gt;
&lt;/dialog&gt;
</Sandbox>

## Install <mark data-badge="0 KB"></mark>

Nothing to install :tada:

## Attributes

| Attributes `<dialog>` | Description |  Default |
| - | - | - |
| [Global HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes) | Such as `id`, `class`, `data-`, `aria-`, etc. ||
| `open` | When the `open` attribute is present, the dialog is shown. By default this attribute is absent which means the dialog is hidden. **Note:** It `open` makes the dialog non-modal, so is instead recommended to use the `.show()` or `.showModal()` for greater control. | Not present |

## Specifications

- DOM interface: [HTMLDialogElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement)
- HTML Standard: [The &lt;dialog&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)