# &lt;u-dialog&gt;
No longer needed - [native HTML5 `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) has sufficient support by all major screen readers :tada:

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
