# Multi-Column Markdown

Take your boring markdown document and add some columns to it! With Multi Column 
Markdown rather than limiting your document layout to a single linear file you can 
now define blocks of data to be layed out horizontally next to each other. This
additional functionality gives you the freedom to structure your notes in more
creative ways. 

This plugin is built for the [Obsidan](https://obsidian.md/) markdown note taking application using their plugin API.

**Note:** The Obsidian API and this plugin are both still works in progress and both are subject to change. 

---

## Usage:

---

You create a multi-column region by defining the start, settings, column-end, and end tags. EG:

<br>

---
=== start-multi-column:\<block_id>\
\```column-settings\
number of columns: 2\
largest column: left\
\```

Text displayed in column 1.

=== end-column ===

Text displayed in column 2.

=== end-multi-column

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

---
### Valid Column Settings:
---

By default the settings block can be omitted. A multi-column region will display two equal sized columns by default. To make changes you must define the settings block and use the following valid setting keys and options where each key is on its own line.

### Keys:

Number of Columns: 
- Either 2 or 3.

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

---
#### Full Examples:
---

=== start-multi-column:exampleID_2Columns\

\# Column 1

=== end-column ===

\# Column 2

=== end-multi-column

<br>

=== start-multi-column:exampleID_3Columns\
\```column-settings\
number of columns: 3\
\```

\# Column 1

=== end-column ===

\# Column 2

=== end-column ===

\# Column 3

=== end-multi-column

<br>

=== start-multi-column:exampleID_3ColumnsLargestCenter\
\```settings\
number of columns: 3\
largest column: center\
\```

\# Column 1

=== end-column ===

\# Column 2

=== end-column ===

\# Column 3

=== end-multi-column

---

### **Things to note:**

---

After defining start-multi-column you must declare an ID for 
the block. The ID is used to differentiate between separate blocks when they are
rendered.

Currently you can not place a multi column within another multi column.

# Installation

## From Obsidian Community Plugins

You can install this plugin from the Obsidian Community Plugins menu by following these steps:

- Open Settings within Obsidian
- Click Third-party plugin and ensure Safe mode is disabled
- Browse community plugins and find "Multi-Column Markdown"
- Click Install
- After installation is finished, click Enable

# From GitHub Repository

Download main.js, manifest.json, styles.css from the latest release and add a new directory: [Obsidian-vault]/.obsidian/plugins/multi-column-markdown folder and add the files to that directory.

# Known Issues

### When preview pane and edit pane are open at the same time.

- Cutting a line or deleting the last character from a line within a multi-column region will not update in the preview pane.
    - Quick Fix #1: Close and reopen the preview pane. Sometimes this requires swapping to a new file and back.

    - Quick Fix #2: Add a new character to an already existing line and then remove the character. This will force a full refresh of the multi-column region.

### Other
- This plugin currently does not support Obsidian's new markdown editor preview rendering, but hopefully that can be added in the future.
# Version History

### **0.0.1**
Initial release.
