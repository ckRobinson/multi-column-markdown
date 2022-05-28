/**
 * File: /src/dom_manager/regional_managers/autoLayoutRegionManager.ts         *
 * Created Date: Sunday, May 22nd 2022, 10:23 pm                               *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2022 Cameron Robinson                                         *
 */

import { DOMObject, DOMObjectTag, TaskListDOMObject } from '../domObject';
import { MultiColumnSettings, ColumnLayout } from "../../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../../utilities/cssDefinitions';
import { MarkdownRenderChild } from 'obsidian';
import { RegionManager } from './regionManager';
import { hasHeader } from 'src/utilities/elementRenderTypeParser';

export class AutoLayoutRegionManager extends RegionManager {


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
    private renderColumnMarkdown(parentElement: HTMLElement, regionElements: DOMObject[], settings: MultiColumnSettings) {

        let multiColumnParent = createDiv({
            cls: MultiColumnLayoutCSS.RegionColumnContainerDiv,
        });

        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */
        let columnContentDivs = this.getColumnContentDivs(settings, multiColumnParent);
        if (settings.drawShadow === true) {
            multiColumnParent.addClass(MultiColumnStyleCSS.RegionShadow);
        }
        for (let i = 0; i < columnContentDivs.length; i++) {
            if (settings.drawBorder === true) {
                columnContentDivs[i].addClass(MultiColumnStyleCSS.ColumnBorder);
            }

            if (settings.drawShadow === true) {
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
        for (let i = parentElement.children.length - 1; i >= 0; i--) {
            parentElement.children[i].detach();
        }
        parentElement.appendChild(markdownRenderChild.containerEl);

        this.appendElementsToColumns(regionElements, columnContentDivs, settings);
    }

    private appendElementsToColumns(regionElements: DOMObject[], columnContentDivs: HTMLDivElement[], settings: MultiColumnSettings) {

        let columnIndex = 0;
        let currentColumnHeight = 0;

        let totalHeight = this.domList.map((el: DOMObject, index: number) => { 

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
        }).reduce((prev, curr) => { return prev + curr }, 0);
        let maxColumnContentHeight = Math.trunc(totalHeight / settings.numberOfColumns);

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

                let clonedElement = regionElements[i].originalElement.cloneNode(true) as HTMLDivElement;

                regionElements[i].clonedElement = clonedElement;
                element.appendChild(clonedElement);

                if (regionElements[i] instanceof TaskListDOMObject) {

                    this.fixClonedCheckListButtons(regionElements[i] as TaskListDOMObject, true);
                }

                if (element !== null && columnContentDivs[columnIndex]) {

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
                    currentColumnHeight = 0;
                }
            }
        }
    }

    public updateRenderedMarkdown() {

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

        this.renderColumnMarkdown(this.regionParent, this.domList, this.regionalSettings);
        super.updateRenderedMarkdown();
    }
}

