/*
 * File: multi-column-markdown/src/main.ts
 * Created Date: Tuesday, October 5th 2021, 1:09 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { Notice, Plugin,  MarkdownRenderChild, MarkdownRenderer } from 'obsidian';
import * as multiColumnParser from './utilities/textParser';
import { RegionDOMManager, MultiColumnRenderData, GlobalDOMManager } from './dom_manager/domManager';
import { DOMObject, DOMObjectTag } from './dom_manager/domObject';
import { MultiColumnSettings, ColumnLayout } from "./regionSettings";

import { getUID } from './utilities/utils';
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from './utilities/cssDefinitions';
import { ElementRenderType, getElementRenderType } from './utilities/elementRenderTypeParser';

export default class MultiColumnMarkdown extends Plugin {
	// settings: SplitColumnMarkdownSettings;

    globalManager: GlobalDOMManager = new GlobalDOMManager();
    
	async onload() {

        console.log("Loading multi-column markdown");

        this.setupMarkdownPostProcessor();

        //TODO: Set up this as a modal to set settings automatically
        this.addCommand({            
            id: `insert-multi-column-region`,
            name: `Insert Multi-Column Region`,
            editorCallback: (editor, view) => {

                try {
                    editor.getDoc().replaceSelection(
`
=== multi-column-start: ID_${getUID(4)}
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
                    let lines = editor.getRange({ line: 0, ch: 0 }, { line: editor.getDoc().lineCount(), ch: 0}).split("\n");

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

                    if(linesWithoutIDs.length === 0) {
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
                    new Notice (`Replaced ${linesWithoutIDs.length} missing ID(s) in the current document.`);
                } catch (e) {
                    new Notice(
                        "Encountered an error addign IDs to multi-column regions. Please try again later."
                    );
                }
            }
        });

        this.registerInterval(window.setInterval(() => {
            
            this.UpdateOpenFilePreviews();
        }, 2000));
    }

    UpdateOpenFilePreviews() {

        let fileManagers = this.globalManager.getAllFileManagers();
        fileManagers.forEach(element => {
            
            let regionalManagers = element.getAllRegionalManagers();
            regionalManagers.forEach(regionManager => {
                
                let parentElementData: MultiColumnRenderData = regionManager.getRegionRenderData();
                this.updateRenderedMarkdown(parentElementData.domObjects);                
            });
        });
    }

    setupMarkdownPostProcessor() {

        this.registerMarkdownPostProcessor(async (el, ctx) => {

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

            const sourcePath = ctx.sourcePath;

            let fileDOMManager = this.globalManager.getFileManager(sourcePath);
            if(fileDOMManager === null) {
                console.log("Found null DOM manager. Could not process multi-column markdown.")
                return;
            }

            /**
             * If we encounter a start tag on the document we set the flag to start
             * parsing the rest of the document.
             */
            if(multiColumnParser.containsStartTag(el.textContent)) {
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
            let docLines = info.text.split("\n");
            let linesAboveArray = docLines.slice(0, info.lineStart)
            let linesOfElement = docLines.slice(info.lineStart, info.lineEnd + 1);
            let linesBelowArray = docLines.slice(info.lineEnd + 1)

            /**
             * If the current line is a start tag we want to set up the
             * region manager. The regional manager takes care
             * of all items between it's start and end tags while the
             * file manager we got above above takes care of all regional 
             * managers in each file.
             */
            let elementTextSpaced = linesOfElement.reduce((prev, curr) => {
                return prev + "\n" + curr;
            });
            if(multiColumnParser.containsStartTag(el.textContent)) {

                /** 
                 * Set up the current element to act as the parent for the 
                 * multi-column region.
                 */
                el.children[0].detach();
                el.classList.add(MultiColumnLayoutCSS.RegionRootContainerDiv)
                let renderErrorRegion = el.createDiv({
                    cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv}, ${MultiColumnStyleCSS.RegionErrorMessage}`,
                });
                let renderColumnRegion = el.createDiv({
                    cls: MultiColumnLayoutCSS.RegionContentContainerDiv
                })

                let startBlockData = multiColumnParser.getStartBlockAboveLine(linesOfElement)
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

            /**
             * Check if any of the lines above us contain a start block, and if
             * so get the lines from our current element to the start block.
             */
            let startBockAbove = multiColumnParser.getStartBlockAboveLine(linesAboveArray);
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
            let regionalManager: RegionDOMManager = fileDOMManager.getRegionalManager(startBockAbove.startBlockKey);
            if(regionalManager === null) {
                return
            }

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
            let currentObject: DOMObject = new DOMObject(el)
            el.id = currentObject.UID;

            /**
             * Now we add the object to the manager and then setup the
             * callback for when the object is removed from view that will remove 
             * the item from the manager.
             */
            regionalManager.addObject(siblingsAbove, siblingsBelow, currentObject);

            let elementMarkdownRenderer = new MarkdownRenderChild(el);
            elementMarkdownRenderer.onunload = () => {
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
                    this.renderColumnMarkdown(regionRenderData.parentRenderElement, regionRenderData.domObjects, regionRenderData.parentRenderSettings);
                }
            };
            ctx.addChild(elementMarkdownRenderer);

            /**
             * Now we check if our current element is a special flag so we can
             * properly set the element tag within the regional manager.
             */
            if(multiColumnParser.containsEndTag(el.textContent) === true) {

                el.addClass(MultiColumnStyleCSS.RegionEndTag)
                regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
            }
            else if(multiColumnParser.containsColEndTag(elementTextSpaced) === true) {

                el.addClass(MultiColumnStyleCSS.ColumnEndTag)
                regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
            }
            else if(multiColumnParser.containsColSettingsTag(elementTextSpaced) === true) {

                el.addClass(MultiColumnStyleCSS.RegionSettings)
                regionalManager.setElementToSettingsBlock(currentObject.UID, elementTextSpaced);
            }
            else {
                el.addClass(MultiColumnStyleCSS.RegionContent)
            }
            
            /**
             * Use our regional manager to get everything needed to render the region.
             */
            let parentElementData: MultiColumnRenderData = regionalManager.getRegionRenderData();
            this.renderColumnMarkdown(parentElementData.parentRenderElement, parentElementData.domObjects, parentElementData.parentRenderSettings);

            return;
        });
    }

    /**
     * This function takes in the data for the multi-column region and sets up the 
     * user defined number of children with the proper css classes to be rendered properly.
     * 
     * @param parentElement The element that the multi-column region will be rendered under.
     * @param regionElements The list of DOM objects that will be coppied under the parent object
     * @param settings The settings the user has defined for the region.
     */
    renderColumnMarkdown(parentElement: HTMLElement, regionElements: DOMObject[], settings: MultiColumnSettings) {

        let multiColumnParent = createDiv({
            cls: MultiColumnLayoutCSS.RegionColumnContainerDiv,
        });
        if(settings.drawShadow === true) {
            multiColumnParent.addClass(MultiColumnStyleCSS.RegionShadow);
        }

        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */
        let columnContentDivs = getColumnContentDivs(settings, multiColumnParent);
        for(let i = 0; i < columnContentDivs.length; i++) {
            if(settings.drawBorder === true) {
                columnContentDivs[i].addClass(MultiColumnStyleCSS.ColumnBorder);
            }

            if(settings.drawShadow === true) {
                columnContentDivs[i].addClass(MultiColumnStyleCSS.ColumnShadow);
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
        for(let i = parentElement.children.length - 1; i >= 0; i--) {
            parentElement.children[i].detach();
        }
        parentElement.appendChild(markdownRenderChild.containerEl);

        let columnIndex = 0;
        for(let i = 0; i < regionElements.length; i++) {

            if (regionElements[i].tag !== DOMObjectTag.startRegion    ||
                regionElements[i].tag !== DOMObjectTag.regionSettings ||
                regionElements[i].tag !== DOMObjectTag.endRegion      ||
                regionElements[i].tag !== DOMObjectTag.columnBreak ) {

                // We store the elements in a wrapper container until we determine
                let element = createDiv({
                    cls: MultiColumnLayoutCSS.ColumnDualElementContainer,
                });
                regionElements[i].elementContainer = element;
                // Otherwise we just make a copy of the original element to display.
                element.appendChild(regionElements[i].element.cloneNode(true) as HTMLDivElement);

                if(element !== null) {

                    columnContentDivs[columnIndex].appendChild(element);
                }

                /**
                 * If the tag is a column break we update the column index after
                 * appending the item to the column div. This keeps the main DOM
                 * cleaner by removing other items and placing them all within
                 * a region container.
                 */
                if(regionElements[i].tag === DOMObjectTag.columnBreak && 
                   (columnIndex + 1) < settings.numberOfColumns) {
     
                     columnIndex++;
                 }
            }
        }
    }

    setUpDualRender(domElement: DOMObject) {

        /**
         * If our element is of "specialRender" type it *may* need to be rendered
         * using the original element rather than a copy. For example, an element
         * may have an onClick event that would not get coppied to the clone.
         * 
         * If we just moved these elements into the region it would get 
         * moved back out into the original location in the DOM by obsidian
         * when scrolling or when the file is updated. On the next refresh it
         * would be moved back but that can lead to a region jumping
         * around as the item is moved in and out. 
         * 
         * Here we set up the div to contain the element and create
         * a visual only clone of it. The clone will only be visible
         * when the original is not in the multi-column region so it
         * saves us from the visual noise of the region jumping around.
         */

        // Remove the old elements before we set up the dual rendered elements.
        let containerElement: HTMLDivElement = domElement.elementContainer
        let renderElement: HTMLDivElement = domElement.element as HTMLDivElement
        for(let i = containerElement.children.length - 1; i >= 0; i--) {
            containerElement.children[i].detach();
        }

        containerElement.appendChild(renderElement)                    
        renderElement.addClass(MultiColumnLayoutCSS.OriginalElementType)

        let clonedNode = renderElement.cloneNode(true) as HTMLDivElement;
        clonedNode.addClass(MultiColumnLayoutCSS.ClonedElementType)
        clonedNode.removeClasses([MultiColumnStyleCSS.RegionContent, MultiColumnLayoutCSS.OriginalElementType])
        containerElement.appendChild(clonedNode);
    }

    updateRenderedMarkdown(regionElements: DOMObject[]) {

        /**
            /** 
        /**
         * Go through every node of the region looking for the "specialRender" type
         * which are the elements that may need to be rendered using the original
         * element rather than a copy.
         */
        for(let i = 0; i < regionElements.length; i++) {
            
            /** The first time the document is updated after load this will return
             * undefined so here we get the element type and then if needed set
             * up our dual renderer element before updating it afterwards.
             * 
             * We want to set the element type here in the update call because
             * the type may not be set until after our inital load is called if
             * multi-column markdown runs before other plugins that update the
             * elements.
             */
            if(regionElements[i].elementType === ElementRenderType.undefined) {

                regionElements[i].elementType = getElementRenderType(regionElements[i].element);
                if(regionElements[i].elementType === ElementRenderType.specialRender) {

                    this.setUpDualRender(regionElements[i]);
                }
            }

            if(regionElements[i].elementType === ElementRenderType.specialRender) {

                /**
                 * Now check if this node is missing the original element because
                 * it was moved. If the node is missing we move it back in.
                 */
                let specialElementContainer = regionElements[i].elementContainer;

                if(specialElementContainer !== null && 
                   specialElementContainer.getElementsByClassName(`.${MultiColumnLayoutCSS.OriginalElementType}`).length === 0) {
    
                    specialElementContainer.insertBefore(regionElements[i].element, specialElementContainer.children[0]);
                } 
            }
        }
    }
}

/**
 * Sets up the CSS classes and the number of columns based on the passed settings.
 * @param settings The user defined settings that determine what CSS is set here.
 * @param multiColumnParent The parent object that the column divs will be created under.
 * @returns The list of column divs created under the passed parent element.
 */
function getColumnContentDivs(settings: MultiColumnSettings, multiColumnParent: HTMLDivElement): HTMLDivElement[] {

    let columnContentDivs: HTMLDivElement[] = []
    if(settings.numberOfColumns === 2) {

        switch(settings.columnLayout) {
            case(ColumnLayout.standard):
            case(ColumnLayout.middle):
            case(ColumnLayout.center):
            case(ColumnLayout.third):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent twoEqualColumns_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent twoEqualColumns_Right`
                }));
                break;

            case(ColumnLayout.left):
            case(ColumnLayout.first):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent twoColumnsHeavyLeft_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent twoColumnsHeavyLeft_Right`
                }));
                break;

            case(ColumnLayout.right):
            case(ColumnLayout.second):
            case(ColumnLayout.last):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent twoColumnsHeavyRight_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent twoColumnsHeavyRight_Right`
                }));
                break;
        }
    }
    else if(settings.numberOfColumns === 3) {

        switch(settings.columnLayout) {
            case(ColumnLayout.standard):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threeEqualColumns_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threeEqualColumns_Middle`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threeEqualColumns_Right`
                }));
                break;

            case(ColumnLayout.left):
            case(ColumnLayout.first):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyLeft_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyLeft_Middle`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyLeft_Right`
                }));
                break;

            case(ColumnLayout.middle):
            case(ColumnLayout.center):
            case(ColumnLayout.second):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyMiddle_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyMiddle_Middle`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyMiddle_Right`
                }));
                break;

            case(ColumnLayout.right):
            case(ColumnLayout.third):
            case(ColumnLayout.last):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyRight_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyRight_Middle`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyRight_Right`
                }));
                break;
        }
    }

    return columnContentDivs;
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