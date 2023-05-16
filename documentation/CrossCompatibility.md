# Plugin Cross Compatibility
This document will have the most up to date list of plugins broadly tested to work within a multi-column region. _(Niche use cases may not have been tested and may not work.)_

### Admonition
---
- **Reading Mode**
    - Works as expected.
- **Live Preview**
    - Renders but buttons are un-interactable.

### Buttons
---
- **Reading Mode**
    - Works as expected.
- **Live Preview**
    - Does not render.

### Custom Frames
---
- **Reading Mode**
    - Works as expected.
- **Live Preview**
    - Renders but on every file interaction the view is re-rendered.
    - Re-rendering issue is built into how obsidian draws the view in live-preview and there is currently no solution.

### Dataview
---
- **Reading Mode**
    - Works as expected.
- **Live Preview**
    - Generally does not render or will render as a blank list with no content.
    - Occasionally data does properly load but reprodicing and fixing the issue is an on going process.

### DataviewJS
---
- **Reading Mode**
    - Does not render.
- **Live Preview**
    - Does not render.