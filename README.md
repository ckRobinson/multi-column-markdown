# Multi-Column Markdown

Take your boring markdown document and add some columns to it! With Multi Column 
Markdown rather than limiting your document layout to a single linear file you can 
now define blocks of data to be laid out horizontally next to each other. This
additional functionality gives you the freedom to structure your notes in more
creative ways. 

<br>

![Preview_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Preview_1.png?raw=true)

<br>

---
## **A Word On Live Preview**
---
Live preivew has been supported in Multi-Column Markdown, however cross compatibilty with other plugins, anything that requires interaction (IE: button clicks), and more advanced, non-naitive markdown, Obsidian features may or may not be supported in this mode. 

Due to how custom live preview plugins are implemented within CodeMirror6 and hook into Obsidian, I can not guarentee all plugins will render properly within live preview at this point. Plugins that do not render their content immediatly, such as needing to wait for a dataview query, do not render properly. 

This plugin was originally intended for use only in Reading mode where plugins have more control over how content is rendered. *Most* plugins, interactive elements, advanced markdown, and visual stylings will render better and have far more cross compatibility in Reading mode.

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

\--- end-multi-column

Text displayed below.


**Rendered as:**
![Example_1](https://github.com/ckRobinson/multi-column-markdown/blob/master/images/Example_1.png?raw=true)

---


<br>

# Syntax Reference

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
*Any Additional Setting flags (see below)*\
\```

\```multi-column-start\
ID: A_unique_region_ID_2\
*Any Additional Setting flags (see below)*\
\```

#### **End a Column:**
\--- column-end \---\
\--- end-column \---\
\--- column-break \---\
\--- break-column \---

<br>

#### **End Multi-Column Region:**
\--- end-multi-column\
\--- multi-column-end

<br>

## **Region Settings:**

#### **ID:**
- **Setting Flags**:
    - ID:
- **Valid Selections**:
    - Any string of characters.
<br>
---
- The ID is used to differentiate between different regions if there are multiple in the same document.
- Each ID must be unique within the same document or unexpected render issues may occur. An ID may be used across multiple documents so that, for example, you can use the ID "dailynote" in the template used for your Periodic Notes.
- Can be ommitted if there will only ever be a single column region in the document.

<br>

#### **Number of Columns:**
- **Setting Flags**:
    - Number of Columns:
    - Num of Cols:
    - Col Count:
- **Valid Selections**:
    - Any digit.

<br>

#### **Column Size:**
By default all of the columns will be set to equal size if this option is omitted.<br>
_Can define on a per column basis with array syntax: EG: [25%, 75%]_

- **Setting Flags**:
    - Column Size:
    - Col Size:
    - Column Width:
    - Col Width:
    - Largest Column:
- **Valid Selections**:
    - Single Column layout:
        - Small
        - Medium
        - Large
        - Full
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
    - Allows *most* CSS unit lengths (px, pt, %, etc).

<br>


#### **Border:**
By default the border is enabled but can be removed with:<br>
_Can define on a per column basis with array syntax: EG: [off, on, off]_

- **Setting Flags**:
    - Border:
- **Valid Selections**:
    - disabled
    - off
    - false

<br>

#### **Shadow:**
On by default, can be removed with:

- **Setting Flags**:
    - Shadow:
- **Valid Selections**:
    - disabled
    - off
    - false

<br>

#### **Column Position or Column Location:**
Only used with the single column option.

- **Setting Flags**:
    - Column Position:
    - Col Position:
    - Column Location:
    - Col Location:
- **Valid Selections**:
    - Left
    - Right
    - Center
    - Middle

<br>

#### **Column Spacing:**
Used to set the distance between all of the columns.<br>
_Can define on a per column basis with array syntax: EG: [5px, 10px]_

- **Setting Flags**:
    - Column Spacing:
- **Valid Selections**:
    - Allows *most* CSS unit lengths (px, pt, %, etc).
    - A number alone without a defined unit type defaults to pt unit.

<br>

#### **Content Overflow:**
Should the columns cut off anything that goes outside the column bounds or should it be scrollable.

- **Setting Flags**:
    - Overflow:
    - Content Overflow:
- **Valid Selections**:
    - Scroll (Default)
    - Hidden

<br>

#### **Alignment:**
Choose the alignment of the content in the columns.<br>
_Can define on a per column basis with array syntax: EG: [Left, Center]_

- **Setting Flags**:
    - Alignment:
    - Content Alignment:
    - Content align:
    - Text Align:
- **Valid Selections**:
    - Left (Default)
    - Center
    - Right

<br>

####  **Auto Layout**
- **Setting Flags**:
    - Auto Layout:
- **Valid Selections**:
    - true
    - on
<br>
---

Auto layout regions do not use defined column breaks. Instead these type of multi-column regions will attempt to balance all content equally between the columns. Headings are also attempted to be preserved so that a heading block will not end a column but will instead be moved to the top of the next column with it's corresponding content.

To use this feature set "Auto Layout: true" within the region settings.

<br>

---
## Plugin Cross Compatibility.
---
Not all plugins will be cross compatable within a multi-column region. Depending on the implementation or use case, some plugins will either entierly not render, render incorrectly, or render but be uninteractable. For the most part, due to how Obsidian plugins work, there is little that can be done at this stage to guarentee cross compatibility. And this is even more the case when using Live Preview. You can check the [Cross Compatibility](documentation/CrossCompatibility.md) sheet for plugins known to work within columns. Anything not on that list has not been tested. 

---
## Obsidian Theming
---
Just as with cross compatibilty above, multi-column regions may be affected by the Obsidian Theme you are running. There is very little non-layout dependent CSS within MCM but some themes may add or remove elements neccessary to properly render the columns. If regions do not render properly in a specific theme, feel free to open an issue and make sure to include what Obsidian theme you are running when describing the problem.

<br>

# **Full Mutli-Column Examples:**

[Here](documentation/FullExamples.md)

<br>


<br>

# **Plugin Commands:**

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

- Clicking within a document causes the document to flash before recentering on the cursor location.

- Clicking outside of the editor and then back in may cause the viewport to jump to the bottom of the editor in certain circumstances.

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

#### **Settings Regions**: 
\```settings\```\
\```column-settings\```\
\```multi-column-settings\```

#### **End a Column:**
- \=== column-end ===
- \=== end-column ===
- \=== column-break ===
- \=== break-column ===

#### **End Multi-Column Region:**
- \=\=\= end-multi-column
- \=\=\= multi-column-end

# Change Log

### **0.8.0**
- **Unlimited Columns**
    - You can now define an unlimited number of columns within your settings blocks. All columns that extend beyond the viewport will be visible when scrolling the column region.
    - Use the column size settings flag and the new settings array syntax to define custom column widths.<br>(EG: "Column size: [20%, 30%, 50%, 100%]")
    - Implemented for FR #45, #46, #47
- **Multiple setting values per column**
    - You can now define certain settings to be different for each column. 
    - Use the syntax: "Alignment: [Left, Center, Right]" 
    - The following settings can be defined in this way:
        - Column Size
        - Column Border
        - Column Spacing
        - Column Overflow
        - Text Alignment
- **Live preview scroll "fix"**
    - Added new CM6 module that attempts to fix the viewport scroll issue in live preview.
    - The module attempts to keep the viewport centered on the cursor by moving the view after Obsidian rerenders the document.
    - Known issues:
        - The viewport will appear to flash as it jumps to the new cursor location. This appears to be more or less noticable depending on the machine.
        - Swapping out and back into Obsidian causes the document to jump to the bottom of the document.
        - Clicking back into an editor view without moving the cursor can cause the viewport to jump to the bottom of the document.
- Updated column break flag to trigger properly when attached to the end of lists.
- Added new check for custom frame plugins that fixes rendering in view mode.
- Fixed a bug that caused theme CSS to not apply to tables when rendered in live preview.
- Updated live preview to properly render PDFs.

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

## Older Changes:

[Change log](ChangeLog.md)


# Support Me:

<a href="https://www.buymeacoffee.com/ckrobinson" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="45" /></a>

<a href='https://ko-fi.com/ckrobinson' target='_blank'><img height='35' style='border:0px;height:46px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />