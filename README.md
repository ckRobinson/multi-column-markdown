# Multi-Column Markdown

Take your boring markdown document and add some columns to it! With Multi Column 
Markdown rather than limiting your document layout to a single linear file you can 
now define blocks of data to be layed out horizontally next to each other. This
additional functionality gives you the freedom to structure your notes in more
creative ways. 

<br>

![Preview_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Preview_1.png?raw=true)

<br>

# Usage:


You create a multi-column region by defining the start, settings, column-end, and end tags. EG:

<br>

Text displayed above.

=== start-multi-column: ExampleRegion1\
\```column-settings\
number of columns: 2\
largest column: left\
\```

Text displayed in column 1.

\=== end-column ===

Text displayed in column 2.

=== end-multi-column

Text displayed below.


**Rendered as:**
![Eample_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_1.png?raw=true)

---

<br>

### **Region Start Tag:**

Each multi-column region must start with either:

- === start-multi-column: A_unique_region_ID
- === multi-column-start: A_unique_region_ID_2

After defining the start tag you must declare an ID for the region. The ID is used to differentiate between different regions if there are multiple in the same document.

Each ID must be unique within the same document or unexpected render issues may occur. An ID may be used across multiple documents so that, for example, you can use the ID "dailynote" in the template used for your Periodic Notes.

By using the "Insert Multi-Column Region" command (more below) the start ID will be pre-set as a randomly generated 4 character string.

You can also use the "Fix Missing IDs" command which will search the currently open document and append random IDs to all regions that are missing one.

<br>

### **Valid Tags:**

<br>

Each tag type can be defined with the following options:

- Start Multi-Column Region:
    - === start-multi-column: A_unique_region_ID
    - === multi-column-start: A_unique_region_ID_2
- End Multi-Column Region:
    - === end-multi-column
    - === multi-column-end
- End a Column:
    - \=== column-end ===
    - \=== end-column ===
    - \=== column-break ===
    - \=== break-column ===
- Settings Region:
    - \```settings```
    - \```column-settings```
    - \```multi-column-settings```

<br>

### **Valid Column Settings:**
---

The column settings block can be omitted which will by default set the region to two equal sized columns. To change how the region is rendered you must define a settings block. The settings tags and all valid options for each setting are listed below.

The settings block must be define right after the multi-column start tag and each settings tag must be on a separate line. EG:

=== start-multi-column: ExampleRegion2\
\```column-settings\
number of columns: 2\
largest column: left\
border: enabled\
\```

<br>

### **Settings Tags:**

Number of Columns: 
- 1, 2 or 3

Largest Column: 
- By default all of the columns will be set to equal size
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

Border:
- By default the border is enabled but can be removed with:
    - disabled
    - off
    - false

Shadow:
- On by default, can be removed with:
    - disabled
    - off
    - false

Column size:
- Only used with the single column option.
- Valid Options:
    - Small
    - Medium
    - Large

Column Position or Column Location:
- Only used with the single column option.
- Valid options:
    - Left
    - Right
    - Center
    - Middle

<br>

### **Auto Layout**
---

Auto layout regions do not use defined column breaks. Instead these type of multi-column regions will attempt to balance all content equally between the columns. Headings are also preserved so that a heading block will not end a column but will instead be moved to the top of the next column with it's coresponding content.

To use this feature set "Auto Layout: true" within the region settings.

<br>

# **Full Examples:**

=== start-multi-column: ExampleRegion3

\# Column 1

\=== end-column ===

\# Column 2

=== end-multi-column

**Rendered as:**
![Eample_2Column](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_2Column.png?raw=true)

<br>

=== start-multi-column: ExampleRegion4\
\```column-settings\
number of columns: 3\
border: off\
\```

\# Column 1

\=== end-column ===

\# Column 2

\=== end-column ===

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

\=== end-column ===

\# Column 2

\=== end-column ===

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

Currently you can not place a multi-column region within another multi-column region.

<br>

### **Available Commands:**
---

You can access the command pallet with ctrl/command - P. 

#### **Insert Multi-Column Region**
> Will create a two column region where the cursor is located with a randomly generated ID and a default settings block created. Anything currently selected will be moved outside the end of the inserted region as to not overwrite any data.

<br>

#### **Fix Missing IDs For Multi-Column Regions**
> Will search the current document for any region start tags that are missing IDs and randomly generate new IDs for each region.

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

### When rendering in preview window

- There seems to be an issue with the preview view where scrolling to the bottom of a document causes block of content near the top to be removed by obsidian. When this occurs with a multi-column region it makes the scroll bar jump and causes issues finding the information you are looking for. 
    - Potential workarounds: 
        - Shrinking the view width horizontally appears to fix the scrolling problem.
        - Sometimes loading a different file and back can fix the problem but not always.
<br><br>
- ### **Minor Render Issues**
- When entering data into a multi-column region the data can sometimes be rendered a line above or below the intended location in the preview window. When the line is near the start or end of a column or region it may be rendered in the wrong column or outside of the region entirely.
- Copy and pasting text into a new locations within a region may not update in preview view properly.
- When swapping between auto layout or single column, regions may sometimes become stuck rendering an old layout.
- Auto layout regions sometimes get stuck in a non-equal state.
    - Workaround:
        - Swapping to a different file and back, or closing and reopeing the file will force a reload of the data and fix the render issue.

### Other
- Opening large files can cause Obsidian to slow down and lag while the document is being parsed.
    - As of 0.4.0 this should be less of an issue but still keeping an eye on it.
<br><br>
- This plugin currently does not support Obsidian's new markdown editor preview rendering, but hopefully that can be added in the future.
<br><br>
- The Obsidian API and this plugin are both still works in progress and both are subject to change. 

<br><br>

# Version History

### **0.6.2**
- Fixed compatibility issue with Tasks caused by update to renderer in 0.6.0.

### **0.6.1**
- Fixed compatability issue with Dataview caused by update to renderer in 0.6.0.

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
Updated renderer engine to keep track of and properly render special kinds of content. This change fixes some compatability issues with other plugins where buttons were not properly triggering on click. It also fixes some preview issues causing some content to become out of date, for example an update to a query result in a dataview codeblock.
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
- Improved compatability with other plugins.
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