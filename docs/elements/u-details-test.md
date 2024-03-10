// Why: details/summary does not work in iOS Safari: impossible to read state of aria-expanded

# MacOS 14.2 - VoiceOver 08.03.2024:
## Firefox:
Reads "Text, state, button", Reads "Text" but no state on click
*Note: "small triangle" after interacting with the details element, because of display: list-item*

## Safari:
Reads "Text, state, button", Reads "Text, new state, button" on click
Does not read "group", but this is not common for native details neither

## Edge, Chrome:
Reads "Text, state, button, group", Reads "Text, new state, button, group" on click
*Note: "group" is read in button because of display: list-item (also applies to native details)*


------------------

# Windows - NVDA 08.03.2024:
## Edge, Chrome, Firefox:
"Button, state, Text", Reads "new state" on click
*Note: "small triangle" after interacting with the details element, because of display: list-item*

# Windows - JAWS 08.03.2024:
## Edge, Chrome:
Reads "Text, button, state", Reads "new state" on click

## Firefox v112:
"Text, button, state", Reads Text, Button, "new state" on click

# Windows - Narrator 08.03.2024:
## Chrome:
"Button, state, Text", Reads nothing on click
## Edge:
"Button, state, Text", Reads "Text, Button, state" on click
## Firefox:
"Text, button, state", Reads "Text, button state" on click

------------------

# iOS 16.2 - VoiceOver 08.03.2024:
## Chrome, Firefox, Safari:
Reads "Text, button, State", Reads "Text, New state" on click

------------------

# Android 13 - Talkback 08.03.2024:
## Chrome, Samsung Internett:
Reads "State, Text, button", Reads "New state" on click
*Note: Android does not read content when using aria-labelleby*

## Firefox:
Reads "State, Text, button", Reads "New state" on click
Announces "hidden" if hiding other details
*Note: Android does not read content when using aria-labelleby*