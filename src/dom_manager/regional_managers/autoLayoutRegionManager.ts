/**
 * File: /src/dom_manager/regional_managers/autoLayoutRegionManager.ts         *
 * Created Date: Sunday, May 22nd 2022, 10:23 pm                               *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2022 Cameron Robinson                                         *
 */

import { DOMObject, DOMObjectTag, TaskListDOMObject } from '../domObject';
import { AlignmentType, ContentOverflowType, MultiColumnSettings, TableAlignment, columnAlignmentState, columnOverflowState, shouldDrawColumnBorder } from "../../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../../utilities/cssDefinitions';
import { RegionManager } from './regionManager';
import { getHeadingCollapseElement, hasHeader } from 'src/utilities/elementRenderTypeParser';
import { RegionManagerData } from './regionManagerContainer';
import { MCM_SettingsManager } from 'src/pluginSettings';

export class AutoLayoutRegionManager extends RegionManager {

    private isLivePreview: boolean = false;
    private previousColumnHeights: number[] = []

    private columnParent: HTMLDivElement;
    private columnDivs: HTMLDivElement[];
    private docReflow: boolean;

    constructor(data: RegionManagerData, isLivePreview: boolean = false) {
        super(data);

        this.isLivePreview = isLivePreview;
        this.docReflow = data.regionalSettings.fullDocReflow;
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
    public renderRegionElementsToLivePreview(parentElement: HTMLElement): void {

        this.renderColumnMarkdown(parentElement, this.domList, this.regionalSettings, true);
    }
    /**
     * This function takes in the data for the multi-column region and sets up the 
     * user defined number of children with the proper css classes to be rendered properly.
     * 
     * @param parentElement The element that the multi-column region will be rendered under.
     * @param regionElements The list of DOM objects that will be coppied under the parent object
     * @param settings The settings the user has defined for the region.
     */
    private renderColumnMarkdown(parentElement: HTMLElement, regionElements: DOMObject[], settings: MultiColumnSettings, isLivePreview: boolean = false) {

        let multiColumnParent = createDiv({
            cls: `${MultiColumnLayoutCSS.RegionColumnContainerDiv} \
                  ${MultiColumnLayoutCSS.ContentOverflowAutoScroll_X} \
                  ${MultiColumnLayoutCSS.ContentOverflowHidden_Y};
                  `
        });
        this.columnParent = multiColumnParent;

        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */
        this.columnDivs = this.getColumnContentDivs(settings, multiColumnParent);

        if (settings.drawShadow === true) {
            multiColumnParent.addClass(MultiColumnStyleCSS.RegionShadow);
        }
        for (let i = 0; i < this.columnDivs.length; i++) {
            if(shouldDrawColumnBorder(i, settings) === true) {
                this.columnDivs[i].addClass(MultiColumnStyleCSS.ColumnBorder);
            }

            if (settings.drawShadow === true) {
                this.columnDivs[i].addClass(MultiColumnStyleCSS.ColumnShadow);
            }
        }

        // Remove every other child from the parent so 
        // we dont end up with multiple sets of data. This should
        // really only need to loop once for i = 0 but loop just
        // in case.
        for (let i = parentElement.children.length - 1; i >= 0; i--) {
            parentElement.children[i].detach();
        }
        parentElement.appendChild(multiColumnParent);

        this.appendElementsToColumns(regionElements, this.columnDivs, settings, isLivePreview);
    }

    private appendElementsToColumns(regionElements: DOMObject[], columnContentDivs: HTMLDivElement[], settings: MultiColumnSettings, isLivePreview: boolean = false) {

        function balanceElements() {

            let totalHeight = regionElements.map((el: DOMObject, index: number) => { 

                // We only want to attempt to update the elementRenderedHeight if it is 0 and if it is not an unrendered element such as a endregion tag.
                if(el.elementRenderedHeight === 0 &&
                    el.tag !== DOMObjectTag.columnBreak &&
                    el.tag !== DOMObjectTag.endRegion &&
                    el.tag !== DOMObjectTag.regionSettings &&
                    el.tag !== DOMObjectTag.startRegion) {
    
                    // Add element to rendered div so we can extract the rendered height.
                    columnContentDivs[0].appendChild(el.originalElement)
                    el.elementRenderedHeight = el.originalElement.clientHeight
                    columnContentDivs[0].removeChild(el.originalElement)
                }
    
                return el.elementRenderedHeight 
            }).reduce((prev: number, curr: number) => { return prev + curr }, 0);
            let maxColumnContentHeight = Math.trunc(totalHeight / settings.numberOfColumns);

            for(let i = 0; i < columnContentDivs.length; i++) {
                for (let j = columnContentDivs[i].children.length - 1; j >= 0; j--) {
                    columnContentDivs[i].children[j].detach();
                }
            }

            let columnIndex = 0;
            let currentColumnHeight = 0;
            function checkShouldSwitchColumns(nextElementHeight: number) {
    
                if (currentColumnHeight + nextElementHeight > maxColumnContentHeight &&
                    (columnIndex + 1) < settings.numberOfColumns) {
    
                    columnIndex++;
                    currentColumnHeight = 0;
                }
            }

            for (let i = 0; i < regionElements.length; i++) {

                if (regionElements[i].tag === DOMObjectTag.none ||
                    regionElements[i].tag === DOMObjectTag.columnBreak) {
    
                    /**
                     * Here we check if we need to swap to the next column for the current element.
                     * If the user wants to keep headings with the content below it we also make sure
                     * that the last item in a column is not a header element by using the header and
                     * the next element's height as the height value. 
                     */
                    if(hasHeader(regionElements[i].originalElement) === true) { // TODO: Add this as selectable option.
    
                        let headerAndNextElementHeight = regionElements[i].elementRenderedHeight;
                        if(i < regionElements.length - 1) {
    
                            headerAndNextElementHeight += regionElements[i + 1].elementRenderedHeight;
                        }
    
                        checkShouldSwitchColumns(headerAndNextElementHeight);
                    }
                    else {
    
                        checkShouldSwitchColumns(regionElements[i].elementRenderedHeight);
                    }
                    currentColumnHeight += regionElements[i].elementRenderedHeight
    
    
                    /**
                     * We store the elements in a wrapper container until we determine if we want to 
                     * use the original element or a clone of the element. This helps us by allowing 
                     * us to create a visual only clone while the update loop moves the original element 
                     * into the columns.
                     */
                    let element = createDiv({
                        cls: MultiColumnLayoutCSS.ColumnDualElementContainer,
                    });
                    regionElements[i].elementContainer = element;
    
                    if(columnOverflowState(columnIndex, settings) === ContentOverflowType.hidden) {
                        element.addClass(MultiColumnLayoutCSS.ContentOverflowHidden_X)
                    }
                    else {
                        element.addClass(MultiColumnLayoutCSS.ContentOverflowAutoScroll_X)
                    }
                    
                    let alignment = columnAlignmentState(columnIndex, settings);
                    if(alignment === AlignmentType.center) {
                        element.addClass(MultiColumnLayoutCSS.AlignmentCenter)
                    }
                    else if (alignment === AlignmentType.right) {
                        element.addClass(MultiColumnLayoutCSS.AlignmentRight)
                    }
                    else {
                        element.addClass(MultiColumnLayoutCSS.AlignmentLeft)
                    }

                    let tableAlignment = MCM_SettingsManager.shared.alignTablesToContentAlignment;
                    if(settings.alignTablesToAlignment !== TableAlignment.useSettingsDefault) {
                        tableAlignment = settings.alignTablesToAlignment === TableAlignment.align
                    }
                    if(tableAlignment) {
                        element.addClass(MultiColumnLayoutCSS.TableAlignment)
                    }

                    let elementToAppend: HTMLElement = regionElements[i].originalElement;
                    if(isLivePreview === false) {
                        let clonedElement = regionElements[i].clonedElement;
                        if(regionElements[i].clonedElement === null) {

                            clonedElement = regionElements[i].originalElement.cloneNode(true) as HTMLDivElement;
                            let headingCollapseElement = getHeadingCollapseElement(clonedElement);
                            if(headingCollapseElement !== null) {
                                // This removes the collapse arrow from the view if it exists.
                                headingCollapseElement.detach();
                            }
            
                            regionElements[i].clonedElement = clonedElement;
                            elementToAppend = clonedElement;
                        }
                    }
                    element.appendChild(elementToAppend);
    
                    if (regionElements[i] instanceof TaskListDOMObject) {
    
                        this.fixClonedCheckListButtons(regionElements[i] as TaskListDOMObject, true);
                    }
    
                    if (element !== null && 
                        columnContentDivs[columnIndex] && 
                        regionElements[i].tag !== DOMObjectTag.columnBreak) {
    
                        columnContentDivs[columnIndex].appendChild(element);
                        regionElements[i].elementRenderedHeight = element.clientHeight;
                    }
    
                    /**
                     * If the tag is a column break we update the column index after
                     * appending the item to the column div. This keeps the main DOM
                     * cleaner by removing other items and placing them all within
                     * a region container.
                     * 
                     * Removing the end column tag as an option for now.
                     */
                    // if (regionElements[i].tag === DOMObjectTag.columnBreak &&
                    //    (columnIndex + 1) < settings.numberOfColumns) {
    
                    //     columnIndex++;
                    //     currentColumnHeight = 0;
                    // }
                }
            }
        }

        /**
         * Attempt to balanced the elements. We need to iterate over the elements multiple times because
         * our initial balance estimate may not be perfectly balanced due to different column widths causing 
         * elements within them to be of different heights. This can cause the elements to jump around on 
         * subsiquent update loops which is not ideal. Here we render the elements to the screen and update 
         * their height after being rendered into the estimated position. 
         * 
         * Once everything is rendered we check all of the column heights against our last iteration and 
         * if nothing has changed we know we are balanced.
         * 
         * There is probably a better way of accomplishing this task but this works for the time being.
         */

        let autoLayoutBalanceIterations = 1;
        if(this.isLivePreview === false) {
            autoLayoutBalanceIterations = MCM_SettingsManager.shared.autoLayoutBalanceIterations
        }
        for(let i = 0; i < autoLayoutBalanceIterations; i++) {
            
            balanceElements()

            let balanced = true;
            for(let j = 0; j < columnContentDivs.length; j++) {

                // If the column heights are undefined we set default to zero so not to encounter an error.
                if(!this.previousColumnHeights[j]) {
                    this.previousColumnHeights.push(0)
                }

                // if this render height is not the same as the previous height we are still balancing.
                if(this.previousColumnHeights[j] !== columnContentDivs[j].clientHeight) {
                    this.previousColumnHeights[j] = columnContentDivs[j].clientHeight
                    balanced = false
                }
            }

            // if we made it out of the loop and all of the columns are the same height as last update
            // we're balanced so we can break out of the loop.
            if(balanced === true) {
                break;
            }
        }
    }

    public updateRenderedMarkdown() {

        if(this.docReflow === true) {
            super.updateRenderedMarkdown();
            return;
        }

        for (let i = 0; i < this.domList.length; i++) {

            let el = this.domList[i]
            let originalClientHeight = 0;
            if (el.originalElement) {
                originalClientHeight = el.originalElement.clientHeight
            }
            let clonedClientHeight = 0;
            if (el.clonedElement) {
                clonedClientHeight = el.clonedElement.clientHeight
            }

            if (originalClientHeight < clonedClientHeight) {
                this.domList[i].elementRenderedHeight = clonedClientHeight;
            }
            else {
                this.domList[i].elementRenderedHeight = originalClientHeight;
            }
        }

        let validColumns = true;
        if(this.columnParent !== null && this.columnDivs !== null && this.columnDivs !== undefined &&
            this.columnDivs.length === this.regionalSettings.numberOfColumns) {

            let totalHeight = this.domList.map((el: DOMObject, index: number) => { 

                // We only want to attempt to update the elementRenderedHeight if it is 0 and if it is not an unrendered element such as a endregion tag.
                if(el.elementRenderedHeight === 0 &&
                    el.tag !== DOMObjectTag.columnBreak &&
                    el.tag !== DOMObjectTag.endRegion &&
                    el.tag !== DOMObjectTag.regionSettings &&
                    el.tag !== DOMObjectTag.startRegion) {
    
                    // Add element to rendered div so we can extract the rendered height.
                    this.columnParent.appendChild(el.originalElement)
                    el.elementRenderedHeight = el.originalElement.clientHeight
                    this.columnParent.removeChild(el.originalElement)
                }
    
                return el.elementRenderedHeight 
            }).reduce((prev: number, curr: number) => { return prev + curr }, 0);
            let maxColumnContentHeight = Math.trunc(totalHeight / this.regionalSettings.numberOfColumns);

            for(let i = 0; i < this.columnDivs.length - 1; i++) {

                let columnHeight = 0
                for(let j = 0; j < this.columnDivs[i].children.length; j++) {
                    columnHeight += this.columnDivs[i].children[j].clientHeight
                }

                if(columnHeight > maxColumnContentHeight) {
                    validColumns = false;
                    break;
                }
            }
        }

        if(validColumns === false) {

            this.renderColumnMarkdown(this.regionParent, this.domList, this.regionalSettings);
        }

        super.updateRenderedMarkdown();
    }
}

