import { DOMObject, DOMObjectTag, TaskListDOMObject } from '../domObject';
import { MultiColumnSettings, ColumnLayout, SingleColumnSize } from "../../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../../utilities/cssDefinitions';
import { MarkdownRenderChild } from 'obsidian';
import { RegionManager } from './regionManager';


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

    /**
     * This function takes in the data for the multi-column region and sets up the
     * user defined number of children with the proper css classes to be rendered properly.
     *
     * @param parentElement The element that the multi-column region will be rendered under.
     * @param regionElements The list of DOM objects that will be coppied under the parent object
     * @param settings The settings the user has defined for the region.
     */
    protected renderColumnMarkdown(parentElement: HTMLElement, regionElements: DOMObject[], settings: MultiColumnSettings) {

        let multiColumnParent = createDiv({
            cls: MultiColumnLayoutCSS.RegionColumnContainerDiv,
        });

        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */
        let columnContentDiv = this.createColumnContentDivs(multiColumnParent);
        if (settings.drawBorder === true) {
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

        this.appendElementsToColumns(regionElements, columnContentDiv, settings);
    }

    protected appendElementsToColumns(regionElements: DOMObject[], columnContentDiv: HTMLDivElement, settings: MultiColumnSettings) {


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

                    columnContentDiv.appendChild(element);
                }
            }
        }
    }

    createColumnContentDivs(multiColumnParent: HTMLDivElement): HTMLDivElement {

        let contentDiv = null;

        if(isLeftLayout(this.regionalSettings.columnPosition)){
            if(this.regionalSettings.columnSize === SingleColumnSize.small) {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnSmallLeft}`
                });
            }
            else if(this.regionalSettings.columnSize === SingleColumnSize.large) {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnLargeLeft}`
                });
            }
            else {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnMedLeft}`
                });
            }
        }
        else if(isRightLayout(this.regionalSettings.columnPosition)) {
            if(this.regionalSettings.columnSize === SingleColumnSize.small) {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnSmallRight}`
                });
            }
            else if(this.regionalSettings.columnSize === SingleColumnSize.large) {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnLargeRight}`
                });
            }
            else {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnMedRight}`
                });
            }
        }
        else { // Default to center
            if(this.regionalSettings.columnSize === SingleColumnSize.small) {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnSmallCenter}`
                });
            }
            else if(this.regionalSettings.columnSize === SingleColumnSize.large) {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnLargeCenter}`
                });
            }
            else {
                contentDiv = multiColumnParent.createDiv({
                    cls: `${MultiColumnStyleCSS.ColumnContent} ${MultiColumnLayoutCSS.SingleColumnMedCenter}`
                });
            }
        }

        return contentDiv;
    }
}

function isCentered(layout: ColumnLayout): boolean {

    if(layout === ColumnLayout.standard ||
       layout === ColumnLayout.middle   ||
       layout === ColumnLayout.center   ||
       layout === ColumnLayout.second    ) {

        return true;
    }

    return false
}

function isLeftLayout(layout: ColumnLayout): boolean {

    if(layout === ColumnLayout.left ||
       layout === ColumnLayout.first ) {
 
         return true;
     }
 
     return false
}

function isRightLayout(layout: ColumnLayout): boolean {

    if(layout === ColumnLayout.right ||
       layout === ColumnLayout.third ||
       layout === ColumnLayout.last ) {
 
         return true;
     }
 
     return false
}