// TODO: Maybe show no results?
// TODO: Read https://www.npmjs.com/package/custom-element-vs-code-integration
//const valid =
//return show
// attr(self, 'tabindex', valid.length ? null : 0) // Set input to invalid if no matches found

# MacOS 13.2 - VoiceOver 30.08.2023

## Safari:
Note: aria-expanded is not read on inputs - we can live with this

## Chrome:
Success

## Firefox:
Note: Reads group
Success

------------------

# Windows - NVDA 30.08.2023:
## Edge:
Note: Aria-expanded is not read - we can live with this
Note: Dos not annonce aria-selected - we can live with this
## Chrome, Firefox
Note: Dos not annonce aria-selected - we can live with this

# Windows - JAWS 30.08.2023:
## Edge:
Note: Dos not annonce aria-selected - we can live with this

## Chrome:
Success
## Firefox:
Success

# Windows - Narrator 30.08.2023:

## Chrome:
Note: Aria-expanded is not read - we can live with this
## Edge:
Success

## Firefox:
Success

------------------

# iOS 16.2 - VoiceOver 30.08.2023
## Safari, Chrome, Firefox:
Note: Does not announce number of total, so we add a title attribute width n/N

------------------

# Android 13 - Talkback 30.08.2023

## Chrome
Note: Announces options "above the keyboard" - which is technically not wrong
## Samsung Internett:
Note: Announces listarea - unnecessary, but this is Android standard
Note: Does not announce "expanded/minimized" before initial focus is fired - which is technically not wrong

## Firefox:
Note: Does not hide keyboard - we can live with this