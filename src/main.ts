/*
 * File: multi-column-markdown/src/main.ts
 * Created Date: Tuesday, October 5th 2021, 1:09 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { App, MarkdownView, Notice, Plugin,  MarkdownRenderChild, MarkdownRenderer } from 'obsidian';
import { DivKey, MultiColumnParser, MultiColumnSettings, createMultiColumnParser } from './MultiColumnParser';

export default class MultiColumnMarkdown extends Plugin {
	// settings: SplitColumnMarkdownSettings;

    multiColumnParser: MultiColumnParser = undefined;

	async onload() {

        this.multiColumnParser = createMultiColumnParser();
        this.setupMarkdownPostProcessor();

        //TODO: Set up this as a modal to set settings automatically
        this.addCommand({            
            id: `insert-multi-column-region`,
            name: `Insert Multi-Column Region`,
            editorCheckCallback: (checking, editor, view) => {

                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
                    if (checking === false) {
                        try {
                            editor.getDoc().replaceSelection(
`
=== multi-column-start:Replace-This-With-Region-ID
\`\`\`column-settings
Number of Columns: 2
Largest Column: standard
\`\`\`

=== end-column ===

=== multi-column-end

${editor.getDoc().getSelection()}`
                            );
                        } catch (e) {
                            new Notice(
                                "Encountered an error inserting a multi-column region. Please try again later."
                            );
                        }
                    }
                    return true;
                }
            }
        });
	}

    setupMarkdownPostProcessor() {
        /**
         * Value type structure rather than a reference type class used to
         * keep track of the parent divs within the DOM.
         */
        type multiColumnParent = {
            key: string,
            el: HTMLElement,
            sourcePath: string,
            childRemoved: (divMapID: string) => void,
            rendererUpdated: () => void
        }

        /**
         * This function acts as a constructor for the multiColumnParent type above.
         * It captures all of the passed data as well as defines the nessecary 
         * functions to be captured as closures before returning a new object.
         * 
         * @param key the key for the multiColumnParent within the document map.
         * @param el the htmlelement within the DOM. Used to update the dom when needed.
         * @param sourcePath the path of the file we're in, used for linking to other pages. (I think.)
         * 
         * =====
         * 
         * All other parameters below are not currently used, They are a work in progress
         * for updating the DOM when a child element is deleted without the renderer updating.
         * 
         * @param lineStart 
         * @param renderErrorRegion 
         * @param app 
         * @param multiColumnParser 
         * @param hideColumnDivs 
         * @param setUpColumnMarkdown 
         * @param parseDivText 
         * 
         * @returns a new multiColumnParent structure.
         */
        function createSplitColContainer(key: string, el: HTMLElement, lineStart: number, sourcePath: string, renderErrorRegion: HTMLDivElement, app: App, multiColumnParser: MultiColumnParser,
            hideColumnDivs: (linesToHide: string[], divMap: Map<string, {text: string, el: HTMLElement}>, parseDivText: (lines: string[]) => {keys: DivKey[], originals: string[]}, indexOffset?: number) => void,
            setUpColumnMarkdown: (parentElement: HTMLElement, textFromStart: string, sourcePath: string, multiColumnParser: MultiColumnParser, settings: MultiColumnSettings) => void,
            parseDivText: (lines: string[]) => {keys: DivKey[], originals: string[]}): multiColumnParent {

            /**
             * When one of our multi column blocks is updated within the DOM we
             * call this function. It resets the error message over the
             * block because the renderer will be refreshed at that point.
             */
            function rendererUpdated() {
                renderErrorRegion.innerText = "";
            }

            /**
             * This function is called when a child div is removed from the DOM
             * but the renderer is not updated. Something like cutting out a block
             * of text will make this occur. Here we ideally want to refresh the
             * preview DOM to match the changes. However for right now we display
             * an error to the user that the preview renderer does not match
             * the expected output. This is really only an issue when the user
             * has an editor and preview leaf open.
             * 
             * ======
             * 
             * TODO: Idea: Rather than attempting to refresh the entire text
             * cache on update. We just want to update the required portion
             * of the cache that contains the updated text. Something like
             * slicing out the old text from the cache and rebuilding from 
             * the newly updated DOM. Will require storing more info about
             * the column's children in a struct or class but seems do-able.
             * 
             * @param divMapID This is the ID of the item being removed from the 
             * DOM. The ID is created when the child is initially rendered and 
             * used here to retrieve their data so we can know what has changed 
             * within the DOM.
             */
            function childRemoved(divMapID: string) {

                renderErrorRegion.innerText = "Encountered error rendering multi column markdown. Refresh the preview window or make another change to the file."
            }

            return {key: key, el: el, sourcePath:sourcePath, childRemoved: childRemoved, rendererUpdated: rendererUpdated }
        }


        const columnContainerMap: Map<string, multiColumnParent> = new Map();
        const divMap: Map<string, {text: string, el: HTMLElement}> = new Map();

        // Used to determine if a div was updated in the last draw call or not. 
        // if we reach the elementUnloaded callback below and redererUpdated is
        // false then we know we have to handle the re-rendering of the preview
        // window ourselves.
        let renderUpdated = false;
        function elementUnloaded(divMapID: string, onUnload?: ()=>void) {
            if(renderUpdated === false) {
                if(onUnload) {
                    onUnload()
                }
                // console.log("Nothing updated, updating in callback.")
                divMap.delete(divMapID);
            }
            else {
                divMap.delete(divMapID);
            }
            renderUpdated = false
        }

        this.registerMarkdownPostProcessor(async (el, ctx) => {

            // Get the info for our current context and then check
            // if the entire text contains a start tag. If there is
            // no start tag in the document we can just return and
            // ignore the rest of the parsing.
            let info = ctx.getSectionInfo(el);
            let elementMarkdownRenderer = null;
            let divMapID = ""

            const sourcePath =
            typeof ctx == "string"
                ? ctx
                : ctx?.sourcePath ??
                    this.app.workspace.getActiveFile()?.path ??
                    "";    

            // Whenever there is an update to the document window we
            // want to capture the div being rendered so we can use it ourselves
            // this currently is mostly used to render an error when the div is
            // removed but not updated. Working on re-rendering the data to the
            // screen if the data has been updated.
            if(info){

                let index = 0;
                let allTextLines = info.text.split("\n");
                for(let i = 0; i < info.lineStart; i++) {

                    if(allTextLines[i] !== "") {
                        index++;
                    }
                }
                let startLine = index;
                let endLine = startLine + ((info.lineEnd) - info.lineStart);

                let text = info.text.split("\n").slice(info.lineStart, info.lineEnd + 1).reduce((prev, curr) => {
                    return prev + "\n" + curr
                }, "")
    

                text = this.multiColumnParser.formatDivText(text);
                if(text.startsWith("\n")) {
                    text = text.slice(1, text.length);
                }
    
                divMapID = startLine + text + endLine;
                divMap.set(divMapID, {text: text, el: el });
                elementMarkdownRenderer = new MarkdownRenderChild(el);
                elementMarkdownRenderer.onunload = () => {
                    elementUnloaded(divMapID);
                };
                ctx.addChild(elementMarkdownRenderer);

                // We want to check here if there is a start tag in the documnet
                // and if not we can immediatly exit the function.
                if(this.multiColumnParser.containsStartTag(info.text).found === false) {
                    return;
                }
            }
            else {
                return;
            }

            // Check if the line currently passed to processor contains the 
            // start regex that we want. If so we need to store a reference
            // to the element and the context to be used later.
            if(this.multiColumnParser.containsStartTag(el.textContent).found === true) {

                // If our regex matches we can split the data by - to 
                // get the column identifier. We use this to store in
                // our map to know what div to store our markdown in
                // when later the data is updated within the block.
                let key = el.textContent.split(":")[1]

                // remove the text from the container so it does not
                // appear in the render and set the ID.
                // Also set the proper CSS classes here.
                el.id = `TwoColumnContainer-${key}`
                el.children[0].detach();
                el.classList.add("multiColumnContainer")

                let renderErrorRegion = el.createDiv({
                    cls: `multiColumnErrorMessage`,
                });
                let renderColumnRegion = el.createDiv({
                    cls: `RenderColRegion`
                })

                columnContainerMap.set(key, createSplitColContainer(key, renderColumnRegion, info.lineStart, sourcePath, renderErrorRegion, this.app, this.multiColumnParser, this.hideColumnDivs, this.setUpColumnMarkdown, this.multiColumnParser.parseDivText));

                // Take the entire document and get the data starting from our start tag.
                let linesBelowArray = info.text.split("\n").splice(info.lineStart + 1);

                // Now pass to a parser to find our end tag, another start tag (no recursion), or the end of the file.
                // We want it to include the end tag so we can hide any divs below us if needed.
                let linesBelowArrayIncEnd = this.multiColumnParser.getEndBlockBelowLine(linesBelowArray, true);
                this.hideColumnDivs(linesBelowArrayIncEnd, divMap, this.multiColumnParser.parseDivText, info.lineStart + 1);

                // Now slice off the end tag so we have an array of just the text to be displayed to the screen.
                linesBelowArray = linesBelowArray.slice(0, linesBelowArray.length - 1);
                linesBelowArray = this.multiColumnParser.getEndBlockBelowLine(linesBelowArray);

                // Reduce the text back to a single string.
                let textFromStart = linesBelowArray.reduce((prev, current) => {
                    return prev + "\n"  + current;
                }, "");

                // Parse out a settings block if one exists.
                let settingsData = this.multiColumnParser.parseColumnSettings(textFromStart);
                textFromStart = settingsData.text;

                // Pass all necessary data to the renderer.
                this.setUpColumnMarkdown(renderColumnRegion, textFromStart, sourcePath, this.multiColumnParser, settingsData.settings);

                renderUpdated = true;
                return;
            }

            // If our current line is an end tag we want to set the data to
            // everything above us in the current block.
            if(this.multiColumnParser.containsEndTag(el.textContent).found === true) {

                let initialLinesAboveArray = info.text.split("\n").splice(0, info.lineStart);
                let { startBlockKey, linesAboveArray } = this.multiColumnParser.getStartBlockAboveLine(initialLinesAboveArray);

                // Attempt to get parent from the map, if it doesnt exist s
                // something went wrong so we want to return immediatly.
                let parent: multiColumnParent = null;
                if(columnContainerMap.has(startBlockKey)) {
                    parent = columnContainerMap.get(startBlockKey);
                }
                else {
                    return;
                }
                
                elementMarkdownRenderer.onunload = () => {
                    elementUnloaded(divMapID, ()=>{
                        parent.childRemoved(divMapID);
                    });
                };

                this.hideColumnDivs(linesAboveArray, divMap, this.multiColumnParser.parseDivText);

                // Concat and filter down all of the lines we want to display.
                let textFromStart = linesAboveArray.reduce((prev, current) => {
                    return prev + "\n"  + current;
                }, "");

                el.children[0].detach()

                let settingsData = this.multiColumnParser.parseColumnSettings(textFromStart);
                textFromStart = settingsData.text;

                this.setUpColumnMarkdown(parent.el, textFromStart, sourcePath, this.multiColumnParser, settingsData.settings);

                renderUpdated = true;
                parent.rendererUpdated();

                return;
            }

            // else if the line we are parsing does not contain a start tag
            // but there is at least one start tag on the page we want to 
            // then check if the line we are parsing is within a column
            // block.
            //
            // Take the entire document text and split it by new lines.
            // Then we get the set of lines above our start line.
            // Then we reduce back down to a single string of all lines above.
            let initialLinesAboveArray = info.text.split("\n").splice(0, info.lineStart);
            let { startBlockKey, linesAboveArray } = this.multiColumnParser.getStartBlockAboveLine(initialLinesAboveArray);
            
            if(startBlockKey === "") {
                // We are not within a multi column block so we just return here.
                return;
            }

            // Attempt to get parent from the map, if it doesnt exist
            // something went wrong so we want to return immediatly.
            let parent: multiColumnParent = null;
            if(columnContainerMap.has(startBlockKey)) {
                parent = columnContainerMap.get(startBlockKey);
            }
            else {
                return;
            }
            elementMarkdownRenderer.onunload = () => {
                elementUnloaded(divMapID, ()=>{
                    parent.childRemoved(divMapID)
                });
            };

            let linesBelowArray = info.text.split("\n").splice(info.lineStart);
            linesBelowArray = this.multiColumnParser.getEndBlockBelowLine(linesBelowArray);

            // Concat and filter down all of the lines we want to display.
            let textFromStart = linesAboveArray.concat(linesBelowArray).reduce((prev, current) => {
                return prev + "\n"  + current;
            }, "");

            if(el.children.length > 0) {
                el.children[0].detach()
            }

            let settingsData = this.multiColumnParser.parseColumnSettings(textFromStart);
            textFromStart = settingsData.text;

            this.setUpColumnMarkdown(parent.el, textFromStart, sourcePath, this.multiColumnParser, settingsData.settings);

            renderUpdated = true;
            parent.rendererUpdated();
            // TODO: Find a way to remove the element from the DOM? Minor "bug" but would like to fix.
            return;
        });
    }

    /**
     * We want to get a list of the text contained within each "sibling"
     * div in the DOM. However there is something about how obsidian
     * works with the divs that make this more difficult to achieve
     * than one would expect. This function is a work around that problem.
     * 
     * Above we set up a callback that creates a map of all of the divs 
     * displayed on the dom. When this function is called we are passed
     * a long text string that contains the text we want to hide from the DOM
     * this text must be parsed to find the proper keys.
     * @param linesToHide 
     * @param divMap 
     * @param parseDivText a function that will take in the strings and return the DivKeys of each line.
     */
    hideColumnDivs(linesToHide: string[], 
                   divMap: Map<string, {text: string, el: HTMLElement}>, 
                   parseDivText: (linesToHide: string[]) => {keys: DivKey[], originals: string[]}, indexOffset: number = 0) {

        let { keys } = parseDivText(linesToHide);

        // Now we have a list of the keys to remove from the DOM.
        // and if the key is in the map we set the element's text to empty string.
        // TODO: Should we reset all of the other items in the dom to active? 
        // probably would cause some bugs with enabling data from other areas
        // but currently there is a bug with stuff remaining removed after
        // being hidden in this way.
        for(let i = 0; i < keys.length; i++) {
            let key = keys[i].getKeyWithOffset(indexOffset)
            if(divMap.has(key)) {
                divMap.get(key).el.textContent = ""
            }
        }
    }

    /**
     * This function takes in the data for the multi-column region and sets up the 
     * user defined number of children with the proper css classes to be rendered properly.
     * 
     * @param parentElement The element that the multi-column region will be rendered under.
     * @param textFromStart The text that will be parsed and rendered into the multi-column region
     * @param sourcePath The path of the file used for creating internal links (I think.)
     * @param multiColumnParser The parser object that will parse the text from the start.
     * @param settings The settings the user has defined for the region.
     */
    setUpColumnMarkdown(parentElement: HTMLElement, textFromStart: string, sourcePath: string,
        multiColumnParser: MultiColumnParser, settings: MultiColumnSettings) {

        let multiColumnParent = createDiv({
            cls: `multiColumnParent rowC`,
        });
        if(settings.drawShadow === true) {
            multiColumnParent.addClass("multiColumnParentShadow");
        }

        let columnContentDivs = multiColumnParser.getColumnContentDivs(settings, multiColumnParent);

        for(let i = 0; i < columnContentDivs.length; i++) {
            if(settings.drawBorder === true) {
                columnContentDivs[i].addClass("columnBorder");
            }

            if(settings.drawShadow === true) {
                columnContentDivs[i].addClass("columnShadow");
            }
        }

        // Create markdown renderer to parse the passed markdown
        // between the tags.
        let markdownRenderChild = new MarkdownRenderChild(
            multiColumnParent
        );

        // Remove every other child from the parent so 
        // we dont end up with multiple sets of data. This should
        // really only need to loop once for i = 0 but loop just
        // in case.
        for(let i = 0; i < parentElement.children.length; i++) {
            parentElement.children[i].detach();
        }        
        parentElement.appendChild(markdownRenderChild.containerEl);

        let columnText = multiColumnParser.splitTextByColumn(textFromStart, settings.numberOfColumns);
        // And then render the parsed markdown into the divs.
        for(let i = 0; i < columnContentDivs.length; i++) {
            MarkdownRenderer.renderMarkdown(
                columnText[i],
                columnContentDivs[i],
                sourcePath,
                markdownRenderChild
            );
        }
    }
}

