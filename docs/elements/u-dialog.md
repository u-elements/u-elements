Notice: Can not guarantee that the users leave the dialog in old browsers and Firefox 06.05.23
Keep close button as first element

# MacOS 13.2 - VoiceOver 30.04.2023

## Safari:
Success: Both modal and non-modal works as expected

## Edge, Chrome:
Success: Both modal and non-modal works as expected

## Firefox:
Success: Functionally works
Warning: Anounces role "group" instead of "dialog"
Warning: Navigation is kept linear with rest of page
Fail: Focus can leave both modal and non-modal

------------------

# Windows - NVDA 30.04.2023:
## Edge, Chrome, Firefox:
Success: Both modal and non-modal works as expected

# Windows - JAWS 30.04.2023:
## Edge, Chrome, Firefox v112:
Success: Both modal and non-modal works as expected
Warning: Announces aria-label but not role

# Windows - Narrator 30.04.2023:
## Chrome:
Success: Both modal and non-modal works as expected
Warning: Announces aria-label but not role

# Windows - Narrator 30.04.2023:
## Edge:
Success: Both modal and non-modal works as expected

# Windows - Narrator 30.04.2023:
## Firefox:
Fail: Does not move focus
Fail: Does not anounce aria-label or role
Fail: Focus can leave both modal and non-modal

------------------

# iOS 16.2 - VoiceOver 30.04.2023
## Chrome, Firefox, Safari:
Success: Both modal and non-modal works as expected

------------------

# Android 13 - Talkback 30.04.2023
## Chrome, Samsung Internett:
Success: Both modal and non-modal works as expected
Fail: Only anounces aria-label on first view

## Firefox:
Fail: Does not move focus, but modal-mode correctly blocks focus from other elements
Fail: Does not anounce aria-label or role