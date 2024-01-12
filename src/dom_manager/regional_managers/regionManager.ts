/**
 * File: /src/dom_manager/regional_managers/RegionManager.ts                   *
 * Created Date: Sunday, May 22nd 2022, 7:49 pm                                *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2022 Cameron Robinson                                         *
 */

import { DOMObject, DOMObjectTag, TaskListDOMObject } from '../domObject';
import { MultiColumnSettings, ColumnLayout, getDefaultMultiColumnSettings, columnSpacingState, getIndexedClampedArrayValue, isColumnLayout, validateColumnLayout } from "../../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../../utilities/cssDefinitions';
import { FileDOMManager } from '../domManager';
import { getElementRenderType } from 'src/utilities/elementRenderTypeParser';
import { RegionManagerData } from './regionManagerContainer';
import { searchChildrenForNodeType, searchChildrenForNodesOfType } from 'src/utilities/utils';
import { HTMLSizing } from 'src/utilities/interfaces';
import { RegionErrorManager } from '../regionErrorManager';

export type MultiColumnRenderData = { 
    parentRenderElement: HTMLElement, 
    parentRenderSettings: MultiColumnSettings,
    domObjects: DOMObject[]
}

export abstract class RegionManager {

    protected domList: DOMObject[] = [];
    public get numberOfChildren(): number {
        return this.domList.length;
    }
    protected domObjectMap: Map<string, DOMObject> = new Map();
    private _regionParent: HTMLElement;
    public get regionParent(): HTMLElement {
        return this._regionParent;
    }
    public set regionParent(value: HTMLElement) {
        this._regionParent = value;
    }

    protected fileManager: FileDOMManager;
    protected regionalSettings: MultiColumnSettings = getDefaultMultiColumnSettings();

    protected regionKey: string;
    private _errorManager: RegionErrorManager;
    public get errorManager(): RegionErrorManager {
        return this._errorManager;
    }
    protected set errorManager(value: RegionErrorManager) {
        this._errorManager = value;
    }
    public updateErrorManager(newManager: RegionErrorManager, rootElement: HTMLDivElement) {
        while(rootElement.children.length > 0) {
            rootElement.childNodes.forEach(child => {
                rootElement.removeChild(child)
            })
        }
        this._errorManager = newManager;
        this._errorManager.setRegionRootElement(rootElement)
    }

    constructor(data: RegionManagerData) {
        this.domList = data.domList;
        this.domObjectMap = data.domObjectMap;
        this.regionParent = data.regionParent;

        this.fileManager = data.fileManager;
        this.regionalSettings = data.regionalSettings;

        this.regionKey = data.regionKey;
        this.errorManager = data.errorManager
    }

    public getRegionData(): RegionManagerData {

        return {
            domList: this.domList,
            domObjectMap: this.domObjectMap,
            regionParent: this.regionParent,

            fileManager: this.fileManager,
            regionalSettings: this.regionalSettings,

            regionKey: this.regionKey,
            rootElement: null,
            errorManager: this.errorManager
        };
    }

    /**
     * Adds a new object to the region by finding where it should be relative to its siblings.
     * @param siblingsAbove The Markdown text rendered elements for sibilings above this element in the dom
     * @param siblingsBelow The Markdown text rendered elements for sibilings below this element in the dom
     * @param obj The object to add.
     * @returns Returns the index at which the object has been added.
     */
    public addObject(siblingsAbove: HTMLDivElement, siblingsBelow: HTMLDivElement, obj: DOMObject): number {

        let nextObj = siblingsBelow.children[0] as HTMLElement;

        let addAtIndex = siblingsAbove.children.length;

        if (siblingsAbove.children.length > 0) {

            /**
             * We want to find the first sibling withouth "" for an inner text so we can use that to anchor our
             * element into the domList. For most items the first element before our new element will have the proper
             * innerText. Sometimes other elements are empty and were causing issues.
             * 
             * Now we loop back through the previous siblings looking for the first one with a valid inner text and using that 
             * as the anchor and offsetting our addAtIndex by the number of empty string elements we found.
             */
            let prevSiblingInnerText = ""
            let prevSiblingOffset = 0;
            for(let i = siblingsAbove.children.length - 1; i >= 0; i--) {

                let obj = siblingsAbove.children[i] as HTMLElement;
                if(obj.innerText !== "") {
                
                    prevSiblingInnerText = obj.innerText;
                    break;
                }

                prevSiblingOffset++;
            }

            for (let i = this.domList.length - 1; i >= 0; i--) {
                if (this.domList[i].nodeKey === prevSiblingInnerText) {
                    addAtIndex = i + 1 + prevSiblingOffset;
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

        // console.log(" Prev: ", Array.from(siblingsAbove.children).slice(-3), "Adding: ", obj.originalElement, " Next: ", siblingsBelow.children[0], "Overwriting:", this.domList.slice(addAtIndex, nextElIndex));
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

    public addObjectAtIndex(obj: DOMObject, index: number) {

        this.domList.splice(index, 0, obj);
        this.domObjectMap.set(obj.UID, obj);
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

        if (this.domList.length === 0 && this.fileManager !== null) {
            this.fileManager.removeRegion(this.regionKey);
        }

        // x = domList.slice(0);
        // console.log(x);
    }

    public updateElementTag(objectUID: string, newTag: DOMObjectTag): void {

        let obj = this.domObjectMap.get(objectUID);
        obj.tag = newTag;
    }

    public setRegionalSettings(regionSettings: MultiColumnSettings): void {
        this.regionalSettings = regionSettings;
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
                this.domList[i].originalElement.removeClasses([MultiColumnStyleCSS.RegionEndTag,
                MultiColumnStyleCSS.ColumnEndTag,
                MultiColumnStyleCSS.RegionSettings,
                MultiColumnStyleCSS.RegionContent]);
                if (this.domList[i].originalElement.parentElement) {
                    this.domList[i].originalElement.parentElement.removeChild(this.domList[i].originalElement);
                }
            }
        }
    }
    
    public getID(): string {
        return this.regionKey;
    }

    public updateRenderedMarkdown() {
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
        for (let i = 0; i < this.domList.length; i++) {

            let elementType = this.domList[i].elementType;
            if(elementType === "unRendered") {
                continue;
            }

            /**
             * If the element is not currently a special render element we check again
             * as the original element may have been updated.
             */
            if(elementType === "undefined" ||
               elementType === "basicElement" ||
               elementType === "specialRender") {

                // If the new result returns as a special renderer we update so
                // this wont run again for this item.
                elementType = getElementRenderType(this.domList[i].originalElement);
            }

            let taskListObj = (this.domList[i] as TaskListDOMObject)
            /**
             * Here we check for special cases
             */
            if (taskListObj && 
                elementType === "dataviewJSEmbed") {

                if(this.domList[i].clonedElementReadyForUpdate()) {

                    cloneElement(this.domList[i]);
                    this.fixClonedCheckListButtons(this.domList[i] as TaskListDOMObject, true);
                }
                else {
                    this.fixClonedCheckListButtons(this.domList[i] as TaskListDOMObject)
                }
                continue
            }

            if (taskListObj && 
                elementType === "basicElement") {

                this.fixClonedCheckListButtons(this.domList[i] as TaskListDOMObject);
                continue
            }

            if(elementType === "basicElement") {
                this.domList[i].elementType = "basicElement"
                continue;
            }

            if(elementType === "imageEmbed") {//ElementRenderType.fixedElementRender) {
                this.domList[i].elementType = elementType;
                continue;
            }

            if(elementType === "buttonPlugin") {
                processButtonPluginUpdate(this.domList[i])
                continue;
            }

            if(elementType === "pdfEmbed") {
                this.domList[i].elementType = elementType;
                this.setUpDualRender(this.domList[i]);
                continue;
            }

            if(elementType === "diceRoller" ||
               elementType === "admonitionFold" ||
               elementType === "calloutCopyButton" ||
               elementType === "dataviewPlugin" ||
               elementType === "internalEmbed" ||
               elementType === "dataviewJSCanvasEmbed" ||
               elementType === "dataviewJSEmbed" || 
               elementType === "dataviewInlineQuery" ||
               elementType === "tasksPlugin"
               ) {
                this.domList[i].elementType = elementType;
                this.setUpDualRender(this.domList[i]);
                continue;
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
    protected fixClonedCheckListButtons(domElement: TaskListDOMObject, initalizeCheckboxes: boolean = false) {

        if(domElement.originalElement === null || domElement.clonedElement === null) {
            return;
        }

        let element: HTMLElement = domElement.originalElement;
        let clonedElement: HTMLElement = domElement.clonedElement;

        let clonedListCheckboxes = Array.from(clonedElement.getElementsByClassName("task-list-item")) as HTMLElement[];
        let originalListCheckboxes = Array.from(element.getElementsByClassName("task-list-item")) as HTMLElement[];

        if (initalizeCheckboxes === true) {

            domElement.originalCheckboxes = originalListCheckboxes;
            // When we initalize we remove the old input checkbox that contains
            // the weird callback situation causing the bug. Then we create a new
            // checkbox to replace it and set it up to fire the click event on
            // the original checkbox so functionality is restored.
            for (let i = 0; i < originalListCheckboxes.length; i++) {

                const checkbox = createEl('input');

                let originalInput = originalListCheckboxes[i].getElementsByTagName("input")[0]

                let isChecked = false
                if(originalInput) {
                    isChecked = originalInput.checked
                }
                else {
                    console.debug("Could not find original checkbox. Is it null?")
                }

                let oldCheckbox = TaskListDOMObject.getChildCheckbox(clonedListCheckboxes[i])
                clonedListCheckboxes[i].replaceChild(checkbox, oldCheckbox);

                checkbox.checked = isChecked
                checkbox.addClass('task-list-item-checkbox');
                checkbox.type = 'checkbox';
                checkbox.onClickEvent(() => {
                    domElement.checkboxClicked(i);
                    if(checkbox.checked) {
                        clonedListCheckboxes[i].addClass("is-checked")
                        clonedListCheckboxes[i].setAttr("data-task", "x")
                    }
                    else {
                        clonedListCheckboxes[i].removeClass("is-checked")
                        clonedListCheckboxes[i].setAttr("data-task", " ")
                    }
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
        if (clonedListCheckboxes.length > originalListCheckboxes.length) {

            for (let i = originalListCheckboxes.length; i < clonedListCheckboxes.length; i++) {

                try {
                    clonedListCheckboxes[i].detach()
                } catch (error) {
                    console.debug("No child found when removing from list.")
                }
            }
        }
    }

    protected setUpDualRender(domElement: DOMObject) {

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

         let originalElement = domElement.originalElement;
         let clonedElement = domElement.clonedElement;
         let containerElement: HTMLDivElement = domElement.elementContainer;

        // Get height of the original and cloned element. If the element is not currently rendered
        // it will have 0 height so we need to temporarily render it to get the height.
        let originalElementHeight = getElementClientHeight(originalElement, containerElement);
        let clonedElementHeight = getElementClientHeight(clonedElement, containerElement);

        if(domElement.elementType === "pdfEmbed") {
            updatePDFEmbed(domElement)
            return
        }
        if(domElement.elementType === "dataviewJSCanvasEmbed") {
            reRenderDataviewJS(domElement)
            return
        }

        /**
         * We only want to clone the element once to reduce GC. But if the cloned 
         * element's height is not equal to the original element, this means the
         * item element has been updated somewhere else without the dom being 
         * refreshed. This can occur when elements are updated by other plugins, 
         * such as Dataview.
         */
        if((clonedElement === null  || 
           Math.abs(clonedElementHeight - originalElementHeight) > 10 ||
           domElement.clonedElementReadyForUpdate() === true)) {
            
            // console.log("Updating Cloned Element.", ElementRenderType[domElement.elementType], clonedElementHeight, originalElementHeight)
            // Update clone and reference.
            cloneElement(domElement);
        }
        
        /** 
         * If the container element has less than 2 children we need to move the
         * original element back into it. However some elements constantly get moved
         * in and out causing some unwanted behavior. Those element will be tagged
         * as specialSingleElementRender so we ignore those elements here.
         */
        if(domElement.elementContainer.children.length < 2 && 
           domElement.elementType !== "dataviewPlugin" &&
           domElement.elementType !== "internalEmbed" &&
           domElement.elementType !== "dataviewJSEmbed") {

            // console.log("Updating dual rendering.", domElement, domElement.originalElement.parentElement, domElement.originalElement.parentElement?.childElementCount);

            // Make sure our CSS is up to date.
            originalElement.addClass(MultiColumnLayoutCSS.OriginalElementType);
            clonedElement.addClass(MultiColumnLayoutCSS.ClonedElementType);
            clonedElement.removeClasses([MultiColumnStyleCSS.RegionContent, MultiColumnLayoutCSS.OriginalElementType]);
    
            for (let i = containerElement.children.length - 1; i >= 0; i--) {
                containerElement.children[i].detach();
            }
            containerElement.appendChild(originalElement);
            containerElement.appendChild(clonedElement);
        }
    }

    /**
     * Sets up the CSS classes and the number of columns based on the passed settings.
     * @param settings The user defined settings that determine what CSS is set here.
     * @param multiColumnParent The parent object that the column divs will be created under.
     * @returns The list of column divs created under the passed parent element.
     */
    getColumnContentDivs(settings: MultiColumnSettings, multiColumnParent: HTMLDivElement): HTMLDivElement[] {

        let columnContentDivs: HTMLDivElement[] = []
        
        if(typeof settings.columnSize === "string" &&
           isColumnLayout(settings.columnSize)     && 
           (settings.numberOfColumns === 2 || settings.numberOfColumns === 3)) {      

            settings.columnSize = validateColumnLayout(settings.columnSize)
            multiColumnParent.removeClass(MultiColumnLayoutCSS.ContentOverflowAutoScroll_X);
            multiColumnParent.addClass(MultiColumnLayoutCSS.ContentOverflowHidden_X);

            buildStandardLayouts(settings, multiColumnParent, columnContentDivs)
            setMaxColumnHeight();
            return columnContentDivs;
        }

        if(typeof settings.columnSize === "string" &&
           isColumnLayout(settings.columnSize)     && 
           settings.columnSize === "standard" && 
           settings.numberOfColumns > 3 ){

            settings.columnSize = validateColumnLayout(settings.columnSize);
            multiColumnParent.removeClass(MultiColumnLayoutCSS.ContentOverflowAutoScroll_X);
            multiColumnParent.addClass(MultiColumnLayoutCSS.ContentOverflowHidden_X);

            buildEqualLayout(settings, multiColumnParent, columnContentDivs);

            setMaxColumnHeight();
            return columnContentDivs;
        }
        
        let columnSizes: HTMLSizing[] = [];
        // If the user has defined the widths individually then we just need to create
        // each column individually with each width size.
        if(Array.isArray(settings.columnSize)) {
            columnSizes = settings.columnSize.slice();
        }
        else {
            calcColumnSizes(settings, columnSizes)
        }

        if(columnSizes.length === 0) {
            columnSizes.push(HTMLSizing.create().setWidth(50).setUnits("%"))
        }

        for(let i = 0; i < settings.numberOfColumns; i++) {

            let sizing = getIndexedClampedArrayValue(i, columnSizes);

            columnContentDivs.push(multiColumnParent.createDiv({
                cls: `${MultiColumnStyleCSS.ColumnContent}`,
                attr: {"style": `width: ${sizing.toString()}`}
            }));

            if(i !== settings.numberOfColumns - 1) {
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
            }
        }

        for(let i = 0; i < columnContentDivs.length; i++) {

            columnContentDivs[i].addClass(MultiColumnLayoutCSS.NoFlexShrink);
        }

        setMaxColumnHeight();

        return columnContentDivs;

        function setMaxColumnHeight() {
            if (settings.columnHeight !== null) {
                
                multiColumnParent.removeClass(MultiColumnLayoutCSS.ContentOverflowHidden_Y);
                multiColumnParent.addClass(MultiColumnLayoutCSS.ContentOverflowAutoScroll_Y);
                columnContentDivs.forEach((column) => {
                    column.style.height = settings.columnHeight.toString();
                    column.style.maxHeight = settings.columnHeight.toString();
                    column.style.minHeight = settings.columnHeight.toString();
                });
            }
        }
    }

    public abstract renderRegionElementsToScreen(): void;
    public abstract exportRegionElementsToPDF(pdfParentElement: HTMLElement): void;
    public abstract renderRegionElementsToLivePreview(parentElement: HTMLElement): void
}

function createErrorElement(errorText: string, alt: string = "", src: string = ""): HTMLDivElement {
    let errorEl = createDiv({
        cls: "internal-embed markdown-embed inline-embed is-loaded",
        attr: {
            "tabindex": "-1",
            "contenteditable": "false"
        }
    })
    errorEl.setAttr("alt", alt);
    errorEl.setAttr("src", `app://obsidian.md/${src}`)
    errorEl.appendChild(createDiv(
        {
            "cls": "embed-title markdown-embed-title",
        }
    ));
    let contentEl = errorEl.createDiv({
        "cls": `markdown-embed-content`,
    });
    let paragraph = contentEl.createEl("p", {
        "cls": `${MultiColumnStyleCSS.RegionErrorMessage}, ${MultiColumnStyleCSS.SmallFont}`
    });
    paragraph.innerText = errorText;

    return errorEl
}

function updatePDFEmbed(domElement: DOMObject) {
    
    // if(domElement.canvasReadyForUpdate() === false) {
    //     return
    // }

    let originalElement = domElement.originalElement;
    let clonedElement = domElement.clonedElement;
    let containerElement: HTMLDivElement = domElement.elementContainer;
    for (let i = clonedElement.children.length - 1; i >= 0; i--) {
        clonedElement.children[i].detach();
    }
    clonedElement.appendChild(createErrorElement("Due to an update to Obsidian's PDF viewer, PDF embeds are currently not supported.\nSorry for the inconvienence."))
    return
}

function reRenderDataviewJS(domElement: DOMObject) {
    if(domElement.canvasReadyForUpdate() === false) {
        return
    }

    let originalElement = domElement.originalElement;
    let clonedElement = domElement.clonedElement;
    let containerElement: HTMLDivElement = domElement.elementContainer;

    containerElement.appendChild(originalElement);
    if(clonedElement !== null && clonedElement.parentElement === containerElement) {
        containerElement.removeChild(clonedElement);
    }

    function cloneCanvas(originalCanvas: HTMLCanvasElement): HTMLCanvasElement {

        //create a new canvas
        let clonedCanvas: HTMLCanvasElement = originalCanvas.cloneNode(true) as HTMLCanvasElement;
        let context: CanvasRenderingContext2D = clonedCanvas.getContext('2d');
    
        //set dimensions
        clonedCanvas.width = originalCanvas.width;
        clonedCanvas.height = originalCanvas.height;

        if(clonedCanvas.width === 0 || clonedCanvas.height === 0){
            // Dont want to render if the width is 0 as it throws an error
            // would happen if the old canvas hasnt been rendered yet.
            return clonedCanvas;
        } 

        //apply the old canvas to the new one
        context.drawImage(originalCanvas, 0, 0);
    
        //return the new canvas
        return clonedCanvas;
    }

    let canvas = searchChildrenForNodeType(originalElement, "canvas");
    if(canvas !== null) {
        
        domElement.updateClonedElement(originalElement.cloneNode(true) as HTMLDivElement);
        clonedElement = domElement.clonedElement;
        clonedElement.addClass(MultiColumnLayoutCSS.ClonedElementType);
        clonedElement.removeClasses([MultiColumnStyleCSS.RegionContent, MultiColumnLayoutCSS.OriginalElementType]);
        containerElement.appendChild(clonedElement);

        for (let i = clonedElement.children.length - 1; i >= 0; i--) {
            clonedElement.children[i].detach();
        }
        clonedElement.appendChild(cloneCanvas(canvas as HTMLCanvasElement))
    }

    containerElement.removeChild(originalElement);
    containerElement.appendChild(clonedElement);
}

function calcColumnSizes(settings: MultiColumnSettings, columnSizes: HTMLSizing[]) {
    let layout = settings.columnSize as ColumnLayout;

    if(settings.numberOfColumns === 2) {
        switch(layout) {
            case("standard"):
            case("middle"):
            case("center"):
            case("third"):
                columnSizes.push(HTMLSizing.create().setWidth(50).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(50).setUnits("%"))
                break;

            case("left"):
            case("first"):
                columnSizes.push(HTMLSizing.create().setWidth(75).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                break;

            case("right"):
            case("second"):
            case("last"):
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(75).setUnits("%"))
                break;
        }
        return;
    }

    if(settings.numberOfColumns === 3) {
        switch(layout) {
            case("standard"):
                columnSizes.push(HTMLSizing.create().setWidth(33).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(33).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(33).setUnits("%"))
                break;

            case("left"):
            case("first"):
                columnSizes.push(HTMLSizing.create().setWidth(50).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                break;

            case("middle"):
            case("center"):
            case("second"):
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(50).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                break;

            case("right"):
            case("third"):
            case("last"):
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(25).setUnits("%"))
                columnSizes.push(HTMLSizing.create().setWidth(50).setUnits("%"))
                break;
        }
    }
}

function getElementClientHeight(element: HTMLElement, parentRenderElement: HTMLDivElement): number {

    let height = element.clientHeight;
    if(height === 0) {
        parentRenderElement.appendChild(element);
        height = element.clientHeight
        parentRenderElement.removeChild(element);
    }
    return height
}

function buildEqualLayout(settings: MultiColumnSettings, multiColumnParent: HTMLDivElement, columnContentDivs: HTMLDivElement[]) {

    let percent = Math.ceil(100 / settings.numberOfColumns);

    for(let i = 0; i < settings.numberOfColumns; i++) {
        
        columnContentDivs.push(multiColumnParent.createDiv({
            cls: `${MultiColumnStyleCSS.ColumnContent}`,
            attr: {"style": `width: ${percent}%`}
        }));

        if(i !== settings.numberOfColumns - 1) {
            multiColumnParent.createDiv({
                cls: `mcm-column-spacer`,
                attr: {"style": columnSpacingState(0, settings)}
            });
        }
    }
}

function buildStandardLayouts(settings: MultiColumnSettings, multiColumnParent: HTMLDivElement, columnContentDivs: HTMLDivElement[]) {

    let layout = settings.columnSize as ColumnLayout;

    if(settings.numberOfColumns === 2) {
        switch(layout) {
            case("standard"):
            case("middle"):
            case("center"):
            case("third"):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoEqualColumns}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoEqualColumns}`
                }));
                break;

            case("left"):
            case("first"):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnLarge}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnSmall}`
                }));
                break;

            case("right"):
            case("second"):
            case("last"):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnSmall}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnLarge}`
                }));
                break;
        }
        return;
    }

    if(settings.numberOfColumns === 3) {
        switch(layout) {
            case("standard"):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeEqualColumns}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeEqualColumns}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(1, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeEqualColumns}`
                }));
                break;

            case("left"):
            case("first"):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Large}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(1, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                }));
                break;

            case("middle"):
            case("center"):
            case("second"):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Large}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(1, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                }));
                break;

            case("right"):
            case("third"):
            case("last"):
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(0, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                }));
                multiColumnParent.createDiv({
                    cls: `mcm-column-spacer`,
                    attr: {"style": columnSpacingState(1, settings)}
                });
                columnContentDivs.push(multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Large}`
                }));
                break;
        }
    }
}

function fixOnClick(domElement: DOMObject) {

    let originalElement = domElement.originalElement;
    let clonedElement = domElement.clonedElement;

    let originalButton = originalElement.getElementsByTagName("button")[0];
    let clonedButton = clonedElement.getElementsByTagName("button")[0];

    if(originalButton === undefined || clonedButton === undefined) {
        return;
    }

    clonedButton.onClickEvent((ev) => {

        originalButton.click();
    })
}

function cloneElement(domElement: DOMObject) {

    let originalElement = domElement.originalElement;
    let clonedElement = domElement.clonedElement;
    let containerElement: HTMLDivElement = domElement.elementContainer;

    domElement.updateClonedElement(originalElement.cloneNode(true) as HTMLDivElement);
    clonedElement = domElement.clonedElement;

    /**
     * If we updated the cloned element, we want to also update the
     * element rendered in the parent container.
     */
    for (let i = containerElement.children.length - 1; i >= 0; i--) {
        containerElement.children[i].detach();
    }

    // Update CSS, we add cloned class and remove classes from originalElement that do not apply.
    clonedElement.addClass(MultiColumnLayoutCSS.ClonedElementType);
    clonedElement.removeClasses([MultiColumnStyleCSS.RegionContent, MultiColumnLayoutCSS.OriginalElementType]);
    containerElement.appendChild(clonedElement);
}

function processButtonPluginUpdate(domObject: DOMObject) {

    domObject.elementType = "buttonPlugin"
    if(domObject.clonedElementReadyForUpdate() === true) {
        cloneElement(domObject);
        fixOnClick(domObject);
    }
}