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

After defining the start tag you must declare an ID for the region. The ID is used to differentiate between different regions if there are multiple in the same document.

Each ID must be unique within the same document or unexpected render issues may occur. An ID may be used across multiple documents so that, for example, you can use the ID "dailynote" in the template used for your Periodic Notes.

By using the "Insert Multi-Column Region" command (more below) the start ID will be pre-set as a randomly generated 4 character string.

You can also use the "Fix Missing IDs" command which will search the currently open document and append random IDs to all regions that are missing one.

<br>

### **Valid Syntax Tags:**

<br>

Each tag type can be defined with the following options:

#### **Start Multi-Column Region:**
\```start-multi-column\
ID: A_unique_region_ID\
*Any Additional Settings (see below)*\
\```

\```multi-column-start\
ID: A_unique_region_ID_2\
*Any Additional Settings (see below)*\
\```

#### **End a Column:**
\--- column-end \---\
\--- end-column \---\
\--- column-break \---\
\--- break-column \---

#### **End Multi-Column Region:**
- \=\=\= end-multi-column
- \=\=\= multi-column-end

<br>

### **Valid Setting Options:**

#### **ID:**
- Any string of characters.
- The ID is used to differentiate between different regions if there are multiple in the same document.
- Each ID must be unique within the same document or unexpected render issues may occur. An ID may be used across multiple documents so that, for example, you can use the ID "dailynote" in the template used for your Periodic Notes.
- Can be ommitted if there will only ever be a single column region in the document.

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

#### **Alignment:**
Choose the alignment of the content in the columns.
- Valid Options
    - Left (Default)
    - Center
    - Right

<br>

### **Auto Layout**
---

Auto layout regions do not use defined column breaks. Instead these type of multi-column regions will attempt to balance all content equally between the columns. Headings are also attempted to be preserved so that a heading block will not end a column but will instead be moved to the top of the next column with it's corresponding content.

To use this feature set "Auto Layout: true" within the region settings.

<br>

## **Live Preview**
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
ID: ExampleRegion4\
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

\```start-multi-column\
ID: ExampleRegion5\
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

\```start-multi-column\
ID: ExampleRegion6\
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

<br>

#### **Toggle Mobile Rendering - Multi-Column Markdown**
Enables or disables column rendering on mobile devices only.

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

#### **Codeblock Start Tags**
- Having an edit view and reading view of the same document open at the same time causes render issues when using codeblock start tags.

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

# Depreciated
These syntax options are currently still supported but are being depreciated for the newer syntax above.

#### **Start Multi-Column Region:**
- === start-multi-column: A_unique_region_ID_2
- === multi-column-start: A_unique_region_ID_3

#### **Settings Regions: 
\```settings\```\
\```column-settings\```\
\```multi-column-settings\```

#### **End a Column:**
- \=== column-end ===
- \=== end-column ===
- \=== column-break ===
- \=== break-column ===

# Change Log

### **0.7.6**
- Fixed bug in live preview that caused Obsidian 1.1.0 to hang on start up.

### **0.7.4**
- Added option to change text alignment within columns.
    - Merged from PR by lucabello
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

## Older Changes:

[Change log](ChangeLog.md)


# Support Me:

<a href="https://www.buymeacoffee.com/ckrobinson" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60" /></a>

<a href='https://ko-fi.com/ckrobinson' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />