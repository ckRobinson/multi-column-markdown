# Multi-Column Markdown

Take your boring markdown document and add some columns to it! With Multi Column 
Markdown rather than limiting your document layout to a single linear file you can 
now define blocks of data to be layed out horizontally next to each other. This
additional functionality gives you the freedom to structure your notes in more
creative ways. 

This plugin is built for the [Obsidan](https://obsidian.md/) markdown note taking application using their plugin API.

<br><br>


# Usage:


You create a multi-column region by defining the start, settings, column-end, and end tags. EG:

<br>

Text displayed above.

=== start-multi-column:\<block_id>\
\```column-settings\
number of columns: 2\
largest column: left\
\```

Text displayed in column 1.

=== end-column ===

Text displayed in column 2.

=== end-multi-column

Text displayed below.


**Rendered as:**
![Eample_1](https://github.com/ckRobinson/multi-column_markdown/blob/master/images/Example_1.png?raw=true)

---

<br>

Each tag type can be defined with the following options:

- Start Multi-Column Region:
    - === start-multi-column:\<block_id>
    - === multi-column-start:\<block_id>
- End Multi-Column Region:
    - === end-multi-column
    - === multi-column-end
- End a Column:
    - === column-end ===
    - === end-column ===
- Settings Region:
    - \```settings```
    - \```column-settings```
    - \```multi-column-settings```

<br>

### **Valid Column Settings:**
---

The column settings block can be omitted which will by default set the region to two equal sized columns. To change how the region is rendered you must define a settings block. The settings tags and all valid options for each setting are listed below.

The settings block must be define right after the multi-column start tag and each settings tag must be on a separate line. EG:

=== start-multi-column:\<block_id>\
\```column-settings\
number of columns: 2\
largest column: left\
border: enabled\
\```

<br>

### **Settings Tags:**

Number of Columns: 
- 2 or 3

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

<br>

### **Full Examples:**
---

=== start-multi-column:exampleID_2Columns

\# Column 1

=== end-column ===

\# Column 2

=== end-multi-column

**Rendered as:**
![Eample_2Column](https://github.com/ckRobinson/multi-column_markdown/blob/master/images/Example_2Column.png?raw=true)

<br>

=== start-multi-column:exampleID_3Columns\
\```column-settings\
number of columns: 3\
border: off\
\```

\# Column 1

=== end-column ===

\# Column 2

=== end-column ===

\# Column 3

=== end-multi-column

**Rendered as:**
![Eample_3Column_1](https://github.com/ckRobinson/multi-column_markdown/blob/master/images/Example_3Column_1.png?raw=true)

<br>

=== start-multi-column:exampleID_3ColumnsLargestCenter\
\```settings\
number of columns: 3\
largest column: center\
\```

\#### Column 1

=== end-column ===

\# Column 2

=== end-column ===

\#### Column 3

=== end-multi-column

**Rendered as:**
![Eample_3Column_2](https://github.com/ckRobinson/multi-column_markdown/blob/master/images/Example_3Column_2.png?raw=true)

<br>

### **Things to note:**

---

After defining start-multi-column you must declare an ID for 
the region. The ID is used to differentiate between different regions if there are multiple in the same document.

Currently you can not place a multi-column region within another multi-column region.

<br>

### **Commands:**
---

You can access the command pallet with ctrl/command - P. 

- ### Available Commands:
    - #### Insert Multi-Column Region
        - Will create a two column region where the cursor is located.
        - #### Known Issues:
            - If the preview pane is open the columns will not be rendered properly initially. To fix close and reopen the preview window, sometimes this requires changing to a different file and back.  

<br><br>

# Installation

## From Obsidian Community Plugins

This plugins is currently not published in the Obsidian Community Plugins, to install please follow the GitHub installation instructions below.

~~You can install this plugin from the Obsidian Community Plugins menu by following these steps:~~

- ~~Open Settings within Obsidian~~
- ~~Click Community plugins and ensure Safe mode is disabled~~
- ~~Browse community plugins and find "Multi-Column Markdown"~~
- ~~Click Install~~
- ~~After installation is finished, click Enable~~

## From GitHub Repository

Download main.js, manifest.json, styles.css from the latest release and add a new directory: [Obsidian-vault]/.obsidian/plugins/multi-column-markdown and add the files to that directory. 

If this is your first Obsidian plugin close and reopen Obsidian and then open the settings menu, click the Community plugins tab to the left, ensure Safe mode is disabled, and then enable "Multi-Column Markdown" in the installed plugins list.

<br><br>

# Known Issues

### When preview pane and edit pane are open at the same time.

- Cutting out a line or deleting the last character on a line that was within a multi-column region will not update in the preview pane.
    - Quick Fix #1: Close and reopen the preview pane. Sometimes this requires swapping to a new file and back.

    - Quick Fix #2: Add a new character to an already existing line and then remove the character. This will force a full refresh of the multi-column region.
- Adding a new multi-column region around an existing set of data causes the existing data to be rendered twice. Once as the original data and again within the new multi-column region.
    - Quick Fix: Close and reopen the preview pane. Sometimes this requires swapping to a new file and back.

### Other
- This plugin currently does not support Obsidian's new markdown editor preview rendering, but hopefully that can be added in the future.

- The Obsidian API and this plugin are both still works in progress and both are subject to change. 

<br><br>

# Version History

### **0.2.0**
Added additional setting to the multi-column regions. Users can now disable the borders around the regions if desired by setting "border: disabled" within the settings block.

### **0.1.0**
Initial release.
- Obsidian properly parses the syntax used by this plugin.
- Documents with multi-column regions are rendered properly in the document preview.
- Includes custom command to quickly add a multi-column region to a document.

