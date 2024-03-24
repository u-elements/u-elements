# <del>&lt;u-dialog&gt;</del> <mark data-badge="html"></mark>
There is no longer need for `<u-dialog>` :tada:
Native [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) now has sufficient support
in all major browsers and screen readers.

**Quick intro:**
- Use `<dialog>` to create a modal or non-modal dialog box
- **MDN Web Docs:** [&lt;dialog&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)

## Example
<Sandbox>
&lt;button type="button" onclick="this.nextElementSibling.showModal()"&gt;
  Open dialog
&lt;/button&gt;
&lt;dialog&gt;
  &lt;p&gt;Greetings, one and all!&lt;/p&gt;
  &lt;form method="dialog"&gt;
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

## Accessibility

Note that older versions of Firefox may erroneously permit the screen reader focus to move out of the `<dialog>` element. However, this does not justify the creation of a `<u-dialog>`, as screen reader focus isn't detectable via JavaScript and thus cannot be controlled or prevented through JavaScript either.

## Specifications

- DOM interface: [HTMLDialogElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement)
- HTML Standard: [The &lt;dialog&gt; element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)