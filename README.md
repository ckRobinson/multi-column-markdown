# Multi-Column Markdown

Take your boring markdown document and add some columns to it! With Multi Column 
Markdown rather than limiting your document layout to a single linear file you can 
now define blocks of data to be laid out horizontally next to each other. This
additional functionality gives you the freedom to structure your notes in more
creative ways. 

<br>

![Preview_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Preview_1.png?raw=true)

<br>

# Usage:


You create a multi-column region by defining the start, settings, column-end, and end tags. EG:

<br>

Text displayed above.

\```start-multi-column\
ID: ExampleRegion1\
number of columns: 2\
largest column: left\
\```

Text displayed in column 1.

\--- end-column ---

Text displayed in column 2.

=== end-multi-column

Text displayed below.


**Rendered as:**
![Example_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_1.png?raw=true)

---

<br>

### **Region Start Tag:**

Each multi-column region must start with either:

\```start-multi-column\
ID: A_unique_region_ID\
\```

or

\```multi-column-start\
ID: A_unique_region_ID_1\
\```

**Old Syntax (Currently still supported.):**
- === start-multi-column: A_unique_region_ID_2
- === multi-column-start: A_unique_region_ID_3

After defining the start tag you must declare an ID for the region. The ID is used to differentiate between different regions if there are multiple in the same document.

Each ID must be unique within the same document or unexpected render issues may occur. An ID may be used across multiple documents so that, for example, you can use the ID "dailynote" in the template used for your Periodic Notes.

By using the "Insert Multi-Column Region" command (more below) the start ID will be pre-set as a randomly generated 4 character string.

You can also use the "Fix Missing IDs" command which will search the currently open document and append random IDs to all regions that are missing one.

<br>

### **Valid Tags:**

<br>

Each tag type can be defined with the following options:

#### **Start Multi-Column Region:**
**Codeblock Syntax:**\
\```start-multi-column\
ID: A_unique_region_ID\
*Any Additional Settings (see below)*\
\```

\```multi-column-start\
ID: A_unique_region_ID_2\
*Any Additional Settings (see below)*\
\```

**Old Syntax (Currently still supported.):**
- === start-multi-column: A_unique_region_ID_3
- === multi-column-start: A_unique_region_ID_4

#### **End Multi-Column Region:**
- \=\=\= end-multi-column
- \=\=\= multi-column-end

#### **End a Column:**
\--- column-end \---\
\--- end-column \---\
\--- column-break \---\
\--- break-column \---

**Old Syntax (Currently still supported.):**
- \=== column-end ===
- \=== end-column ===
- \=== column-break ===
- \=== break-column ===
#### **Settings Region: (Old Syntax, Currently still supported. Not used if using codeblock start tag syntax above)**
\```settings\```\
\```column-settings\```\
\```multi-column-settings\```

<br>

### **Valid Column Settings: (Old Syntax, Currently still supported. Not used if using codeblock start tag syntax above)**
---

The column settings block can be omitted which will by default set the region to two equal sized columns. To change how the region is rendered you must define a settings block. The settings tags and all valid options for each setting are listed below.

The settings block must be defined right after the multi-column start tag and each settings tag must be on a separate line. EG:

=== start-multi-column: ExampleRegion2\
\```column-settings\
number of columns: 2\
largest column: left\
border: enabled\
\```

<br>

### **Settings Tags:**

#### **ID: (Only used in codeblock start regions. Old style starts must define ID on the same line as listed above.)**
- Any string of characters.
- The ID is used to differentiate between different regions if there are multiple in the same document.
- Each ID must be unique within the same document or unexpected render issues may occur. An ID may be used across multiple documents so that, for example, you can use the ID "dailynote" in the template used for your Periodic Notes.

#### **Number of Columns:**
- 1, 2 or 3

#### **Largest Column:**
By default all of the columns will be set to equal size
if this option is omitted.

- For either 2 or 3 column layouts
    - Standard
    - Left
    - First
    - Right
    - Second
- Only for 3 column layouts
    - Center
    - Third
    - Middle

#### **Border:**
By default the border is enabled but can be removed with:
- disabled
- off
- false

#### **Shadow:**
On by default, can be removed with:
- disabled
- off
- false

#### **Column size:**
Only used with the single column option.
- Valid Options:
    - Small
    - Medium
    - Large
    - Full

#### **Column Position or Column Location:**
Only used with the single column option.
- Valid options:
    - Left
    - Right
    - Center
    - Middle

#### **Column Spacing:**
- Used to set the distance between all of the columns.
- Allows *most* CSS unit lengths (px, pt, %, etc).
- A number alone without a defined unit type defaults to pt unit.

#### **Content Overflow:**
Should the columns cut off anything that goes outside the column bounds or should it be scrollable.
- Valid options:
    - Scroll (Default)
    - Hidden

<br>

### **Auto Layout**
---

Auto layout regions do not use defined column breaks. Instead these type of multi-column regions will attempt to balance all content equally between the columns. Headings are also attempted to be preserved so that a heading block will not end a column but will instead be moved to the top of the next column with it's corresponding content.

To use this feature set "Auto Layout: true" within the region settings.

<br>

### **Live Preview**
---

Live preivew is now supported in Multi-Column Markdown, however cross compatibilty with other plugins may or may not be supported in this mode. Due to how custom live preview plugins are implemented within CodeMirror6 and hook into Obsidian, I can not guarentee all plugins will render properly within live preview at this point. Plugins that do not render their content immediatly, such as needing to wait for a dataview query, do not render properly. *Most* plugins retain their cross compatibility when viewing the columns in Reading mode however.

<br>

# **Full Examples:**

\```start-multi-column\
ID: ExampleRegion3\
\```

\# Column 1

\=== end-column ===

\# Column 2

=== end-multi-column

**Rendered as:**
![Eample_2Column](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_2Column.png?raw=true)

<br>

\```start-multi-column\
ID: ExampleRegion4
number of columns: 3\
border: off\
\```

\# Column 1

\--- end-column ---

\# Column 2

\--- end-column ---

\# Column 3

=== end-multi-column

**Rendered as:**
![Eample_3Column_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_3Column_1.png?raw=true)

<br>

=== start-multi-column: ExampleRegion5\
\```settings\
number of columns: 3\
largest column: center\
\```

\#### Column 1

\--- end-column ---

\# Column 2

\--- end-column ---

\#### Column 3

=== end-multi-column

**Rendered as:**
![Eample_3Column_2](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_3Column_2.png?raw=true)

<br>

=== start-multi-column: ExampleRegion6\
\```settings\
number of columns: 1\
column size: medium\
column position: left\
\```

\#### Single Left Aligned Column 

=== end-multi-column

**Rendered as:**
![Example_4Column_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_4Column_1.png?raw=true)

<br>

### **Things to note:**

---

You can not nest a multi-column region within another multi-column region.

<br>

### **Available Commands:**
---

You can access the command pallet with ctrl/command - P. 

#### **Insert Multi-Column Region**
Will create a two column region where the cursor is located with a randomly generated ID and a default settings block created. Anything currently selected will be moved outside the end of the inserted region as to not overwrite any data.

<br>

#### **Fix Missing IDs For Multi-Column Regions**
Will search the current document for any region start tags that are missing IDs and randomly generate new IDs for each region.

<br><br>

# Installation

## From Obsidian Community Plugins

You can install this plugin from the Obsidian Community Plugins menu by following these steps:

- Open Settings within Obsidian
- Click Community plugins and ensure Safe mode is disabled
- Browse community plugins and find "Multi-Column Markdown"
- Click Install
- After installation is finished, click Enable

## From GitHub Repository

Download main.js, manifest.json, styles.css from the latest release and add a new directory: [Obsidian-vault]/.obsidian/plugins/multi-column-markdown and add the files to that directory. 

If this is your first Obsidian plugin close and reopen Obsidian and then open the settings menu, click the Community plugins tab to the left, ensure Safe mode is disabled, and then enable "Multi-Column Markdown" in the installed plugins list.

<br><br>

# Known Issues

#### **Live Preview**

- Some cross compatibility with other plugins is not supported and will not render.
    - Most plugins that do not render are more advanced plugins that load their content over time rather than immediatly at render time.

#### **Minor Render Issues**

- Any general render issues within columns:
    - If columns render their content in an unexpected way try swapping to a new file and back, this will usually fix the issue.

<br>

- When entering data into a multi-column region the data can sometimes be rendered a line above or below the intended location in the preview window. When the line is near the start or end of a column or region it may be rendered in the wrong column or outside of the region entirely.
- Copy and pasting text into a new locations within a region may not update in preview view properly.
- When swapping between auto layout or single column, regions may sometimes become stuck rendering an old layout.
- Auto layout regions sometimes get stuck in a non-equal state.
    - Workaround:
        - Swapping to a different file and back, or closing and reopeing the file will force a reload of the data and fix the render issue.

### Other
- Keeping an extra eye on performance after the 0.7.0 release.
- Opening large files can cause Obsidian to slow down and lag while the document is being parsed.
    - As of 0.4.0 this should be less of an issue but still keeping an eye on it.
<br><br>
- The Obsidian API and this plugin are both still works in progress and both are subject to change. 

<br><br>

# Version History

### **0.7.3**
- Added option to create full width single column regions. Use "column size: full" to enable.
- Fixed bug caused by live preview regions ignoring end tags, when multiple columns in the same document.
- Fixed bug with Obsidian live preview toggle and Multi-Column regions. 

### **0.7.2**
- Finalized 0.7.1 fix to pdf export bug.
### **0.7.1**
- Fixed render bug when exporting columns with new codeblock start syntax to PDF.

### **0.7.0**
- ### **Live Preview Support**
    - The much requested and long awaited live preview support is here! 
    - **Things to note:**
        - Updating to 0.7.0 to enable this feature may require a restart of Obsidian.
        - The styling of the Live Preview columns is **very** theme dependent as Multi-Column Markdown mostly only handles visual the layout.
        - All standard markdown syntax is fully supported, however cross compatibility with other plugins may or may not be supported.
            - Due to how custom live preview plugins are implemented within CodeMirror6 and hook into Obsidian I can not guarentee all plugins will render properly within live preview at this point.
            - *Most* plugins retain their cross compatibility when viewing columns in Reading mode.
- ### **New start region syntax**
    - You can now define the start of a multi-column region and it's settings as a single codeblock.
    - The old start tag syntax will begin to be slowly depreciated by this new codeblock syntax.
- ### **Other Changes and Bug Fixes**
    - Added option to define the spacing between the columns in a new setting option (per feature request.)
    - Added option to define if columns should cut off any overflowing content, set default to make overflow auto scroll.
    - Fixed issue of window jumping when scrolling a document with a column region.
        - This is fixed for all column regions, but appears to perform better when using the new all in one codeblock start and settings regions. 
    - Fixed Single column layout issues and PDF export issues.
    - Fixed issue with settings not being parsed due to extra leading or trailing white-space.
    - Fixed bug where some theme stylings were being drawn but not usable or interactable.
    - Updated layout of columns to be more clean and uniform.

### **0.6.3**
- Fixed compatibility issue with Charts plugin using dataviewJS codeblocks.

### **0.6.2**
- Fixed compatibility issue with Tasks caused by update to renderer in 0.6.0.

### **0.6.1**
- Fixed compatibility issue with Dataview caused by update to renderer in 0.6.0.

### **0.6.0**
- ### Auto Layout
    - New render option added.
    - An auto layout region does not use defined column breaks but will attempt to keep all content evenly balanced between the columns.
    - Headings are kept tied to the content below it, meaning a heading shouldn't ever end a column they will instead be moved to the top of the next column.
        - Allowing this to be turned off is coming.
    - Set "Auto Layout: true" to use

- ### Single columns
    - Single column option added as per feature request.
    - Setting the number of columns to 1 will enable.
    - You can currently set the column to 3 sizes, small, medium, and large, which are rendered as 25%, 50% and 75% of the window size respectively.
        - Setting "Column Size: medium"
    - You can also set a left, right or centered location
        - Setting "Column Position: center"
- ### Other Changes
    - Major refactor of rendering process to make extension more simple. 
    - Updated the refresh loop to keep things from being redrawn too frequently. 
        - This change should help fix some of the flashing issues seen on iframe and other elements. 
- ### Upcoming (In no particular order)
    - Working / Investigating on Live Preview support
    - Fixing the scroll jumping issue
        - Have made progress on this bug, but will require a syntax change and may interfere with live preview.
    - Adding a settings window to allow for defining custom tag syntax and other options.

### **0.5.0**
This release fixes the export to PDF functionality that was missing as well as fixing some other input and render bugs that had slipped by testing.
- Native Obsidian PDF export now working. To render a multi-column region to a pdf you must export from the preview view and not edit view.
- Fixed a bug where task list checkboxes were sending their on-click event to the wrong item.
    - This has been tested with native checkboxes as well as the tasks plugin and seems to work fine as far as I could tell. There may be compatibility issues in other locations.
- Fixed bug where iFrames within a multi-column region would constantly reload itself causing it to flash.

### **0.4.3**
Updated renderer engine to keep track of and properly render special kinds of content. This change fixes some compatibility issues with other plugins where buttons were not properly triggering on click. It also fixes some preview issues causing some content to become out of date, for example an update to a query result in a dataview codeblock.
- Rendered preview windows are now periodically refreshed. Currently the document is refreshed every 2 seconds but will keep an eye on performance and usability with this timing.

### **0.4.2**
- Now allow a single empty ID per document.

### **0.4.1**
- Added additional check in attempt to reduce parsing time on documents without multi-column regions.

### **0.4.0**
Additional parsing and render engine improvements. New changes should make larger files quicker to load as well as vastly reduce the additional overhead when loading files without multi-column regions.
- Cleaned up parsing and render engine.
- Added error message to multi-column regions that are missing region IDs.
- Added additional command to command palette to insert missing region IDs.

### **0.3.1**
- Loosened spacing requirements on tags causing what should be considered false negatives when parsing.

### **0.3.0**
Entire overhaul of the parsing and render engine. This rework fixes many of the issues in the previous version including the double rendering and data still being rendered after removing an entire line. It also fixes compatibility issues where items such as Dataview code blocks as well as images were not being rendered properly within a region.
- New cleaner back-end for parsing and rendering multi-column regions.
- Improved compatibility with other plugins.
- Additional setting to allow the removal of the region shadow.

### **0.2.0**
Added additional setting to the multi-column regions. Users can now disable the borders around the regions if desired by setting "border: disabled" within the settings block.

### **0.1.0**
Initial release.
- Obsidian properly parses the syntax used by this plugin.
- Documents with multi-column regions are rendered properly in the document preview.
- Includes custom command to quickly add a multi-column region to a document.

# Support Me:

<a href="https://www.buymeacoffee.com/ckrobinson" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60" /></a>

<a href='https://ko-fi.com/ckrobinson' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />