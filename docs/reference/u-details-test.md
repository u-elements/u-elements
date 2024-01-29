# MacOS 13.2 - VoiceOver 30.04.2023
## Firefox:
Reads "Text, state, button", Reads "Text" but no state on click, reads "Text, group", reads "content", reads "End of, Text group"

## Safari:
Reads "Text, state, button", Reads "Text, new state, button" on click, reads "Text, group", reads "content", reads "End of, Text group"

## Edge, Chrome:
Reads "Text, state, button, group", Reads "Text, new state, button, group" on click, reads "Text, group", reads "content", reads "End of, Text group"
*Note: "group" is read in button because of display: list-item*


------------------

# Windows - NVDA 30.04.2023:
## Edge, Chrome, Firefox:
"Button, state, Text", Reads "new state" on click, reads "group content", reads "out of group"

# Windows - JAWS 30.04.2023:
## Edge, Chrome:
Reads "Text, button, state", Reads "Text, Button, new state" on click, reads "group start Text", reads "content", reads "group end"

## Firefox v112:
"Text, button, state", Reads Text, Button, new state" on click, reads "group start Text", reads "content", reads "group end"
Windows 10 with Narrator -

# Windows - Narrator 30.04.2023:
## Chrome:
"Button, state, Text", Reads nothing on click, Reads no group, but reads content
## Edge:
"Button, state, Text", Reads "Text, Button, state, available suggestions" on click, Reads no group, but reads content
*Note: "available suggestions" is read because of because of aria-controls*
## Firefox:
"Text, button, state", Reads "Text, button state" on click, Reads no group, but reads content

------------------

# iOS 16.2 - VoiceOver 30.04.2023
## Chrome, Firefox, Safari:
Reads "Text, button, State", Reads "Text, New state" on click, read only "content", not "group"

------------------

# Android 13 - Talkback 30.04.2023
## Chrome, Samsung Internett:
Reads "State, Text, button", Reads "New state" on click, read only "content", not "group"
*Note: Android does not read content when using arial-labelleby*

## Firefox:
Reads "State, Text, button", Reads "New state" on click, read only "content", not "group"
*Note: Android does not read content when using arial-labelleby*