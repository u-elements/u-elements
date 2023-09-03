# MacOS 13.2 - VoiceOver 30.04.2023

## Safari, Edge:
Success

## Chrome;
Note: Must have aria-selected="false" on role="tab" to not announce "selected"

------------------

# Windows - NVDA 30.04.2023:
## Edge, Chrome, Firefox:
Success

# Windows - JAWS 30.04.2023:
## Edge, Chrome, Firefox:
Success

# Windows - Narrator 30.04.2023:
## Edge, Chrome, Firefox:
Note: Does not announce tabpanel, but instead announces the text from aria-labelledby

------------------

# iOS 16.2 - VoiceOver 30.04.2023
## Chrome, Firefox, Safari:
Success

------------------

# Android 13 - Talkback 30.04.2023
## Chrome, Samsung Internett, Firefox:
Success: But can not use aria-label
Note: Does not announce number of total, so we add a title attribute width n N (not slash as this is read as "divided by")
