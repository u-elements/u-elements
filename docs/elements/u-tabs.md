# &lt;u-tabs&gt; <mark data-badge="wcag"></mark>
Documentation coming

**Quick intro:**
- **ARIA Authoring Practices Guide Docs:** [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

## Example
<Sandbox>
&lt;style&gt;
  u-tab { padding: .5em }
  u-tab[aria-selected=&quot;true&quot;] { border-bottom: 4px solid }
  u-tabpanel { padding: 1em; border: 1px solid }
&lt;/style&gt;
&lt;u-tabs&gt;
  &lt;u-tablist&gt;
    &lt;u-tab&gt;Tab 1&lt;/u-tab&gt;
    &lt;u-tab&gt;Tab 2&lt;/u-tab&gt;
    &lt;u-tab&gt;Tab 3&lt;/u-tab&gt;
  &lt;/u-tablist&gt;
  &lt;u-tabpanel&gt;Panel 1&lt;/u-tabpanel&gt;
  &lt;u-tabpanel&gt;Panel 2&lt;/u-tabpanel&gt;
  &lt;u-tabpanel&gt;Panel 3&lt;/u-tabpanel&gt;
&lt;/u-tabs&gt;
</Sandbox>
