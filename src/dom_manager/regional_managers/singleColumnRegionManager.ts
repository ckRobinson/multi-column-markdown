/**
 * File: /src/dom_manager/regional_managers/singleColumnRegionManager.ts       *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2023 Cameron Robinson                                         *
 */

import { DOMObject, DOMObjectTag, TaskListDOMObject } from '../domObject';
import { MultiColumnSettings, ColumnLayout, ContentOverflowType, AlignmentType, columnOverflowState, columnAlignmentState, shouldDrawColumnBorder, TableAlignment } from "../../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../../utilities/cssDefinitions';
import { MarkdownRenderChild } from 'obsidian';
import { RegionManager } from './regionManager';
import { getHeadingCollapseElement } from 'src/utilities/elementRenderTypeParser';
import { MCM_SettingsManager } from 'src/pluginSettings';

export class SingleColumnRegionManager extends RegionManager {


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
    protected renderColumnMarkdown(parentElement: HTMLElement, regionElements: DOMObject[], settings: MultiColumnSettings, isLivePreview: boolean = false) {

        let multiColumnParent = createDiv({
            cls: `${MultiColumnLayoutCSS.RegionColumnContainerDiv} \
                  ${MultiColumnLayoutCSS.ContentOverflowAutoScroll_X} \
                  ${MultiColumnLayoutCSS.ContentOverflowHidden_Y};
                  `
        });

        if(isLeftLayout(this.regionalSettings.columnPosition)){
            multiColumnParent.addClass(MultiColumnLayoutCSS.SingleColumnLeftLayout)
        }
        else if(isRightLayout(this.regionalSettings.columnPosition)) {
            multiColumnParent.addClass(MultiColumnLayoutCSS.SingleColumnRightLayout)
        }
        else {
            multiColumnParent.addClass(MultiColumnLayoutCSS.SingleColumnCenterLayout)
        }

        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */
        let columnContentDiv = this.createColumnContentDivs(multiColumnParent);
        if(shouldDrawColumnBorder(0, settings) === true) {
            columnContentDiv.addClass(MultiColumnStyleCSS.ColumnBorder);
        }
        if (settings.drawShadow === true) {
            columnContentDiv.addClass(MultiColumnStyleCSS.ColumnShadow);
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

        this.appendElementsToColumns(regionElements, columnContentDiv, settings, isLivePreview);
    }

    protected appendElementsToColumns(regionElements: DOMObject[], columnContentDiv: HTMLDivElement, settings: MultiColumnSettings, isLivePreview: boolean = false) {


        for (let i = 0; i < regionElements.length; i++) {

            if (regionElements[i].tag === DOMObjectTag.none ||
                regionElements[i].tag === DOMObjectTag.columnBreak) {

                // We store the elements in a wrapper container until we determine
                let element = createDiv({
                    cls: MultiColumnLayoutCSS.ColumnDualElementContainer,
                });
                regionElements[i].elementContainer = element;

                if(columnOverflowState(0, settings) === ContentOverflowType.hidden) {
                    element.addClass(MultiColumnLayoutCSS.ContentOverflowHidden_X)
                }
                else {
                    element.addClass(MultiColumnLayoutCSS.ContentOverflowAutoScroll_X)
                }
                
                let alignment = columnAlignmentState(0, settings);
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
                    let clonedElement = regionElements[i].originalElement.cloneNode(true) as HTMLDivElement;
                    let headingCollapseElement = getHeadingCollapseElement(clonedElement);
                    if(headingCollapseElement !== null) {
                        // This removes the collapse arrow from the view if it exists.
                        headingCollapseElement.detach();
                    }
                    regionElements[i].clonedElement = clonedElement;
                    elementToAppend = clonedElement
                }
                element.appendChild(elementToAppend);

                if (regionElements[i] instanceof TaskListDOMObject) {

                    this.fixClonedCheckListButtons(regionElements[i] as TaskListDOMObject, true);
                }

                if (element !== null) {

                    columnContentDiv.appendChild(element);
                }
            }
        }
    }

    createColumnContentDivs(multiColumnParent: HTMLDivElement): HTMLDivElement {

        let contentDiv = multiColumnParent.createDiv({
            cls: `${MultiColumnStyleCSS.ColumnContent}`
        });

        if(this.regionalSettings.columnSize === "small") {
            contentDiv.addClass(`${MultiColumnLayoutCSS.SingleColumnSmall}`)
        }
        else if(this.regionalSettings.columnSize === "large") {
            contentDiv.addClass(`${MultiColumnLayoutCSS.SingleColumnLarge}`)
        }
        else if(this.regionalSettings.columnSize === "full") {
            contentDiv.addClass(`${MultiColumnLayoutCSS.SingleColumnFull}`)
        }
        else {
            contentDiv.addClass(`${MultiColumnLayoutCSS.SingleColumnMed}`)
        }

        return contentDiv;
    }
}

function isCentered(layout: ColumnLayout): boolean {

    if(layout === "standard" ||
       layout === "middle"   ||
       layout === "center"   ||
       layout === "second"    ) {

        return true;
    }

    return false
}

function isLeftLayout(layout: ColumnLayout): boolean {

    if(layout === "left" ||
       layout === "first" ) {
 
         return true;
     }
 
     return false
}

function isRightLayout(layout: ColumnLayout): boolean {

    if(layout === "right" ||
       layout === "third" ||
       layout === "last" ) {
 
         return true;
     }
 
     return false
}