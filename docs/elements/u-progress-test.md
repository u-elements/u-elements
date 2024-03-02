Why not use native element?
Our testing of 2023.01.03, results provided below, showed that the native `<progress>`-element is still not providing a good enough user experience across platforms, browsers and screen readers.

Results of testing 2023.01.03
Basic example:

`<progress value="20" max="50"></progress>`
MacOS 13.2 with VoiceOver - Safari og Chrome: Reads «40 % fremdriftsindikator»
MacOS 13.2 with VoiceOver - Firefox: Reads «opptatt framdriftsindikator
iOS 16.2 with VoiceOver - Safari, Chrome og Firefox: Reads «20.00»
Windows 10 with NVDA 2022.3.3 - Chrome og Edge: Reads «Framdriftsindikator 20»
Windows 10 with NVDA 2022.3.3 - Firefox: Reads «Framdriftsindikator 20 prosent»
Windows 10 with Jaws 22.11.7 latest - Chrome og Edge: Reads «20 framdriftsindikator»
Windows 10 with Jaws 22.11.7 - Firefox: Reads «40 prosent fremdriftsindikator
Windows 10 with Narrator - Chrome, Edge og Firefox: Reads «40 fremdriftsindikator»
Android 9 with Talkback - Chrome og Samsung Internett: Reads «20,0», pause, «20», pause, «fremdriftsindikator»
Best supported example with ARIA:

`<progress value="15" aria-valuetext="15 av 50" max="50"></progress>`
MacOS 13.2 with VoiceOver - Safari og Chrome: Reads «15 av 50 30 % framdriftsindikator»
MacOS 13.2 with VoiceOver - Firefox: Reads «opptatt framdriftsindikator
iOS 16.2 with VoiceOver - Safari, Chrome og Firefox: Reads «15 av 50»
Windows 10 with NVDA 2022.3.3 - Chrome, Edge og Firefox: Reads «Fremdriftsindikator 15 av 50»
Windows 10 with Jaws 22.11.7 - Chrome, Edge og Firefox: Reads «15 av 50 framdriftsindikator»
Windows 10 with Narrator - Chrome, Edge og Firefox: Reads «30 prosent fremdriftsindikator»
Android 9 with Talkback - Chrome og Samsung Internett: Reads «15 av 50 fremdriftsindikator
