# Why u-elements

> <!-- Used to hide first <p> -->

In the early days of web development, crafting a website was like navigating a minefield of browser inconsistencies. With poor debugging tools and documentation, developers spent considerable time testing and tweaking their code just to make it work everywhere.

Thankfully, as the web evolved, so did our tools and practices. Today, browsers mostly adhere to web standards and their [feature support is well documented](https://caniuse.com/).

However, one challenge often goes unnoticed; while browser development has accelerated, the landscape of assistive technology moves at a different pace. For instance, it's not uncommon for screen readers - the lifeline for visually impaired users - to become useless when encountering modern HTML or even (paradoxically) [ARIA patterns](https://www.w3.org/WAI/ARIA/apg/patterns/). Debugging this is highly time-consuming, as the accessibility is affected by not only the browser, but also the operating system and screen reader, collectively.

u-elements aims to address this issue by providing W3C compliant re-implementations of modern HTML tags. They empower you to learn and use web standards, while also being confident that under the hood, your code gets augmented with thoroughly tested enhancements for screen reader compability. When all major browsers and assistive technologies sufficiently support an HTML element, you can simply remove the `u-` prefix to transition from the u-element implementation, to the corresponding native HTML element. No big rewrites. No custom APIs to learn. No opinionated styling. No framework dependence. Just HTML and DOM, but truly accessible for everyone.

[Browse elements &rarr;](/elements/)

<!--Through thorough testing accross all major devices, browsers and screen readers, u-elements is able to handles screen reader compatibility under the hood, while you can focus on learning and implementing standard HTML practices, while still being confident that your code will be accessible to all users.

<!--what might appear as a screen reader issue, can actually stem from the complex interaction of data between the browser, operating system, and screen reader, making debugging and testing a nightmare again.

It can be tricky to figure out what's causing the problem because it involves a lot of different parts like the browser and the operating system.

Problems attributed to screen readers may not always be the fault of the screen reader alone. The interaction between the web browser, operating system, and the screen reader can cause issues that are difficult to debug and resolve.

And while this might seem like a screen reader issue, it can infact be caused by the dance of data being passed between browser, operative system and screen reader.

Moreover, the user experience is no longer scoped to the browser, but a cooperation also with the operating system and the screen reader, making debugging (and blame) a nightmare.

Moreover, since both ARIA attributes, browser, operating system and screen reader now all affects the user experience, debugging becomes a nightmare.

The issue can both lie in the browser, the operative system or the screen reader itself, as all these need to cooperate.

Is this the screen readers fault? Not necessarily. Browser first [converts HTML to a accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree), then hand it over to the operative system, which again hands it over assistive technologies (i.e. screen reader). 

if this is the screen reader, operative system, browser or combination or ARIA attribute, since different ARIA attributes affects each other, and the flow of data goes browser converting HTML to [accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree), hand it over to the operative system, which again hands it over the screen reader (or other assistive technology) -->

<!-- For developers, this presents a dilemma.
Should you trust to web standards to be accessible?
Should you trust a NPM package claiming good accesibility?
Or should you start manually testing your product in all combinations of screen readers, browsers and devices?

While they strive to adhere to best practices and standards in their code, ensuring accessibility across various screen reader software remains a daunting task. Each screen reader interprets HTML and ARIA elements differently, leading to inconsistencies in how users with disabilities experience web content. -->

<!--Even some [W3C Aria Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) are yet too modern, making the functionality in might still be hidden or unusable.

It is not uncommon, that using a despite browsers having made significant progress towards consistent web standard support, 
The web ecosystem enjoys a high level of interoperability, despite intense competition between browser vendors.
However, despite web development being smoother than ever, there's a challenge that often goes unnoticed: the landscape of (inconsistent) assistive technologies. While browser do a good job of consistent rendering, screen readers - the lifeline for users with visual impairments - still struggle with poor support for HTML and ARIA specifications. 

<!--- to popular belief each browser and screen reader interprets the [accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree) differently, leading to inconsistencies in how users with disabilities experience the web.--

While browsers have made significant strides in rendering web content consistently, screen readers - the lifeline for users with visual impairments - still struggle with disparate support for HTML and ARIA specifications.

<!--However, amidst the celebration of smoother web development experiences, there's a hidden challenge that often goes unnoticed: the landscape of assistive technologies. While browsers have made significant strides in rendering web content consistently, screen readers - the lifeline for users with visual impairments - still struggle with disparate support for HTML and ARIA specifications.-->

<!--For developers, this presents a dilemma. While they strive to adhere to best practices and standards in their code, ensuring accessibility across various screen reader software remains a daunting task. Each screen reader interprets HTML and ARIA elements differently, leading to inconsistencies in how users with disabilities experience web content.-->

<!-- Enter u-elements, a project designed to bridge this accessibility gap. At its core, u-elements encourages developers to adhere closely to HTML standards while offering a layer of abstraction that handles screen reader compatibility under the hood. By adopting u-elements, developers can focus on learning and implementing standard HTML practices, confident that their code will be accessible to users across different screen reader platforms.

The goal of u-elements is not to replace existing accessibility practices but to complement them. By providing a standardized approach to handling screen reader compatibility, u-elements aims to make web development more inclusive and accessible for all users.

In a world where digital experiences play an increasingly central role in our lives, ensuring accessibility should be a fundamental priority for developers. With projects like u-elements leading the charge, we move closer to a web that truly serves everyone, regardless of their abilities or impairments.-->
