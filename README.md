# Multi Column Markdown

Take your boring markdown document and add some columns to it! With Multi Column 
Markdown rather than limiting your document layout to a single linear column of 
text you can define blocks of data to be layed out horizontally next to each 
other, allowing for more creative ways to structure your notes. See the example
below for how this can be used.


**Note 1:** The Obsidian API and this plugin are still works in progress and 
both are subject to change. 

**Note 2:** This plugin currently does not support Obsidian's new markdown 
editor preview rendering, but hopefully that can be added in the future.


## Example:

After enabling the plugin you can mark a set of markdown with the following 
format:

=== start-multi-column:\<block_id>

\# Column 1

=== column-end ===

\# Column 2

=== end-multi-column

Which when viewed from the Obsidian Markdown preview window will be displayed 
as:

\<Link to Image>

### **Things to note:**

After defining start-multi-column you must declare an ID for 
the block. The ID is used to differentiate between separate blocks when they are
rendered.

Currently you can not place a multi column within another multi column.

# Version History

### **0.0.1**
Initial release.

# Installation

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.
