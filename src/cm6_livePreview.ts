/*
 * Filename: /Users/cameron/Library/Mobile Documents/iCloud~md~obsidian/Documents/LegendKeeper/.obsidian/plugins/multi-column-markdown/src/cm6_livePreview.ts
 * Path: /Users/cameron/Library/Mobile Documents/iCloud~md~obsidian/Documents/LegendKeeper/.obsidian/plugins/multi-column-markdown
 * Created Date: Monday, August 1st 2022, 1:51:16 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { MarkdownRenderChild, MarkdownRenderer, Workspace, WorkspaceLeaf } from "obsidian";
import { Extension, Line, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { ColumnLayout, getDefaultMultiColumnSettings, MultiColumnSettings, SingleColumnSize } from "./regionSettings";
import { containsColSettingsTag, containsStartTag, findColSettingsTag, findEndOfCodeBlock, findEndTag, findStartTag } from "./utilities/textParser";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from "./utilities/cssDefinitions";
import { parseColumnSettings, parseSingleColumnSettings } from "./utilities/settingsParser";
import { StandardMultiColumnRegionManager } from "./dom_manager/regional_managers/standardMultiColumnRegionManager";
import { RegionManagerData } from "./dom_manager/regional_managers/regionManagerContainer";
import { getUID } from "./utilities/utils";
import { DOMObject, DOMObjectTag } from "./dom_manager/domObject";
import { RegionManager } from "./dom_manager/regional_managers/regionManager";
import { getHeadingCollapseElement } from "./utilities/elementRenderTypeParser";
import { SingleColumnRegionManager } from "./dom_manager/regional_managers/singleColumnRegionManager";
import { AutoLayoutRegionManager } from "./dom_manager/regional_managers/autoLayoutRegionManager";

export function getCMStatePlugin() {
    return multiColumnMarkdown_StateField
}

export const multiColumnMarkdown_StateField = StateField.define<DecorationSet>({
	create(state): DecorationSet {
		return Decoration.none;
	},
	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
        let generated = false;

		syntaxTree(transaction.state).iterate({
			enter(node) {

                // We only want to run the generation once per state change. If
                // a previous node has sucessfully generated regions we ignore all
                // other nodes in the state.
                if(generated === true) {
                    return;
                }

                let markdownLeaves = app.workspace.getLeavesOfType("markdown");
                if(markdownLeaves.length === 0) {
                    return;
                }

                if(markdownLeaves[0].getViewState().state.source === true) {
                    console.debug("User disabled live preview.")
                    return;
                }

				// We want to run on the whole file so we dont just look for a single token.
				const tokenProps = node.type.prop<string>(tokenClassNodeProp);
				if (tokenProps !== undefined) {
					return;
				}

				/**
				 * When we have the while file we then get the entire doc text and check if it 
				 * contains a MCM region so we know to break or not.
				 */
                let docLength = transaction.state.doc.length
                let docText = transaction.state.doc.sliceString(0, docLength);
				if (containsStartTag(docText) === false) {
					console.debug("No start tag in document.")
					return;
				}

				// We want to know where the user's cursor is, it can be
				// selecting multiple regions of text as well so we need to know
				// all locations. Used to know if we should render region as text or as preview.
				let ranges = getCursorLineLocations();

				// Setup our loop to render the regions as MCM. 
				let workingFileText = docText;
				let startTagData = findStartTag(workingFileText);
				let endTagData = findEndTag(workingFileText);
				let loopIndex = 0;
				let startIndexOffset = 0;
				while (startTagData.found === true && endTagData.found === true && loopIndex < 100) {


					/**
					 * For the region we found get the start and end position of the tags so we 
					 * can slice it out of the document.
					 */
					let startIndex = startIndexOffset + startTagData.startPosition
					let endIndex = startIndexOffset + endTagData.startPosition + endTagData.matchLength // Without the matchLength will leave the end tag on the screen.

					// This text is the entire region data including the start and end tags.
					let elementText = docText.slice(startIndex, endIndex)

					/**
					 * Update our start offset and the working text of the file so our next 
					 * iteration knows where we left off
					 */
					startIndexOffset = endIndex
					workingFileText = docText.slice(endIndex);


					// Here we check if the cursor is in this specific region.
					let cursorInRegion = false;
					for (let i = 0; i < ranges.length; i++) {

                        // TODO: Maybe look into limiting this to the second and second to last line
                        // of the region as clicking right at the top or bottom of the region
                        // swaps it to unrendered.
						let range = ranges[i];
                        if(valueIsInRange(range.position, startIndex, endIndex) === true) {
							cursorInRegion = true;
							break;
                        }
					}

                    if(cursorInRegion === false && transaction.selection){
                        for (let i = 0; i < transaction.selection.ranges.length; i++) {

                            let range = transaction.selection.ranges[i];

                            // If either the start or end of the selection is within the
                            // region range we do not render live preview.
                            if(valueIsInRange(range.from, startIndex, endIndex) || 
                               valueIsInRange(range.to, startIndex, endIndex)) {
                                cursorInRegion = true;
                                break;
                            }

                            // Or if the entire region is within the selection range
                            // we do not render the live preview.
                            if(valueIsInRange(startIndex, range.from, range.to) && 
                               valueIsInRange(endIndex, range.from, range.to)) {
                                cursorInRegion = true;
                                break;
                            }
                        }
                    }

					// At this point if the cursor isnt in the region we pass the data to the
					// element to be rendered.
					if(cursorInRegion === false) {
						builder.add(
							startIndex,
							endIndex,
							Decoration.replace({
								widget: new MultiColumnMarkdown_Widget(elementText),
							})
						);
                        generated = true;
					}

					// ReCalculate additional start tags if there are more in document.
					startTagData = findStartTag(workingFileText);
					endTagData = findEndTag(workingFileText);
					loopIndex++;
				}
				if(loopIndex > 75) {
					console.warn("Potential issue with rendering Multi-Column Markdown live preview regions. If problem persists please file a bug report with developer.")
				}
			},
		});
 
		return builder.finish();

		function getCursorLineLocations(): { line: Line, position: number }[] {

			let ranges: { line: Line, position: number }[] = [];

			if (transaction.state.selection.ranges) {

				ranges = transaction.state.selection.ranges.filter((range) => {

					return range.empty;
				}).map((range) => {

					let line = transaction.state.doc.lineAt(range.head);
					let text = `${line.number}:${range.head - line.from}`;

					return {
						line: line,
						position: range.head
					}
				});
			}

			return ranges;
		}

        function valueIsInRange(value: number, minVal: number, maxVal: number, inclusive: boolean = true) {

            if(inclusive === true && (value === minVal || value === maxVal)) {
                return true;
            }

            if (minVal < value && value < maxVal) {

                return true;
            }

            return false;
        }
	},
	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	},
});

export class MultiColumnMarkdown_Widget extends WidgetType {

	contentData: string;
    tempParent: HTMLDivElement;
    domList: DOMObject[] = []
	settingsText: string
    regionSettings: MultiColumnSettings = getDefaultMultiColumnSettings();
	regionManager: RegionManager
	constructor(contentData: string) {
		super()
		this.contentData = contentData;

        let settingsStartData = findColSettingsTag(this.contentData);
        if(settingsStartData.found === true) {

            let startofBlock = settingsStartData.startPosition;
            let endOfStart = settingsStartData.endPosition;
            
            let endOfBlock = findEndOfCodeBlock(this.contentData.slice(endOfStart));
            let endOfEnd = endOfBlock.endPosition;

            this.settingsText = this.contentData.slice(startofBlock, endOfStart + endOfEnd)
            this.contentData = this.contentData.replace(this.settingsText, "")

            this.regionSettings = parseColumnSettings(this.settingsText)
        }

        this.tempParent = createDiv();

        let elementMarkdownRenderer = new MarkdownRenderChild(this.tempParent);

        MarkdownRenderer.renderMarkdown(this.contentData, this.tempParent, "", elementMarkdownRenderer)
        let arr = Array.from(this.tempParent.children)
        for(let i = 0; i < arr.length; i++) {
            
            this.domList.push(new DOMObject(arr[i] as HTMLElement, [""]))
        }
        

        let regionData: RegionManagerData = {
            domList: this.domList,
            domObjectMap: new Map<string, DOMObject>(),
            regionParent: createDiv(),
            fileManager: null,
            regionalSettings: this.regionSettings,
            regionKey: getUID(),
            rootElement: createDiv()
        }

        if(this.regionSettings.numberOfColumns === 1) {
			
			this.regionSettings = parseSingleColumnSettings(this.settingsText, this.regionSettings)
            this.regionManager = new SingleColumnRegionManager(regionData)
        }
        else if(this.regionSettings.autoLayout === true) {


            this.regionManager = new AutoLayoutRegionManager(regionData)
        }
        else {
            this.regionManager = new StandardMultiColumnRegionManager(regionData)
        }
	}

	toDOM() {
		let el = document.createElement("div");
		el.className = "mcm-cm-preview";
		// let multiColumnParent = el.createDiv()

        // For situations where we need to know the rendered hight the element
        // must be rendered onto the screen to get the info, even if only for a moment.
        // Here we attempt to get a leaf from the app so we can briefly append
        // our element, check any data if required, and the remove before returning
        // the element to be rendered properly in the live preview.
        let leaf: WorkspaceLeaf = null;
        if(app) {
            let leaves = app.workspace.getLeavesOfType("markdown");
            if(leaves.length > 0) {
                leaf = leaves[0];
            }
        }

        if(this.regionManager) {

            if(leaf) {
                leaf.view.containerEl.appendChild(el);
            }
            
            this.regionManager.renderRegionElementsToLivePreview(el);

            if(leaf) {
                leaf.view.containerEl.removeChild(el);
            }
        }


		return el
	}
}