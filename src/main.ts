/*
 * File: multi-column-markdown/src/main.ts
 * Created Date: Tuesday, October 5th 2021, 1:09 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { MarkdownView, Notice, Plugin,  MarkdownRenderChild, MarkdownRenderer, MarkdownSectionInformation } from 'obsidian';
import * as multiColumnParser from './utilities/textParser';
import { DOMManager, startRegionParent, GlobalDOMManager } from './dom_manager/domManager';
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
            editorCheckCallback: (checking, editor, view) => {

                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
                    if (checking === false) {
                        try {
                            editor.getDoc().replaceSelection(
`
=== multi-column-start
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

            let domManager = this.globalManager.getManager(sourcePath);
            if(domManager === null) {
                console.log("Found null DOM manager. Could not process multi-column markdown.")
                return;
            }
            /**
             * Whenever the document renderer is updated we need to capture the
             * element that was processed so we can determine where to place it,
             * if needed, within our multi-column region. 
             * 
             * We need to do this because as far as I can tell there is no way
             * to find out what siblings the element has from this callback.
             * The goal of this code block is to allow us to track the siblings
             * of elements so we can then know what order to render the elements
             * within our region.
             */
            let nearbySiblings: nearbySiblings = findSiblingsAboveEl(el, info, sourcePath);

            let currentObject = nearbySiblings.currentObject;
            /**
             * Now we add the object to the manager and then setup the
             * callback for when the object is removed from view that will remove 
             * the item from the manager.
             */
            let elementIndexInManager = domManager.addObject(nearbySiblings.siblingsAbove, nearbySiblings.currentObject);
            let elementMarkdownRenderer = new MarkdownRenderChild(el);
            elementMarkdownRenderer.onunload = () => {
                if(domManager) {
                    
                    // We can attempt to update the view here after the item is removed
                    // but need to get the item's parent element before removing object from manager.
                    let parentElementData = domManager.getParentAboveObject(currentObject.UID);

                    domManager.removeObject(currentObject.UID);

                    if(parentElementData === null) {
                        return;
                    }
                    this.updateMultiColumnRegion(parentElementData, domManager);
                }
            };
            ctx.addChild(elementMarkdownRenderer);

            /**
             * Now that we have set the element in our manager we want to see if this
             * document contains a start tag. If no start tag exists we just return
             * here as no other parsing or rendering is required.
             */
            if(multiColumnParser.containsStartTag(info.text) === false) {
                return;
            }

            /**
             * At this point we know that this document contains a multi-column region
             * so we now move forward to determine what we need to do with our current 
             * element.
             */

            // Get the lines for just our current element from the document, this is needed for
            // certain parsing and trying to see if this can be removed still.
            let elementData = info.text.split("\n").splice(info.lineStart, info.lineEnd + 1 - info.lineStart).reduce((prev, current) => {
                return prev + "\n"  + current;
            }, "");

            // Check our current element for any special flags.
            if(multiColumnParser.containsStartTag(el.textContent) === true) {

                /** 
                 * Set up the current element to act as the parent for the 
                 * multi-column region.
                 */
                el.id = `TwoColumnContainer-${getUID()}`
                el.children[0].detach();
                el.classList.add("multiColumnContainer")
                let renderErrorRegion = el.createDiv({ //TODO: Determine if this is needed now
                    cls: `multiColumnErrorMessage`,
                });
                let renderColumnRegion = el.createDiv({
                    cls: `RenderColRegion`
                })

                /**
                 * Here we inform the manager that this item is a multi-column start
                 * region so we can find it later by other objects.
                 */
                currentObject = domManager.setElementToStartRegion(currentObject.UID, renderColumnRegion);
            }
            else if(multiColumnParser.containsEndTag(el.textContent) === true) {

                domManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
            }
            else if(multiColumnParser.containsColEndTag(elementData) === true) {

                domManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
            }
            else if(multiColumnParser.containsColSettingsTag(elementData) === true) {

                domManager.setElementToSettingsBlock(currentObject.UID, elementData);
            }
            
            /**
             * Now we use the index of our element to find a region start object
             * above us. If the function returns null we either didnt find a object
             * or we hit an end tag before a start tag both of which mean the object
             * is not within a region.
             * 
             * If we just set up a start tag in the if statement abovethis is slightly 
             * inefficient but does mean the code is slightly less complicated.
             */
            let parentElementData = domManager.getParentAboveObject(currentObject.UID);
            if(parentElementData === null) {
                return;
            }
    
            /**
             * We want to hide all of the original elements that are now going to be
             * rendered within our mutli-column region, but we need to make sure 
             * we don't also hide the start element so make sure to check for that here.
             */
            if(currentObject.tag !== DOMObjectTag.startRegion){
                el.addClass("multiColumnDataHidden");
            }

            this.updateMultiColumnRegion(parentElementData, domManager);

            return;
        });
    }

    updateMultiColumnRegion(parentElementData: startRegionParent, domManager: DOMManager) {

        
        /**
         * We take the parent element and use it to find all of the elements from
         * our manager that need to be rendered within our region.
         */                                            
        let { domObjects } = domManager.getRegionFromStartTagIndex(parentElementData.indexInDom);

        // Pass the elements and other data into the render function that actually sets up the DOM 
        this.renderColumnMarkdown(parentElementData.parentRenderElement, domObjects, parentElementData.parentRenderSettings);
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
        for(let i = 0; i < parentElement.children.length; i++) {
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
function findSiblingsAboveEl(el: HTMLElement, fileInfo: MarkdownSectionInformation, sourcePath: string) {

    /*
     * We re render all of the items above our element so we can determine where 
     * to place the new item in the manager.
     * 
     * Also extracting the text to set within the object mostly for debugging 
     * purposes.
     */
    let linesAbove = fileInfo.text.split("\n").splice(0, fileInfo.lineStart);
    let linesOf = fileInfo.text.split("\n").splice(fileInfo.lineStart, (fileInfo.lineEnd + 1 - fileInfo.lineStart));
    let elementText = linesOf.reduce((prev, curr) => {
        return prev + curr;
    });

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

    /**
     * Now we need to set up our dom object to be added to the manager.
     */
    let currentObject: DOMObject = new DOMObject(elementText, el)


    let nearbySiblings: nearbySiblings = {siblingsAbove, currentObject };
    return nearbySiblings;
}