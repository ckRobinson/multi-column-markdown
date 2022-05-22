/*
 * File: multi-column-markdown/src/domManager.ts
 * Created Date: Wed, May 18th 2022, 11:01:21 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { parseColumnSettings } from '../utilities/textParser';
import { DOMObject, DOMObjectTag, TaskListDOMObject } from './domObject';
import { MultiColumnSettings, ColumnLayout } from "../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../utilities/cssDefinitions';
import { FileDOMManager } from './domManager';
import { ElementRenderType, getElementRenderType } from 'src/utilities/elementRenderTypeParser';
import { MarkdownRenderChild } from 'obsidian';

export abstract class RegionManager {

    protected domList: DOMObject[] = [];
    protected domObjectMap: Map<string, DOMObject> = new Map();
    protected regionParent: HTMLElement;

    protected fileManager: FileDOMManager;
    protected regionalSettings: MultiColumnSettings = { numberOfColumns: 2, columnLayout: ColumnLayout.standard, drawBorder: true, drawShadow: true };

    protected regionKey: string;
    protected rootElement: HTMLElement;

    public addObject(siblingsAbove: HTMLDivElement, siblingsBelow: HTMLDivElement, obj: DOMObject): number {

        let prevObj = siblingsAbove.children[siblingsAbove.children.length - 1] as HTMLElement;
        let nextObj = siblingsBelow.children[0] as HTMLElement;

        let addAtIndex = siblingsAbove.children.length;

        let prevObjText = "";
        if (prevObj !== undefined) {

            prevObjText = prevObj.innerText;

            for (let i = this.domList.length - 1; i >= 0; i--) {
                if (this.domList[i].nodeKey === prevObj.innerText) {
                    addAtIndex = i + 1;
                    break;
                }
            }
        }

        let nextElIndex = addAtIndex;
        let nextObjText = "";
        if (nextObj !== undefined) {

            let foundNext = false;
            nextObjText = nextObj.innerText;

            for (let i = addAtIndex; i < this.domList.length; i++) {

                if (this.domList[i].nodeKey === nextObj.innerText.trim()) {

                    nextElIndex = i;
                    foundNext = true;
                    break;
                }
            }
        }

        // console.log(" Prev: ", siblingsAbove.children[siblingsAbove.children.length - 1], "Adding: ", obj.element, " Next: ", siblingsBelow.children[0], "Overwriting:", this.domList.slice(addAtIndex, nextElIndex));
        this.domList.splice(addAtIndex, nextElIndex - addAtIndex, obj);
        this.domObjectMap.set(obj.UID, obj);

        // /**
        //  * Make a copy of the list to log, only because
        //  * console log updates its references with updates in memory.
        //  */
        // let x = this.domList.slice(0);
        // console.log(x);
        return addAtIndex;
    }

    public removeObject(objectUID: string): void {
        // /**
        //  * Make a copy of the list to log
        //  */
        // let x = domList.slice(0);
        // console.log(x);

        // Get the object by key, remove it from the map and then
        // from the list.
        let obj = this.domObjectMap.get(objectUID);
        this.domObjectMap.delete(objectUID);

        if (obj === undefined) {
            return;
        }

        if (this.domList.contains(obj)) {
            this.domList.remove(obj);
        }

        if (this.domList.length === 0) {
            this.fileManager.removeRegion(this.regionKey);
        }

        // x = domList.slice(0);
        // console.log(x);
    }

    public updateElementTag(objectUID: string, newTag: DOMObjectTag): void {

        let obj = this.domObjectMap.get(objectUID);
        let index = this.domList.indexOf(obj);
        if (index !== -1) {
            this.domList[index].tag = newTag;
        }
    }

    public setRegionalSettings(settingsText: string): void {
        this.regionalSettings = parseColumnSettings(settingsText);
    }

    /**
     * Creates an object containing all necessary information for the region
     * to be rendered to the preview pane.
     *
     * @returns a MultiColumnRenderData object with the root DOM element, settings object, and
     * all child objects in the order they should be rendered.
     */
    public getRegionRenderData(): MultiColumnRenderData {

        return {
            parentRenderElement: this.regionParent,
            parentRenderSettings: this.regionalSettings,
            domObjects: this.domList
        };
    }

    /**
     * This fuction is called when a start tag is removed from view meaning
     * our parent element storing the multi-column region is removed. It
     * removes the CSS class from all of the elements so they will be
     * re-rendered in the preview window.
     */
    public displayOriginalElements() {


        for (let i = 0; i < this.domList.length; i++) {

            if (this.domList[i].originalElement) {
                this.domList[i].originalElement.removeClasses([ MultiColumnStyleCSS.RegionEndTag,
                                                                MultiColumnStyleCSS.ColumnEndTag,
                                                                MultiColumnStyleCSS.RegionSettings,
                                                                MultiColumnStyleCSS.RegionContent ]);
                if (this.domList[i].originalElement.parentElement) {
                    this.domList[i].originalElement.parentElement.removeChild(this.domList[i].originalElement);
                }
            }
        }
    }

    public getRootRegionElement(): HTMLElement {
        return this.rootElement;
    }

    public getID(): string {
        return this.regionKey;
    }

    public abstract renderRegionElementsToScreen(): void;
    public abstract exportRegionElementsToPDF(pdfParentElement: HTMLElement): void;

}

export class RegionDOMManager extends RegionManager {


    constructor(fileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement, regionParent: HTMLElement) {
        super();
        this.regionParent = regionParent;
        this.regionKey = regionKey;
        this.rootElement = rootElement;
        this.fileManager = fileManager;
    }

    public renderRegionElementsToScreen(): void {

        this.renderColumnMarkdown(this.regionParent, this.domList, this.regionalSettings);
    }
    public exportRegionElementsToPDF(pdfParentElement: HTMLElement): void {

        // Default set shadow to off for exporting PDFs
        let renderSettings = this.regionalSettings;
        renderSettings.drawShadow = false;
        this.renderColumnMarkdown(pdfParentElement, this.domList.slice(), renderSettings);
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


        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */
        let columnContentDivs = getColumnContentDivs(settings, multiColumnParent);
        if(settings.numberOfColumns === 1) {
            if(settings.drawBorder === true) {
                columnContentDivs[1].addClass(MultiColumnStyleCSS.ColumnBorder);
            }

            if(settings.drawShadow === true) {
                columnContentDivs[1].addClass(MultiColumnStyleCSS.ColumnShadow);
            }
        }
        else {
            if(settings.drawShadow === true) {
                multiColumnParent.addClass(MultiColumnStyleCSS.RegionShadow);
            }
            for(let i = 0; i < columnContentDivs.length; i++) {
                if(settings.drawBorder === true) {
                    columnContentDivs[i].addClass(MultiColumnStyleCSS.ColumnBorder);
                }
    
                if(settings.drawShadow === true) {
                    columnContentDivs[i].addClass(MultiColumnStyleCSS.ColumnShadow);
                }
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

        this.appendElementsToColumns(regionElements, columnContentDivs, settings);
    }

    private appendElementsToColumns(regionElements: DOMObject[], columnContentDivs: HTMLDivElement[], settings: MultiColumnSettings) {

        let columnIndex = 0;
        if(settings.numberOfColumns === 1) {
            columnIndex = 1;
        }

        for (let i = 0; i < regionElements.length; i++) {

            if (regionElements[i].tag !== DOMObjectTag.startRegion ||
                regionElements[i].tag !== DOMObjectTag.regionSettings ||
                regionElements[i].tag !== DOMObjectTag.endRegion ||
                regionElements[i].tag !== DOMObjectTag.columnBreak) {

                // We store the elements in a wrapper container until we determine
                let element = createDiv({
                    cls: MultiColumnLayoutCSS.ColumnDualElementContainer,
                });
                regionElements[i].elementContainer = element;

                // Otherwise we just make a copy of the original element to display.
                let clonedElement = regionElements[i].originalElement.cloneNode(true) as HTMLDivElement;
                regionElements[i].clonedElement = clonedElement;
                element.appendChild(clonedElement);

                if (regionElements[i] instanceof TaskListDOMObject) {

                    this.fixClonedCheckListButtons(regionElements[i] as TaskListDOMObject, true);
                }

                if (element !== null) {

                    columnContentDivs[columnIndex].appendChild(element);
                }

                /**
                 * If the tag is a column break we update the column index after
                 * appending the item to the column div. This keeps the main DOM
                 * cleaner by removing other items and placing them all within
                 * a region container.
                 */
                if (regionElements[i].tag === DOMObjectTag.columnBreak &&
                    (columnIndex + 1) < settings.numberOfColumns) {

                    columnIndex++;
                }
            }
        }
    }

    /**
     * This function takes in the original element and its clone and checks if
     * the element contains a task-list-item class. If so it loops through all
     * items in the list and fixes their checkboxes to properly fire an event.
     * The new checkbox calls the click function on the original checkbox so 
     * compatability with other plugins *should* remain.
     * @param domElement 
     * @param initalizeCheckboxes 
     */
     fixClonedCheckListButtons(domElement: TaskListDOMObject, initalizeCheckboxes: boolean = false) {

        let element: HTMLElement = domElement.originalElement
        let clonedElement: HTMLElement = domElement.clonedElement;

        let clonedListCheckboxes = Array.from(clonedElement.getElementsByClassName("task-list-item")) as HTMLElement[];
        let originalListCheckboxes = Array.from(element.getElementsByClassName("task-list-item")) as HTMLElement[];
        
        if(initalizeCheckboxes === true) {

            // When we initalize we remove the old input checkbox that contains
            // the weird callback situation causing the bug. Then we create a new
            // checkbox to replace it and set it up to fire the click event on
            // the original checkbox so functionality is restored.
            for(let i = 0; i < originalListCheckboxes.length; i++) {

                const checkbox = createEl('input');

                let originalInput = originalListCheckboxes[i].firstChild as HTMLInputElement

                checkbox.checked = originalInput.checked;
                clonedListCheckboxes[i].replaceChild(checkbox, clonedListCheckboxes[i].children[0]);
                checkbox.addClass('task-list-item-checkbox');
                checkbox.type = 'checkbox';
                checkbox.onClickEvent(() => {
                    domElement.checkboxClicked(i)
                });
            }
        }
        else {

            // Whenever we reach this point we update our list of original checkboxes
            // that may be different from our cache. This is due to how obsidian
            // changes the DOM underneath us so we need to constantly update our cache.
            domElement.originalCheckboxes = originalListCheckboxes;
        }

        // When the Tasks plugin is installed the cloned copy of the original element contains
        // an extra element for some reason. If this occurs for other reasons here we adjust
        // that to keep the clone the same as the original.
        if(clonedListCheckboxes.length > originalListCheckboxes.length) {

            for(let i = originalListCheckboxes.length; i < clonedListCheckboxes.length; i++) {
                
                domElement.clonedElement.removeChild(clonedListCheckboxes[i])
            }
        }
    }

    checkSpecialElement(domElement: DOMObject) {

        if(domElement.originalElement.getElementsByClassName("task-list-item").length > 0 ) {

            return new TaskListDOMObject(domElement);
        }

        return domElement;
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
        let renderElement: HTMLDivElement = domElement.originalElement as HTMLDivElement
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

    updateRenderedMarkdown() {
        /**
         * This function acts as the update loop for the multi-column regions.
         * Here we loop through all of the elements within the rendered region and 
         * potentially update how things are rendered. We need to do this for
         * compatability with other plugins. 
         * 
         * If the multi-column region is rendered before other plugins that effect
         * content within the region our rendered data may not properly display
         * the content from the other plugin. Here we loop through the elements 
         * after all plugins have had a chance to run and can make changes to the
         * DOM at this point.
         */
        for(let i = 0; i < this.domList.length; i++) {
            
            /**
             * Here we check for special cases 
             */
            if(this.domList[i] instanceof TaskListDOMObject) {

                this.fixClonedCheckListButtons(this.domList[i] as TaskListDOMObject);
            }


            let elementType = this.domList[i].elementType;

            /**
             * If the element is not currently a special render element we check again
             * as the original element may have been updated.
             * 
             * TODO: find a way to "Officially" mark normal elements rather than
             * continuously search for special render types.
             */
            if(elementType !== ElementRenderType.specialRender) {
                
                // If the new result returns as a special renderer we update so
                // this wont run again for this item.
                elementType = getElementRenderType(this.domList[i].originalElement);
            }

            if(elementType === ElementRenderType.specialRender) {
                    
                this.domList[i].elementType = elementType;
                this.setUpDualRender(this.domList[i]);
            }
        }
    }
}

export type MultiColumnRenderData = { 
    parentRenderElement: HTMLElement, 
    parentRenderSettings: MultiColumnSettings,
    domObjects: DOMObject[]
}

/**
 * Sets up the CSS classes and the number of columns based on the passed settings.
 * @param settings The user defined settings that determine what CSS is set here.
 * @param multiColumnParent The parent object that the column divs will be created under.
 * @returns The list of column divs created under the passed parent element.
 */
 function getColumnContentDivs(settings: MultiColumnSettings, multiColumnParent: HTMLDivElement): HTMLDivElement[] {

    let columnContentDivs: HTMLDivElement[] = []
    if(settings.numberOfColumns === 1) {
        switch(settings.columnLayout) {
            case(ColumnLayout.standard):
            case(ColumnLayout.left):
            case(ColumnLayout.first):
            case(ColumnLayout.middle):
            case(ColumnLayout.center):
            case(ColumnLayout.second):
            case(ColumnLayout.right):
            case(ColumnLayout.third):
            case(ColumnLayout.last):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyMiddle_Left`
                }));
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `columnContent threColumnsHeavyMiddle_Middle`
                }));
                break;
        }
    }
    else if(settings.numberOfColumns === 2) {

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