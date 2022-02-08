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
             * Take the info provided and generate the required variables from 
             * the line start and end values.
             */
            let linesOfElement = info.text.split("\n").splice(info.lineStart, (info.lineEnd + 1 - info.lineStart));
            let elementTextSpaced = linesOfElement.reduce((prev, curr) => {
                return prev + "\n" + curr;
            });
            let elementText = linesOfElement.reduce((prev, curr) => { 
                // TODO: This can probably be removed as it is only used to identify DOMObjects.
                return prev + curr;
            });

            let elementMarkdownRenderer = new MarkdownRenderChild(el);

            /**
             * If the current line is a start tag we want to set up the
             * region manager. The regional manager takes care
             * of all items between it's start and end tags while the
             * file manager we got above above takes care of all regional 
             * managers in each file.
             */
            if(multiColumnParser.containsStartTag(elementTextSpaced)) {

                /** 
                 * Set up the current element to act as the parent for the 
                 * multi-column region.
                 */
                el.id = `TwoColumnContainer-${getUID()}`
                el.children[0].detach();
                el.classList.add("multiColumnContainer")
                let renderErrorRegion = el.createDiv({
                    cls: `multiColumnErrorMessage`,
                });
                let renderColumnRegion = el.createDiv({
                    cls: `RenderColRegion`
                })

                let startBlockData = multiColumnParser.getStartBlockAboveLine(linesOfElement)
                let regionKey = startBlockData.startBlockKey;
                if(regionKey === "") {
                    //TODO: Check if ID already in document?
                    renderErrorRegion.innerText = "Region ID is missing. Please set an id after the start tag.\nEG: '=== multi-column-start: randomID'\nOr use 'Fix Missing IDs' in the command palette and reload the document."
                    return
                }

                fileDOMManager.createRegionalManager(regionKey, renderErrorRegion, renderColumnRegion);
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
             * Get a list of all of the lines above our current element.
             * We will use this to determine if the element is within a block so
             * we can otherwise ignore the element and keep compute time down.
             */
            let linesAboveArray = info.text.split("\n").slice(0, info.lineStart)
            let textAboveArray = linesAboveArray.reduce((prev, curr) => {
                return prev + "\n" + curr
            }, "")

            // Check if any of the lines above us contain the start tag.
            if(multiColumnParser.containsStartTag(textAboveArray) === false) {
                return;
            }

            /**
             * A line above us contains a start tag now see if we're within that
             * block.
             */
            let startBockAbove = multiColumnParser.getStartBlockAboveLine(linesAboveArray);
            if(startBockAbove == null) {
                return;
            }
            
            /**
             * Here we now know we're within a regional block.
             */

            // Now we only want to work with the lines within the current region.
            linesAboveArray = startBockAbove.linesAboveArray;
            let regionalManager: RegionDOMManager = fileDOMManager.getRegionalManager(startBockAbove.startBlockKey);

            /**
             * If we can not get the start block and this region's dom manager 
             * we can not continue something has gone wrong.
             */
            if(regionalManager === null) {
                return
            }
            
            /**
             * Now we take the lines above our current element up until the
             * start region tag and render that into an HTML element. We will 
             * use this element to determine where to place our current element.
             */
            let siblingsAbove: HTMLDivElement = findSiblingsAboveEl(linesAboveArray, sourcePath);

            /**
             * Set up our dom object to be added to the manager.
             */
            let currentObject: DOMObject = new DOMObject(elementText, el)

            /**
             * Now we add the object to the manager and then setup the
             * callback for when the object is removed from view that will remove 
             * the item from the manager.
             */
            regionalManager.addObject(siblingsAbove, currentObject);
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

                regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
            }
            else if(multiColumnParser.containsColEndTag(elementTextSpaced) === true) {

                regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
            }
            else if(multiColumnParser.containsColSettingsTag(elementTextSpaced) === true) {

                regionalManager.setElementToSettingsBlock(currentObject.UID, elementTextSpaced);
            }
            
            /**
             * Use our regional manager to get everything needed to render the region.
             */
            let parentElementData: MultiColumnRenderData = regionalManager.getRegionRenderData();
    
            /**
             * We want to hide all of the original elements that are now going to be
             * rendered within our mutli-column region
             */
            el.addClass("multiColumnDataHidden");

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
            cls: `multiColumnParent rowC`,
        });
        if(settings.drawShadow === true) {
            multiColumnParent.addClass("multiColumnParentShadow");
        }

        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */
        let columnContentDivs = getColumnContentDivs(settings, multiColumnParent);
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
        for(let i = parentElement.children.length - 1; i >= 0; i--) {
            parentElement.children[i].detach();
        }
        parentElement.appendChild(markdownRenderChild.containerEl);

        let columnIndex = 0;
        for(let i = 0; i < regionElements.length; i++) {

            // We want to skip column break tags but only if we have columns 
            // left to enter data for.
            if(regionElements[i].tag === DOMObjectTag.columnBreak && 
               (columnIndex + 1) < settings.numberOfColumns) {

                columnIndex++;
            }
            else if (regionElements[i].tag !== DOMObjectTag.startRegion && 
                     regionElements[i].tag !== DOMObjectTag.endRegion && 
                     regionElements[i].tag !== DOMObjectTag.regionSettings) {

                /**
                 * Make a deep copy of the element so we can remove the hidden class before
                 * appending to our column div.
                 */
                let clonedElement = regionElements[i].element.cloneNode(true) as HTMLElement;
                clonedElement.removeClass("multiColumnDataHidden");
                clonedElement.style.display = "block"

                columnContentDivs[columnIndex].appendChild(clonedElement);
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
function findSiblingsAboveEl(linesAbove: string[], sourcePath: string): HTMLDivElement {

    /**
     * We re-render all of the items above our element, until the start tag, 
     * so we can determine where to place the new item in the manager.
     * 
     * TODO: Can reduce the amount needing to be rendered by only rendering to
     * the start tag or a column-break whichever is closer.
     */
    let siblingsAbove = createDiv();
    let markdownRenderChild = new MarkdownRenderChild(
        siblingsAbove
    );
    MarkdownRenderer.renderMarkdown(
        linesAbove.reduce((prev, current) => {
            return prev + "\n"  + current;
        }, ""),
        siblingsAbove,
        sourcePath,
        markdownRenderChild
    );

    return siblingsAbove;
}