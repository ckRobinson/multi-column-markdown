/*
 * Filename: multi-column-markdown/src/live_preview/cm6_livePreview.ts
 * Created Date: Monday, August 1st 2022, 1:51:16 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { Extension, Line, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { containsRegionStart, findEndTag, findSettingsCodeblock, findStartCodeblock, findStartTag } from "../utilities/textParser";
import { MultiColumnMarkdown_DefinedSettings_LivePreview_Widget, MultiColumnMarkdown_LivePreview_Widget } from "./mcm_livePreview_widget";

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

                // TODO: Check other ways to get if source is live preview? editorLivePreviewField
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
				if (containsRegionStart(docText) === false) {
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
				if(startTagData.found === false) {
					startTagData = findStartCodeblock(workingFileText);
				}

				let endTagData = findEndTag(workingFileText);
				let loopIndex = 0;
				let startIndexOffset = 0;
				while (startTagData.found === true && endTagData.found === true) {

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
					let cursorInRegion = checkCursorInRegion(startIndex, endIndex, ranges);
					if(cursorInRegion === true) {
						
						// If the cursor is within the region we then need to know if
						// it is within our settings block (if it exists.)
						let settingsStartData = findStartCodeblock(elementText);
						if(settingsStartData.found === false) {
							settingsStartData = findSettingsCodeblock(elementText);
						}

						if(settingsStartData.found === true) {

							// Since the settings block exists check if the cursor is within that region.
							let codeblockStartIndex = startIndex + settingsStartData.startPosition;
							let codeblockEndIndex = startIndex + settingsStartData.endPosition;
							let settingsText = docText.slice(codeblockStartIndex, codeblockEndIndex )

							let cursorInCodeblock = checkCursorInRegion(codeblockStartIndex, codeblockEndIndex, ranges);
							if(cursorInCodeblock === false) {
	
								// If the cursor is not within the region we pass the data to the
								// settings view so it can be displayed in the region.
								builder.add(
									codeblockStartIndex,
									codeblockEndIndex + 1,
									Decoration.replace({
										widget: new MultiColumnMarkdown_DefinedSettings_LivePreview_Widget(settingsText),
									})
								);
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
								widget: new MultiColumnMarkdown_LivePreview_Widget(elementText),
							})
						);
					}
					generated = true;

					// ReCalculate additional start tags if there are more in document.
					startTagData = findStartTag(workingFileText);
					if(startTagData.found === false) {
						startTagData = findStartCodeblock(workingFileText);
					}

					endTagData = findEndTag(workingFileText);
					loopIndex++;
					if(loopIndex > 100) {
						console.warn("Potential issue with rendering Multi-Column Markdown live preview regions. If problem persists please file a bug report with developer.")
						break;
					}
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

		function checkCursorInRegion(startIndex: number,
								endIndex: number, 
								ranges: { line: Line, position: number }[] ): boolean {

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

			return cursorInRegion;
		}
	},
	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	},
});

