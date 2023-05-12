
import { DOMObject, DOMObjectTag, TaskListDOMObject } from '../domObject';
import { AlignmentType, ContentOverflowType, MultiColumnSettings, columnAlignmentState, columnOverflowState, shouldDrawColumnBorder } from "../../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../../utilities/cssDefinitions';
import { RegionManager } from './regionManager';
import { getHeadingCollapseElement, hasHeader } from 'src/utilities/elementRenderTypeParser';
import { RegionManagerData } from './regionManagerContainer';

export class ReflowRegionManager extends RegionManager {

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

        this.renderColumnMarkdown(parentElement, this.domList, this.regionalSettings);
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

        let verticalColumnParent = createDiv({
            cls: `${MultiColumnLayoutCSS.ReflowContainerDiv}`
        });

        /**
         * Pass our parent div and settings to parser to create the required
         * column divs as children of the parent.
         */

        // Remove every other child from the parent so 
        // we dont end up with multiple sets of data. This should
        // really only need to loop once for i = 0 but loop just
        // in case.
        for (let i = parentElement.children.length - 1; i >= 0; i--) {
            parentElement.children[i].detach();
        }
        parentElement.appendChild(verticalColumnParent);

        this.appendElementsToColumns(verticalColumnParent, regionElements, settings);
    }

    private appendElementsToColumns(verticalColumnParent: HTMLDivElement, regionElements: DOMObject[], settings: MultiColumnSettings) {

        console.group("Appending");

        this.domList.forEach((el: DOMObject, index: number) => { 

            // We only want to attempt to update the elementRenderedHeight if it is 0 and if it is not an unrendered element such as a endregion tag.
            if(el.elementRenderedHeight === 0 &&
                el.tag !== DOMObjectTag.columnBreak &&
                el.tag !== DOMObjectTag.endRegion &&
                el.tag !== DOMObjectTag.regionSettings &&
                el.tag !== DOMObjectTag.startRegion) {

                // Add element to rendered div so we can extract the rendered height.
                verticalColumnParent.appendChild(el.originalElement)
                el.elementRenderedHeight = el.originalElement.clientHeight
                verticalColumnParent.removeChild(el.originalElement)
            }
        })

        let maxColumnContentHeight = settings.columnHeight.sizeValue

        let columnIndex = 0;
        let currentColumnHeight = 0;
        let columns = this.getFormattedColumnDivs(settings, verticalColumnParent);

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

                let clonedElement = regionElements[i].clonedElement;
                if(regionElements[i].clonedElement === null) {

                    clonedElement = regionElements[i].originalElement.cloneNode(true) as HTMLDivElement;
                    let headingCollapseElement = getHeadingCollapseElement(clonedElement);
                    if(headingCollapseElement !== null) {
                        // This removes the collapse arrow from the view if it exists.
                        headingCollapseElement.detach();
                    }
    
                    regionElements[i].clonedElement = clonedElement;
                }
                element.appendChild(clonedElement);

                if (regionElements[i] instanceof TaskListDOMObject) {

                    this.fixClonedCheckListButtons(regionElements[i] as TaskListDOMObject, true);
                }

                if (element !== null && 
                    columns[columnIndex] && 
                    regionElements[i].tag !== DOMObjectTag.columnBreak) {

                    columns[columnIndex].appendChild(element);
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
}

function getFormattedColumnDivs(settings: MultiColumnSettings, verticalColumnParent: HTMLDivElement, getColumnContentDivs: (settings: MultiColumnSettings, multiColumnParent: HTMLDivElement) => HTMLDivElement[]) {
        
    let multiColumnParent = verticalColumnParent.createDiv({
        cls: `${MultiColumnLayoutCSS.RegionColumnContainerDiv} \
              ${MultiColumnLayoutCSS.ContentOverflowAutoScroll_X} \
              ${MultiColumnLayoutCSS.ContentOverflowHidden_Y};
              `
    });

    let columnDivs = getColumnContentDivs(settings, multiColumnParent);
    if (settings.drawShadow === true) {
        multiColumnParent.addClass(MultiColumnStyleCSS.RegionShadow);
    }
    for (let i = 0; i < columnDivs.length; i++) {
        if (shouldDrawColumnBorder(i, settings) === true) {
            columnDivs[i].addClass(MultiColumnStyleCSS.ColumnBorder);
        }

        if (settings.drawShadow === true) {
            columnDivs[i].addClass(MultiColumnStyleCSS.ColumnShadow);
        }
    }

    return columnDivs
}