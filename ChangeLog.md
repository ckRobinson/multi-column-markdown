### **0.7.8**
- Updated column break flag to trigger properly when attached to the end of lists.

### **0.7.7**
- Fixed bug where error message was not displayed when attempting to export to PDF from live preview.
- Fixed bug with DataviewJS rendering within columns.
- Fixed bug where dataview inline elements were not being rendered properly.
- Fixed bug where checkboxes were double rendering the button and not properly triggering on click.
- Fixed bug in live preview in which certain kinds of content would cause Obsidian to hang on any file interaction.
- Fixed bug where additional image embed syntax was not rendering properly.
- Updated element reload timings to attempt to reduce initial delay when loading elements on initial file load.
- Updated single column and auto layout to properly use content alignment and content overflow.
- Updated column break flag to properly trigger when appended to a paragraph block.

### **0.7.6**
- Fixed bug in live preview that caused Obsidian 1.1.0 to hang on start up.

### **0.7.5**
- Fixed bug in live preview that caused Obsidian 1.1.0 to hang on start up.

# **0.7.4**
- Fixed bug in pdf export caused by using both kinds of codeblock start regions.
- Fixed bug in Fix Missing ID command when appending new IDs to codeblock start regions.
- Fixed bug where having multiple tabs of the same document open could cause regions to not render properly.
    - This fix may cause issues in other areas, will be watching this closely. 
- Fixed bug where images with custom width were not being rendered in live-preview
    - This only applies to images using the core obsidian \[\[Image|width]] syntax, any other syntax may not render properly.
- Added option to toggle columns rendering on mobile devices (per feature request). 
    - Use the new command "Toggle Mobile Rendering - Multi-Column Markdown" to toggle between rendered and un-rendered modes.
    - Command is available and will toggle setting on desktop but only effects mobile rendering.
- Fixed a bug that caused internal and external links to not properly open within live preview.
- Made an adjustment to interal embeds which should reduce flickering when placed within column region.

# **0.7.3**
- Added option to create full width single column regions. Use "column size: full" to enable.
- Fixed bug that caused images to not render in live preview.
- Fixed bug caused by live preview regions ignoring end tags, when multiple columns in the same document.
- Fixed bug when rendering multiple regions with different start tags in live preview.
- Fixed bug caused by an mistakenly adding an end tag before the start tag.
- Fixed bug in live-preview rendering when selecting text.
- Fixed bug with Obsidian live preview toggle and Multi-Column regions. 
- Fixed bug when exporting file to pdf.
- Fixed a bug where items after a horizontal line, or other special elements, were not being properly anchored in the DOM.
- Fixed a bug where dataview and other special content was constantly re-rendering and flashing on the screen.

# **0.7.2**
- Finalized 0.7.1 fix to pdf export bug.
# **0.7.1**
- Fixed render bug when exporting columns with new codeblock start syntax to PDF.

# **0.7.0**
- ## **Live Preview Support**
    - The much requested and long awaited live preview support is here! 
    - **Things to note:**
        - Updating to 0.7.0 to enable this feature may require a restart of Obsidian.
        - The styling of the Live Preview columns is **very** theme dependent as Multi-Column Markdown mostly only handles the layout.
        - All standard markdown syntax is fully supported, however cross compatibility with other plugins may or may not be supported.
            - Due to how custom live preview plugins are implemented within CodeMirror6 and hook into Obsidian I can not guarentee all plugins will render properly within live preview at this point.
            - *Most* plugins retain their cross compatibility when viewing columns in Reading mode.

- ## **New start region syntax**
    - You can now define the start of a multi-column region and it's settings as a single codeblock.
    - The old start tag syntax will begin to be slowly depricated by this new codeblock syntax.
- ## **Other Changes and Bug Fixes**
    - Added option to define the spacing between the columns in a new setting option (per feature request.)
    - Added option to define if columns should cut off any overflowing content, set default to make overflow auto scroll.
    - Fixed issue of window jumping when scrolling a document with a column region.
        - This is fixed for all column regions, but appears to perform better when using the new all in one codeblock start and settings regions. 
    - Fixed Single column layout issues and PDF export issues.
    - Fixed issue with settings not being parsed due to extra leading or trailing white-space.
    - Fixed bug where some theme stylings were being drawn but not usable or interactable.
    - Updated layout of columns to be more clean and uniform.

# **0.6.3**
- Fixed compatibility issue with Charts plugin using dataviewJS codeblocks.

# **0.6.2**
- Fixed compatibility issue with Tasks caused by update to renderer in 0.6.0.

# **0.6.1**
- Fixed compatibility issue with Dataview caused by update to renderer in 0.6.0.

# **0.6.0**
- ## Auto Layout
    - New render option added.
    - An auto layout region does not use defined column breaks but will attempt to keep all content evenly balanced between the columns.
    - Headings are kept tied to the content below it, meaning a heading shouldn't ever end a column they will instead be moved to the top of the next column.
        - Allowing this to be turned off is coming.
    - Set "Auto Layout: true" to use

- ## Single columns
    - Single column option added as per feature request.
    - Setting the number of columns to 1 will enable.
    - You can currently set the column to 3 sizes, small, medium, and large, which are rendered as 25%, 50% and 75% of the window size respectively.
        - Setting "Column Size: medium"
    - You can also set a left, right or centered location
        - Setting "Column Position: center"
- ## Other Changes
    - Major refactor of rendering process to make extension more simple. 
    - Updated the refresh loop to keep things from being redrawn too frequently. 
        - This change should help fix some of the flashing issues seen on iframe and other elements. 
- ## Upcoming (In no particular order)
    - Working / Investigating on Live Preview support
    - Fixing the scroll jumping issue
        - Have made progress on this bug, but will require a syntax change and may interfere with live preview.
    - Adding a settings window to allow for defining custom tag syntax and other options.

# **0.5.0**
This release fixes the export to PDF functionality that was missing as well as fixing some other input and render bugs that had slipped by testing.
- Native Obsidian PDF export now working. To render a multi-column region to a pdf you must export from the preview view and not edit view.
- Fixed a bug where task list checkboxes were sending their on-click event to the wrong item.
    - This has been tested with native checkboxes as well as the tasks plugin and seems to work fine as far as I could tell. There may be compatibility issues in other locations.
- Fixed bug where iFrames within a multi-column region would constantly reload itself causing it to flash.

# **0.4.3**
Updated renderer engine to keep track of and properly render special kinds of content. This change fixes some compatibility issues with other plugins where buttons were not properly triggering on click. It also fixes some preview issues causing some content to become out of date, for example an update to a query result in a dataview codeblock.
- Rendered preview windows are now periodically refreshed. Currently the document is refreshed every 2 seconds but will keep an eye on performance and usability with this timing.

# **0.4.2**
- Now allow a single empty ID per document.

# **0.4.1**
- Added additional check in attempt to reduce parsing time on documents without multi-column regions.

# **0.4.0**
Additional parsing and render engine improvements. New changes should make larger files quicker to load as well as vastly reduce the additional overhead when loading files without multi-column regions.
- Cleaned up parsing and render engine.
- Added error message to multi-column regions that are missing region IDs.
- Added additional command to command palette to insert missing region IDs.

# **0.3.1**
- Loosened spacing requirements on tags causing what should be considered false negatives when parsing.

# **0.3.0**
Entire overhaul of the parsing and render engine. This rework fixes many of the issues in the previous version including the double rendering and data still being rendered after removing an entire line. It also fixes compatibility issues where items such as Dataview code blocks as well as images were not being rendered properly within a region.
- New cleaner back-end for parsing and rendering multi-column regions.
- Improved compatibility with other plugins.
- Additional setting to allow the removal of the region shadow.

# **0.2.0**
Added additional setting to the multi-column regions. Users can now disable the borders around the regions if desired by setting "border: disabled" within the settings block.

# **0.1.0**
Initial release.
- Obsidian properly parses the syntax used by this plugin.
- Documents with multi-column regions are rendered properly in the document preview.
- Includes custom command to quickly add a multi-column region to a document.