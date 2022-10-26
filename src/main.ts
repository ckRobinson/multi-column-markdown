/*
 * File: multi-column-markdown/src/main.ts
 * Created Date: Tuesday, October 5th 2021, 1:09 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { Notice, Plugin,  MarkdownRenderChild, MarkdownRenderer, TFile, Platform } from 'obsidian';
import * as multiColumnParser from './utilities/textParser';
import { FileDOMManager, GlobalDOMManager } from './dom_manager/domManager';
import { MultiColumnRenderData } from "./dom_manager/regional_managers/regionManager";
import { RegionManager } from "./dom_manager/regional_managers/regionManager";
import { RegionManagerContainer } from "./dom_manager/regional_managers/regionManagerContainer";
import { DOMObject, DOMObjectTag, TaskListDOMObject } from './dom_manager/domObject';
import { fileStillInView, getFileLeaf, getLeafSourceMode, getUID } from './utilities/utils';
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from './utilities/cssDefinitions';
import { ElementRenderType } from './utilities/elementRenderTypeParser';
import { multiColumnMarkdown_StateField } from './live_preview/cm6_livePreview';
import { parseStartRegionCodeBlockID } from './utilities/settingsParser';

interface MCM_Settings {
    renderOnMobile: boolean;
}
const DEFAULT_SETTINGS: MCM_Settings = {
    renderOnMobile: true
};

const CODEBLOCK_START_STRS = [
    "start-multi-column",
    "multi-column-start"
]
export default class MultiColumnMarkdown extends Plugin {

    settings: MCM_Settings = DEFAULT_SETTINGS;
    globalManager: GlobalDOMManager = new GlobalDOMManager();

	async onload() {

        console.log("Loading multi-column markdown");

        await this.loadSettings();

        this.globalManager = new GlobalDOMManager();

        this.registerEditorExtension(multiColumnMarkdown_StateField)

        for(let i = 0; i < CODEBLOCK_START_STRS.length; i++) {

            let startStr = CODEBLOCK_START_STRS[i]
            this.setupMarkdownCodeblockPostProcessor(startStr);
        }
        this.setupMarkdownPostProcessor();

        this.addCommand({            
            id: `toggle-mobile-rendering-mcm`,
            name: `Toggle Mobile Rendering - Multi-Column Markdown`,
            callback: async () => {

                this.settings.renderOnMobile = !this.settings.renderOnMobile; 
                await this.saveSettings();

                console.log("render on mobile:", this.settings.renderOnMobile);

                let noticeString = `Toggled mobile rendering ${this.settings.renderOnMobile ? "on" : "off"}.`
                if(Platform.isMobile === true) {
                    noticeString += ` Please reload any open files for change to take effect.`
                }
                new Notice (noticeString);
            }
        });

        //TODO: Set up this as a modal to set settings automatically
        this.addCommand({            
            id: `insert-multi-column-region`,
            name: `Insert Multi-Column Region`,
            editorCallback: (editor, view) => {

                try {
                    let cursorStartPosition = editor.getCursor("from");

                    editor.getDoc().replaceSelection(
`
\`\`\`start-multi-column
ID: ID_${getUID(4)}
Number of Columns: 2
Largest Column: standard
\`\`\`



--- column-end ---



=== end-multi-column

${editor.getDoc().getSelection()}`
                    );
                    
                    cursorStartPosition.line = cursorStartPosition.line + 7
                    cursorStartPosition.ch = 0;

                    editor.setCursor(cursorStartPosition);
                } catch (e) {
                    new Notice(
                        "Encountered an error inserting a multi-column region. Please try again later."
                    );
                }
            }
        });

        this.addCommand({            
            id: `add-IDs-To-multi-column-region`,
            name: `Fix Missing IDs for Multi-Column Regions`,
            editorCallback: (editor, view) => {

                try {
                    /**
                     * Not sure if there is an easier way to do this.
                     * 
                     * Get all of the lines of the document split by newlines.
                     */
                    let docText = editor.getRange({ line: 0, ch: 0 }, { line: editor.getDoc().lineCount(), ch: 0});
                    let lines = docText.split("\n");

                    let startCodeblock = multiColumnParser.findStartCodeblock(docText);
                    let lineOffset = 0;
                    let numCodeblocksUpdated = 0;
                    while(startCodeblock.found === true) {

                        // Get the text of the settings block so we can check if it contains an ID,
                        // also so we can get the length of the first line, used to calculate where to append a new ID if needed
                        let settingsText = docText.slice(startCodeblock.startPosition, startCodeblock.endPosition);
                        let firstLineOfCodeblockLength = settingsText.split("\n")[0].length;
                        
                        // We need the lines before the block to know where to start replacing text
                        // and the lines including the block to know where to set our offset to after this iteration.
                        let linesBefore = docText.slice(0, startCodeblock.startPosition);
                        let startReplacementLineIndex = (linesBefore.split("\n").length - 1) + lineOffset;
                        let linesOf = docText.slice(0, startCodeblock.endPosition);
                        let endReplacementLineIndex =  (linesOf.split("\n").length - 1) + lineOffset;

                        let settingsID = parseStartRegionCodeBlockID(settingsText);
                        if(settingsID === "") {

                            // copy the first line of the codeblock and append a new ID, then replace the first line of the block
                            let replacementText = editor.getRange({ line: startReplacementLineIndex, ch: 0 }, { line: startReplacementLineIndex, ch: firstLineOfCodeblockLength}) + `\nID: ID_${getUID(4)}`
                            editor.replaceRange(replacementText, { line: startReplacementLineIndex, ch: 0 }, 
                                                                 { line: startReplacementLineIndex, ch: firstLineOfCodeblockLength});
                            endReplacementLineIndex += 1;
                            numCodeblocksUpdated += 1;
                        }

                        lineOffset = endReplacementLineIndex
                        docText = docText.slice(startCodeblock.endPosition);
                        startCodeblock = multiColumnParser.findStartCodeblock(docText);
                    }

                    /**
                     * Loop through all of the lines checking if the line is a 
                     * start tag and if so is it missing an ID.
                     */
                    let linesWithoutIDs = []
                    let textWithoutIDs = []
                    for(let i = 0; i < lines.length; i++) {

                        let data = multiColumnParser.isStartTagWithID(lines[i]);
                        if(data.isStartTag === true && data.hasKey === false) {
                            linesWithoutIDs.push(i);
                            textWithoutIDs.push(lines[i])
                        }
                    }                    

                    if(linesWithoutIDs.length === 0 && numCodeblocksUpdated === 0) {
                        new Notice ("Found 0 missing IDs in the current document.");
                        return;
                    }

                    /**
                     * Now loop through each line that is missing an ID and
                     * generate a random ID and replace the original text.
                     */
                    for(let i = 0; i < linesWithoutIDs.length; i++) {

                        let originalText = textWithoutIDs[i]
                        let text = originalText;
                        text = text.trimEnd();
                        if(text.charAt(text.length - 1) === ":") {
                            text = text.slice(0, text.length-1);
                        }
                        text = `${text}: ID_${getUID(4)}`;

                        editor.replaceRange(text, { line: linesWithoutIDs[i], ch: 0 }, 
                                                  { line: linesWithoutIDs[i], ch: originalText.length});
                    }

                    new Notice (`Replaced ${linesWithoutIDs.length + numCodeblocksUpdated} missing ID(s) in the current document.`);
                } catch (e) {
                    new Notice(
                        "Encountered an error addign IDs to multi-column regions. Please try again later."
                    );
                }
            }
        });

        this.registerInterval(window.setInterval(() => {
            
            this.UpdateOpenFilePreviews();
        }, 500));
    }

    UpdateOpenFilePreviews() {

        let fileManagers = this.globalManager.getAllFileManagers();
        fileManagers.forEach(element => {
            
            let regionalManagers = element.getAllRegionalManagers();
            regionalManagers.forEach(regionManager => {
                
                regionManager.updateRenderedMarkdown()
            });
        });
    }

    setupMarkdownPostProcessor() {
        this.registerMarkdownPostProcessor(async (el, ctx) => {

            if(this.settings.renderOnMobile === false &&
               Platform.isMobile === true) {
                return;
            }

            const sourcePath = ctx.sourcePath;

            let fileDOMManager = this.globalManager.getFileManager(sourcePath);
            if(fileDOMManager === null) {
                console.log("Found null DOM manager. Could not process multi-column markdown.")
                return;
            }

            /**
             * Here we check if the export "print" flag is in the DOM so we can determine if we
             * are exporting and handle that case.
             */
            if(this.checkExporting(el)) {

                this.exportDocumentToPDF(el, fileDOMManager, sourcePath);
            }

            // Get the info for our current context and then check
            // if the entire text contains a start tag. If there is
            // no start tag in the document we can just return and
            // ignore the rest of the parsing.
            let info = ctx.getSectionInfo(el);

            /**
             * We need the context info to properly parse so returning here 
             * info is null. TODO: Set error in view if this occurs.
             */
            if(!info) {

                return;
            }

            let docString = info.text;
            let docLines = docString.split("\n");

            /**
             * If we encounter a start tag on the document we set the flag to start
             * parsing the rest of the document.
             */
            if(multiColumnParser.containsStartTag(el.textContent) || 
               multiColumnParser.containsStartCodeBlock(docString)) {

                fileDOMManager.setHasStartTag();
            }

            /** 
             * If the document does not contain any start tags we ignore the
             * rest of the parsing. This is only set to true once the first
             * start tag element is parsed above.
             */
            if(fileDOMManager.getHasStartTag() === false) {
                return;
            }

            /**
             * Take the info provided and generate the required variables from 
             * the line start and end values.
             */
            let linesAboveArray = docLines.slice(0, info.lineStart)
            let linesOfElement = docLines.slice(info.lineStart, info.lineEnd + 1);
            let textOfElement = linesOfElement.join("\n")
            let linesBelowArray = docLines.slice(info.lineEnd + 1)

            //#region Depreciated Start Tag
            /**
             * If the current line is a start tag we want to set up the
             * region manager. The regional manager takes care
             * of all items between it's start and end tags while the
             * file manager we got above above takes care of all regional 
             * managers in each file.
             */
            if(multiColumnParser.containsStartTag(textOfElement)) {

                /** 
                 * Set up the current element to act as the parent for the 
                 * multi-column region.
                 */
                el.children[0].detach();
                el.classList.add(MultiColumnLayoutCSS.RegionRootContainerDiv)
                let renderErrorRegion = el.createDiv({
                    cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv} ${MultiColumnStyleCSS.RegionErrorMessage}`,
                });
                let renderColumnRegion = el.createDiv({
                    cls: MultiColumnLayoutCSS.RegionContentContainerDiv
                })

                let startBlockData = multiColumnParser.getStartBlockAboveLine(linesOfElement)
                if(startBlockData === null) {
                    return;
                }
                
                let regionKey = startBlockData.startBlockKey;
                if(fileDOMManager.checkKeyExists(regionKey) === true) {

                    let { numberOfTags, keys } = multiColumnParser.countStartTags(info.text);

                    let numMatches = 0;
                    for(let i = 0; i < numberOfTags; i++) {

                        // Because we checked if key exists one of these has to match.
                        if(keys[i] === regionKey) {
                            numMatches++;
                        }
                    }

                    // We only want to display an error if there are more than 2 of the same id across
                    // the whole document. This prevents erros when obsidian reloads the whole document
                    // and there are two of the same key in the map.
                    if(numMatches >= 2) {
                        if(regionKey === "") {
                            renderErrorRegion.innerText = "Found multiple regions with empty IDs. Please set a unique ID after each start tag.\nEG: '=== multi-column-start: randomID'\nOr use 'Fix Missing IDs' in the command palette and reload the document."
                        }
                        else {
                            renderErrorRegion.innerText = "Region ID already exists in document, please set a unique ID.\nEG: '=== multi-column-start: randomID'"
                        }
                        return;
                    }
                }
                el.id = `MultiColumnID:${regionKey}`

                let elementMarkdownRenderer = new MarkdownRenderChild(el);
                fileDOMManager.createRegionalManager(regionKey, el, renderErrorRegion, renderColumnRegion);
                elementMarkdownRenderer.onunload = () => {
                    if(fileDOMManager) {
    
                        fileDOMManager.removeRegion(startBlockData.startBlockKey);
                    }
                };
                ctx.addChild(elementMarkdownRenderer);

                /**
                 * Now we have created our regional manager and defined what elements 
                 * need to be rendered into. So we can return without any more processing.
                 */
                return
            }
            //#endregion Depreciated Start Tag

            /**
             * Check if any of the lines above us contain a start block, and if
             * so get the lines from our current element to the start block.
             */
            let startBockAbove = multiColumnParser.getStartBlockOrCodeblockAboveLine(linesAboveArray);
            if(startBockAbove === null) {
                return;
            }
            /**
             * We now know we're within a multi-column region, so we update our
             * list of lines above to just be the items within this region.
             */
            linesAboveArray = startBockAbove.linesAboveArray;

            /**
             * We use the start block's key to get our regional manager. If this
             * lookup fails we can not continue processing this element.
             */
            let regionalContainer: RegionManagerContainer = fileDOMManager.getRegionalContainer(startBockAbove.startBlockKey);
            if(regionalContainer === null) {
                return
            }
            let regionalManager: RegionManager = regionalContainer.getRegion();

            /**
             * To make sure we're placing the item in the right location (and 
             * overwrite elements that are now gone) we now want all of the
             * lines after this element up to the end tag.
             */
            linesBelowArray =  multiColumnParser.getEndBlockBelow(linesBelowArray);

            /**
             * Now we take the lines above our current element up until the
             * start region tag and render that into an HTML element. We will 
             * use these elements to determine where to place our current element.
             */
            let siblingsAbove: HTMLDivElement = renderMarkdownFromLines(linesAboveArray, sourcePath);

            let siblingsBelow: HTMLDivElement = renderMarkdownFromLines(linesBelowArray, sourcePath);

            /**
             * Set up our dom object to be added to the manager.
             */
            let currentObject: DOMObject = new DOMObject(el, linesOfElement)
            el.id = currentObject.UID;

            currentObject = TaskListDOMObject.checkForTaskListElement(currentObject)

            /**
             * Now we add the object to the manager and then setup the
             * callback for when the object is removed from view that will remove 
             * the item from the manager.
             */
            regionalManager.addObject(siblingsAbove, siblingsBelow, currentObject);

            let elementMarkdownRenderer = new MarkdownRenderChild(el);
            elementMarkdownRenderer.onunload = () => {

                if(regionalContainer === null) {
                    return
                }
                
                let regionalManager: RegionManager = regionalContainer.getRegion();
                if(regionalManager) {
                    
                    // We can attempt to update the view here after the item is removed
                    // but need to get the item's parent element before removing object from manager.
                    let regionRenderData: MultiColumnRenderData = regionalManager.getRegionRenderData();

                    regionalManager.removeObject(currentObject.UID);

                    /**
                     * Need to check here if element is null as this closure will be called
                     * repeatedly on file change.
                     */
                    if(regionRenderData.parentRenderElement === null) {
                        return;
                    }
                    regionalManager.renderRegionElementsToScreen()
                }
            };
            ctx.addChild(elementMarkdownRenderer);

            let elementTextSpaced = linesOfElement.reduce((prev, curr) => {
                return prev + "\n" + curr;
            });
            /**
             * Now we check if our current element is a special flag so we can
             * properly set the element tag within the regional manager.
             */
            if(multiColumnParser.containsEndTag(el.textContent) === true) {

                currentObject.elementType = ElementRenderType.unRendered
                el.addClass(MultiColumnStyleCSS.RegionEndTag)
                regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
            }
            else if(multiColumnParser.containsColEndTag(elementTextSpaced) === true) {

                currentObject.elementType = ElementRenderType.unRendered
                el.addClass(MultiColumnStyleCSS.ColumnEndTag)
                regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
            }
            else if(multiColumnParser.containsColSettingsTag(elementTextSpaced) === true) {

                currentObject.elementType = ElementRenderType.unRendered
                el.addClass(MultiColumnStyleCSS.RegionSettings)
                regionalManager = regionalContainer.setRegionSettings(elementTextSpaced)
                regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.regionSettings);
            }
            else {
                el.addClass(MultiColumnStyleCSS.RegionContent)
            }
            
            regionalManager.renderRegionElementsToScreen()
            return;
        });
    }

    private isStartCodeblockInExport(node: HTMLElement): boolean {

        for(let i = 0; i < CODEBLOCK_START_STRS.length; i++) {

            if(node.hasClass(`block-language-${CODEBLOCK_START_STRS[i]}`)) {
                return true;
            }
        }
        return false;
    }

    private async exportDocumentToPDF(el: HTMLElement, fileDOMManager: FileDOMManager, sourcePath: string) {

        // A true export will be passed an element with all other items in the doc as children. 
        // So if there are no children we can just return
        let docChildren = Array.from(el.childNodes);
        if(docChildren.length === 0) {
            return;
        }

        let childrenToRemove = [];
        
        // To export codeblocks we need to get the IDs so we can get the data from our managers.
        // however since the ID isnt being stored in the element yet this means we need to read
        // all of the IDs out of the full document.
        let codeblockStartBlocks = []
        let aFile = this.app.vault.getAbstractFileByPath(sourcePath);
        if(aFile instanceof TFile) {

            let file = aFile as TFile
            let fileText = await this.app.vault.cachedRead(file) // Is cached read Ok here? It should be.

            // Once we have our data we search the text for all codeblock start values.
            // storing them into our queue.
            let codeBlockData = multiColumnParser.findStartCodeblock(fileText);
            while(codeBlockData.found === true) {

                let codeblockText = fileText.slice(codeBlockData.startPosition, codeBlockData.endPosition);
                fileText = fileText.slice(codeBlockData.endPosition);
                codeblockStartBlocks.push(codeblockText);

                codeBlockData = multiColumnParser.findStartCodeblock(fileText);
            }
        }
        else {
            console.error(`Error getting file from source path: ${sourcePath}`)
        }

        let inBlock = false;
        for (let i = 0; i < docChildren.length; i++) {

            let child = docChildren[i];
            if (child instanceof HTMLElement) {
                let childEl = child as HTMLElement;
                if (inBlock === false) {
                    
                    let foundBlockData = false;
                    let regionKey = "";

                    let blockData = multiColumnParser.isStartTagWithID(child.textContent);
                    if (blockData.isStartTag === true) {

                        // If an old-style start tag.
                        foundBlockData = true;
                        if (blockData.hasKey === true) {
                            let foundKey = multiColumnParser.getStartTagKey(child.textContent);
                            if (foundKey !== null) {
                                regionKey = foundKey;
                            }
                        }
                    }
                    else if(blockData.isStartTag === false && this.isStartCodeblockInExport(child)) {

                        // If the start tag from the old version is null we then check to see if the element is
                        // a codeblock start. If it is we use the next available codeblock data to retrieve our ID.
                        let codeblockText = codeblockStartBlocks.shift();
                        if(codeblockText === undefined) {
                            console.error("Found undefined codeblock data when exporting.")
                            return;
                        }

                        let id = parseStartRegionCodeBlockID(codeblockText);
                        if(id !== "") {
                            foundBlockData = true;
                            regionKey = id;
                        }
                    }

                    if(foundBlockData === true && regionKey !== "") {

                        inBlock = true;

                        for (let i = child.children.length - 1; i >= 0; i--) {
                            child.children[i].detach();
                        }
                        child.innerText = "";

                        child.classList.add(MultiColumnLayoutCSS.RegionRootContainerDiv);
                        let renderErrorRegion = child.createDiv({
                            cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv}, ${MultiColumnStyleCSS.RegionErrorMessage}`,
                        });
                        let renderColumnRegion = child.createDiv({
                            cls: MultiColumnLayoutCSS.RegionContentContainerDiv
                        });


                        let regionalContainer: RegionManagerContainer = fileDOMManager.getRegionalContainer(regionKey);
                        if (regionalContainer === null) {
                            renderErrorRegion.innerText = "Error rendering multi-column region.\nPlease close and reopen the file, then make sure you are in reading mode before exporting.";
                        }
                        else {
                            let regionalManager: RegionManager = regionalContainer.getRegion();
                            regionalManager.exportRegionElementsToPDF(renderColumnRegion);
                        }
                    }
                }
                else {

                    if (multiColumnParser.containsEndTag(child.textContent) === true) {

                        inBlock = false;
                    }

                    childrenToRemove.push(child);
                }
            }
        }

        childrenToRemove.forEach(child => {
            if(child.parentElement === el) {
                el.removeChild(child);
            }
        });
    }

    checkExporting(element: HTMLElement): boolean {

        if(element === null) {
            return false;
        }

        if(element.classList.contains("print")) {
            return true;
        }

        if(element.parentNode !== null) {
            return this.checkExporting(element.parentElement);
        }

        return false;
    }

    setupMarkdownCodeblockPostProcessor(startStr: string) {

        this.registerMarkdownCodeBlockProcessor(startStr, (source, el, ctx) => {

            if(this.settings.renderOnMobile === false &&
                Platform.isMobile === true) {
 
                 return;
            }

            const sourcePath = ctx.sourcePath;
        
            // Set up our CSS so that the codeblock only renders this data in reading mode
            // source/live preview mode is handled by the CM6 implementation.
            el.parentElement?.addClass("preivew-mcm-start-block");
        
            // To determine what kind of view we are rendering in we need a markdown leaf.
            // Really this should never return here since rendering is only done in markdown leaves.
            let markdownLeaves = app.workspace.getLeavesOfType("markdown");
            if(markdownLeaves.length === 0) {
                return;
            }
        
            // Check the type of the leaf
            let foundFileLeaf = false;
            for(let i = 0; i < markdownLeaves.length; i++) {
        
                let fileLeaf = getFileLeaf(sourcePath);
                if(fileLeaf === null) {
                    continue;
                }
                foundFileLeaf = true;
        
                if(getLeafSourceMode(fileLeaf) === "source") {
                    // This was added when implementing live preview, but the reason it was originally added appears to no longer be an issue.
                    // Removing the return from here to fix bug where opening multiple copies of the document causes regions to not render.
                    console.debug("Leaf of file is in source mode. Should we be ignoring post processing here?")
                    // return;
                }
            }
        
            if(this.globalManager === null || this.globalManager === undefined) {
                // console.log("Global manager is undefined?");
                return;
            }

            let fileDOMManager = this.globalManager.getFileManager(sourcePath);
            if(fileDOMManager === null) {
                return;
            }
            
            // Set file to have start tag.
            fileDOMManager.setHasStartTag();
        
            // Get the info for our current context and then check
            // if the entire text contains a start tag. If there is
            // no start tag in the document we can just return and
            // ignore the rest of the parsing.
            let info = ctx.getSectionInfo(el);
        
            /**
             * We need the context info to properly parse so returning here 
             * info is null. TODO: Set error in view if this occurs.
             */
            if(!info) {
                return;
            }
        
            /** 
             * Set up the current element to act as the parent for the 
             * multi-column region.
             */
            el.classList.add(MultiColumnLayoutCSS.RegionRootContainerDiv)
            let renderErrorRegion = el.createDiv({
                cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv} ${MultiColumnStyleCSS.RegionErrorMessage}`,
            });
            let renderColumnRegion = el.createDiv({
                cls: MultiColumnLayoutCSS.RegionContentContainerDiv
            })
        
            let regionKey = parseStartRegionCodeBlockID(source);
        
            let createNewRegionManager = true;
            if(fileDOMManager.checkKeyExists(regionKey) === true) {
                
                createNewRegionManager = false;
                let { numberOfTags, keys } = multiColumnParser.countStartTags(info.text);
        
                let numMatches = 0;
                for(let i = 0; i < numberOfTags; i++) {
        
                    // Because we checked if key exists one of these has to match.
                    if(keys[i] === regionKey) {
                        numMatches++;
                    }
                }
        
                // We only want to display an error if there are more than 2 of the same id across
                // the whole document. This prevents erros when obsidian reloads the whole document
                // and there are two of the same key in the map.
                if(numMatches >= 2) {
                    if(regionKey === "") {
                        renderErrorRegion.innerText = "Found multiple regions with empty IDs. Please set a unique ID after each start tag.\nEG: '=== multi-column-start: randomID'\nOr use 'Fix Missing IDs' in the command palette and reload the document."
                    }
                    else {
                        renderErrorRegion.innerText = "Region ID already exists in document, please set a unique ID.\nEG: '=== multi-column-start: randomID'"
                    }
                    return;
                }
            }
            el.id = `MultiColumnID:${regionKey}`
        
            // If something changes in the codeblock we dont necessarily want to update our
            // old reference to the region manager. This could be a potential bug area.
            if(createNewRegionManager === true) {
        
                // Create a new regional manager.
                let elementMarkdownRenderer = new MarkdownRenderChild(el);
                fileDOMManager.createRegionalManager(regionKey, el, renderErrorRegion, renderColumnRegion);
        
                // Set up the on unload callback. This can be called if the user changes
                // the start/settings codeblock in any way. We only want to unload
                // if the file is being removed from view.
                elementMarkdownRenderer.onunload = () => {
        
                    if(fileDOMManager && fileStillInView(sourcePath) === false) {
        
                        // console.debug("File not in any markdown leaf. Removing region from dom manager.")
                        fileDOMManager.removeRegion(regionKey);
                    }
                };
                ctx.addChild(elementMarkdownRenderer);
            }
        
            let regionalManagerContainer = fileDOMManager.getRegionalContainer(regionKey);
            if(regionalManagerContainer !== null) {
        
                let regionalManager = regionalManagerContainer.setRegionSettings(source);
                regionalManager.regionParent = el;
            }
        })
    }

    async loadSettings() {

		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


export type nearbySiblings = { 
    siblingsAbove: HTMLDivElement,
    currentObject: DOMObject, 
}
function renderMarkdownFromLines(mdLines: string[], sourcePath: string): HTMLDivElement {

    /**
     * We re-render all of the items above our element, until the start tag, 
     * so we can determine where to place the new item in the manager.
     * 
     * TODO: Can reduce the amount needing to be rendered by only rendering to
     * the start tag or a column-break whichever is closer.
     */
    let siblings = createDiv();
    let markdownRenderChild = new MarkdownRenderChild(
        siblings
    );
    MarkdownRenderer.renderMarkdown(
        mdLines.reduce((prev, current) => {
            return prev + "\n"  + current;
        }, ""),
        siblings,
        sourcePath,
        markdownRenderChild
    );

    return siblings;
}
