# Keyboard contexts

Cmd on macOS and Ctrl on Windows/Linux are written as `Mod` in keymaps. The command palette and shortcut settings use the same action registry as the toolbar. The palette fuzzy-matches names, categories and bindings, supports arrow-key selection, and puts recent commands first when the query is empty.

Native inputs, textareas, selects, editable content and composition events receive text before canvas shortcuts. The numeric command input owns its text, Enter and Escape. With a canvas selection, unmodified `w`, `x`, `y` or `r` starts numeric input. Thus `r 45` rotates the selection; use `2`, deselect first, or choose Rectangle from the palette to switch tools. `h` remains Hand; height can be included in a combined command such as `w 240 h 120`.

`G` is a chord prefix. The dispatcher waits 650 milliseconds for `G then A`; a lone `G` opens Generate when generation is configured. Escape, window blur, and focus moving into a text input cancel pending chords. An unmatched second stroke is evaluated as an ordinary shortcut.

Space temporarily pans. The Hand tool also pans with arrow keys. `+` and `-` zoom. Shift+Enter places the selected tool at the canvas centre; Enter edits selected content. Arrow keys nudge by one unit, Shift+Arrow by ten. Mod+Arrow creates a connected copy, and Tab/Shift+Tab follows connections from the focused canvas. Native Tab remains available outside this canvas context.

Alt-drag duplicates a selection. Pointer cancellation restores the scene from before the gesture. Whole-element erasure is one undo step per stroke. The outline exposes every element in stacking order, with named arrow endpoints, search, and 100-element pages. Locked objects can be inspected through the outline and unlocked through the palette or properties.
