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
import { MultiColumnStyleCSS } from "./utilities/cssDefinitions";
import { parseColumnSettings } from "./utilities/settingsParser";

export function getCMStatePlugin() {
    return multiColumnMarkdown_StateField
}

export const multiColumnMarkdown_StateField = StateField.define<DecorationSet>({
	create(state): DecorationSet {
		return Decoration.none;
	},
	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

        console.log("Updating CM6")

		syntaxTree(transaction.state).iterate({
			enter(node) {

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
				console.log("Props undefined and contains Start Tag: ", docText)

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
					console.debug(elementText)

					/**
					 * Update our start offset and the working text of the file so our next 
					 * iteration knows where we left off
					 */
					startIndexOffset = endIndex
					workingFileText = docText.slice(endIndex);

					console.debug("Remaining Text:\n", docText)

					// Here we check if the cursor is in this specific region.
					let cursorInRegion = false;
					for (let i = 0; i < ranges.length; i++) {

						let range = ranges[i];
						if (range.position >= index && range.position <= endIndex) {

							cursorInRegion = true;
							break;
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
    renderedElements: Element[];
    regionSettings: MultiColumnSettings = getDefaultMultiColumnSettings();
	constructor(contentData: string) {
		super()
		this.contentData = contentData;
        this.tempParent = createDiv();

        let elementMarkdownRenderer = new MarkdownRenderChild(this.tempParent);
        MarkdownRenderer.renderMarkdown(this.contentData, this.tempParent, "", elementMarkdownRenderer)

        this.renderedElements = Array.from(this.tempParent.children)

        let settingsStartData = findColSettingsTag(this.contentData);
        if(settingsStartData.found === true) {

            let startofBlock = settingsStartData.startPosition;
            let endOfStart = settingsStartData.endPosition;
            
            let endOfBlock = findEndOfCodeBlock(this.contentData.slice(endOfStart));
            let endOfEnd = endOfBlock.endPosition;

            let settingsText = this.contentData.slice(startofBlock, endOfStart + endOfEnd)

            this.regionSettings = parseColumnSettings(settingsText)
        }

	}

	toDOM() {
		let el = document.createElement("div");
		el.className = "";
		let multiColumnParent = el.createDiv(
			{ cls: "multiColumnParent" }
		)

		// let columnContentDivs = this.getColumnContentDivs(settings, multiColumnParent);
		if (this.regionSettings.drawShadow === true) {
			multiColumnParent.addClass(MultiColumnStyleCSS.RegionShadow);
		}
		// for (let i = 0; i < columnContentDivs.length; i++) {
		// 	if (settings.drawBorder === true) {
		// 		columnContentDivs[i].addClass(MultiColumnStyleCSS.ColumnBorder);
		// 	}

		// 	if (settings.drawShadow === true) {
		// 		columnContentDivs[i].addClass(MultiColumnStyleCSS.ColumnShadow);
		// 	}
		// }

		let elementMarkdownRenderer = new MarkdownRenderChild(el);
		// MarkdownRenderer.renderMarkdown(this.contentData, columnContentDivs[0], "", elementMarkdownRenderer)
		// MarkdownRenderer.renderMarkdown("```ad-info\n\n# test\n\n```", columnContentDivs[1], "", elementMarkdownRenderer)

		return el;
	}
}