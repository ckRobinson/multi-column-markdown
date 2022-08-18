/**
 * File: /src/dom_manager/regional_managers/RegionManager.ts                   *
 * Created Date: Sunday, May 22nd 2022, 7:49 pm                                *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2022 Cameron Robinson                                         *
 */

import { DOMObject, DOMObjectTag, TaskListDOMObject } from '../domObject';
import { MultiColumnSettings, ColumnLayout, getDefaultMultiColumnSettings } from "../../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../../utilities/cssDefinitions';
import { FileDOMManager } from '../domManager';
import { ElementRenderType, getElementRenderType } from 'src/utilities/elementRenderTypeParser';
import { RegionManagerData } from './regionManagerContainer';
import { searchChildrenForNodeType } from 'src/utilities/utils';

export type MultiColumnRenderData = { 
    parentRenderElement: HTMLElement, 
    parentRenderSettings: MultiColumnSettings,
    domObjects: DOMObject[]
}

export abstract class RegionManager {

    protected domList: DOMObject[] = [];
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

    constructor(data: RegionManagerData) {

        this.domList = data.domList;
        this.domObjectMap = data.domObjectMap;
        this.regionParent = data.regionParent;

        this.fileManager = data.fileManager;
        this.regionalSettings = data.regionalSettings;

        this.regionKey = data.regionKey;
    }

    public getRegionData(): RegionManagerData {

        return {
            domList: this.domList,
            domObjectMap: this.domObjectMap,
            regionParent: this.regionParent,

            fileManager: this.fileManager,
            regionalSettings: this.regionalSettings,

            regionKey: this.regionKey,
            rootElement: null
        };
    }

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

        if (this.domList.length === 0 && this.fileManager !== null) {
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

            /**
             * Here we check for special cases
             */
            if (this.domList[i] instanceof TaskListDOMObject) {

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
            if (elementType !== ElementRenderType.specialRender &&
                elementType !== ElementRenderType.specialSingleElementRender && 
                elementType !== ElementRenderType.unRendered) {

                // If the new result returns as a special renderer we update so
                // this wont run again for this item.
                elementType = getElementRenderType(this.domList[i].originalElement);
                this.domList[i].originalElement.clientHeight;
            }

            if (elementType === ElementRenderType.specialRender ||
                elementType === ElementRenderType.specialSingleElementRender || 
                elementType === ElementRenderType.canvasRenderElement) {

                this.domList[i].elementType = elementType;
                this.setUpDualRender(this.domList[i]);
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

            // When we initalize we remove the old input checkbox that contains
            // the weird callback situation causing the bug. Then we create a new
            // checkbox to replace it and set it up to fire the click event on
            // the original checkbox so functionality is restored.
            for (let i = 0; i < originalListCheckboxes.length; i++) {

                const checkbox = createEl('input');

                let originalInput = originalListCheckboxes[i].firstChild as HTMLInputElement;

                checkbox.checked = originalInput.checked;
                clonedListCheckboxes[i].replaceChild(checkbox, clonedListCheckboxes[i].children[0]);
                checkbox.addClass('task-list-item-checkbox');
                checkbox.type = 'checkbox';
                checkbox.onClickEvent(() => {
                    domElement.checkboxClicked(i);
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

                domElement.clonedElement.removeChild(clonedListCheckboxes[i]);
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

        /**
         * We only want to clone the element once to reduce GC. But if the cloned 
         * element's height is not equal to the original element, this means the
         * item element has been updated somewhere else without the dom being 
         * refreshed. This can occur when elements are updated by other plugins, 
         * such as Dataview.
         */
        if(clonedElement === null  || 
            clonedElementHeight !== originalElementHeight) {
            
            // Update clone and reference.
            domElement.clonedElement = originalElement.cloneNode(true) as HTMLDivElement;
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

        if(domElement.elementType === ElementRenderType.canvasRenderElement) {

            containerElement.appendChild(originalElement);

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
                for (let i = clonedElement.children.length - 1; i >= 0; i--) {
                    clonedElement.children[i].detach();
                }
                clonedElement.appendChild(cloneCanvas(canvas as HTMLCanvasElement))
            }

            containerElement.removeChild(originalElement);
        }
        
        /** 
         * If the container element has less than 2 children we need to move the
         * original element back into it. However some elements constantly get moved
         * in and out causing some unwanted behavior. Those element will be tagged
         * as specialSingleElementRender so we ignore those elements here.
         */
        if(domElement.elementContainer.children.length < 2 && 
            domElement.elementType !== ElementRenderType.specialSingleElementRender) {

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
        let styleStr: string = ""
        if(settings.columnSpacing !== "") {

            styleStr = `margin-inline: ${settings.columnSpacing};`
        }

        if(settings.numberOfColumns === 2) {

            switch(settings.columnLayout) {
                case(ColumnLayout.standard):
                case(ColumnLayout.middle):
                case(ColumnLayout.center):
                case(ColumnLayout.third):
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoEqualColumns}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoEqualColumns}`
                    }));
                    break;

                case(ColumnLayout.left):
                case(ColumnLayout.first):
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnLarge}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnSmall}`
                    }));
                    break;

                case(ColumnLayout.right):
                case(ColumnLayout.second):
                case(ColumnLayout.last):
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnSmall}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.TwoColumnLarge}`
                    }));
                    break;
            }
        }
        else if(settings.numberOfColumns === 3) {

            switch(settings.columnLayout) {
                case(ColumnLayout.standard):
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeEqualColumns}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeEqualColumns}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeEqualColumns}`
                    }));
                    break;

                case(ColumnLayout.left):
                case(ColumnLayout.first):
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Large}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                    }));
                    break;

                case(ColumnLayout.middle):
                case(ColumnLayout.center):
                case(ColumnLayout.second):
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Large}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                    }));
                    break;

                case(ColumnLayout.right):
                case(ColumnLayout.third):
                case(ColumnLayout.last):
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Small}`
                    }));
                    multiColumnParent.createDiv({
                        cls: `mcm-column-spacer`,
                        attr: {"style": styleStr}
                    });
                    columnContentDivs.push(multiColumnParent.createDiv({
                        cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.ThreeColumn_Large}`
                    }));
                    break;
            }
        }

        return columnContentDivs;
    }

    public abstract renderRegionElementsToScreen(): void;
    public abstract exportRegionElementsToPDF(pdfParentElement: HTMLElement): void;
    public abstract renderRegionElementsToLivePreview(parentElement: HTMLElement): void
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