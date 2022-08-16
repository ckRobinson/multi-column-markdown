/*
 * Filename: /Users/cameron/Library/Mobile Documents/iCloud~md~obsidian/Documents/LegendKeeper/.obsidian/plugins/multi-column-markdown/src/cm6_livePreview.ts
 * Path: /Users/cameron/Library/Mobile Documents/iCloud~md~obsidian/Documents/LegendKeeper/.obsidian/plugins/multi-column-markdown
 * Created Date: Monday, August 1st 2022, 1:51:16 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { MarkdownRenderChild, MarkdownRenderer } from "obsidian";
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

export function getCMStatePlugin() {
    return multiColumnMarkdown_StateField
}

export const multiColumnMarkdown_StateField = StateField.define<DecorationSet>({
	create(state): DecorationSet {
		return Decoration.none;
	},
	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

		syntaxTree(transaction.state).iterate({
			enter(node) {

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
				let docText = transaction.state.doc.sliceString(node.from, node.to);
				if (containsStartTag(docText) === false) {
					console.debug("No Start Tag")
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
				while (startTagData.found === true && endTagData.found === true && loopIndex < 100) { // TODO: Remove loop index when infinite loop fixed?


					/**
					 * For the region we found get the start and end position of the tags so we 
					 * can slice it out of the document.
					 */
					let index = startIndexOffset + startTagData.startPosition
					let endIndex = startIndexOffset + endTagData.startPosition + 20 // Without the +20 will leave the end tag on the screen. // TODO: Calculate the lenght of the tag found instead of hardcoded.

					// This text is the entire region data including the start and end tags.
					let elementText = docText.slice(index, endIndex)

					/**
					 * Update our start offset and the working text of the file so our next 
					 * iteration knows where we left off
					 */
					startIndexOffset = endIndex
					workingFileText = docText.slice(endIndex);


					// Here we check if the cursor is in this specific region.
					let cursorInRegion = false;
					for (let i = 0; i < ranges.length; i++) {

						let range = ranges[i];
						if (range.position >= index && range.position <= endIndex) {

							cursorInRegion = true;
							break;
						}
					}

                    if(transaction.selection){
                        for (let i = 0; i < transaction.selection.ranges.length; i++) {

                            let range = transaction.selection.ranges[i];
                            if (range.from >= index && range.from <= endIndex || 
                                range.to >= index && range.to <= endIndex) {
    
                                cursorInRegion = true;
                                break;
                            }
                        }
                    }

					// At this point if the cursor isnt in the region we pass the data to the
					// element to be rendered.
					if(cursorInRegion === false) {
						builder.add(
							index,
							endIndex,
							Decoration.replace({
								widget: new MultiColumnMarkdown_Widget(elementText),
							})
						);
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

        if(this.regionSettings.autoLayout === true) {
            // this.regionManager = new StandardMultiColumnRegionManager(a)
        }
        else if(this.regionSettings.numberOfColumns === 1) {
			
			this.regionSettings = parseSingleColumnSettings(this.settingsText, this.regionSettings)
            this.regionManager = new SingleColumnRegionManager(regionData)
        }
        else {
            this.regionManager = new StandardMultiColumnRegionManager(regionData)
        }
	}

	toDOM() {
		let el = document.createElement("div");
		el.className = "mcm-cm-preview";
		// let multiColumnParent = el.createDiv()

        if(this.regionManager) {
            this.regionManager.renderRegionElementsToLivePreview(el);
        }
		return el
	}
}