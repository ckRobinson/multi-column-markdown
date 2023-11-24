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
import { PandocRegexData, findPandoc, parsePandocSettings } from "src/utilities/pandocParser";
import { MultiColumnMarkdown_DefinedSettings_LivePreview_Widget, MultiColumnMarkdown_LivePreview_Widget } from "./mcm_livePreview_widget";
import { editorInfoField, editorLivePreviewField } from "obsidian";
import { RegionType, StartTagRegexMatch, mouseState } from "src/utilities/interfaces";
import { MultiColumnSettings } from "src/regionSettings";
import { parseColumnSettings } from "src/utilities/settingsParser";

let selecting = false;
export const multiColumnMarkdown_StateField = StateField.define<DecorationSet>({
	create(state): DecorationSet {
		return Decoration.none;
	},
	update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
        let ignoreFurtherIterations = false;

		// Check if view is in live preview state.
		if(transaction.state.field(editorLivePreviewField) === false) {
            return builder.finish();
		}

        /**
         * When we have the while file we then get the entire doc text and check if it 
         * contains a MCM region so we know to break or not.
         */
        let docLength = transaction.state.doc.length
        let docText = transaction.state.doc.sliceString(0, docLength);
        if (containsRegionStart(docText) === false) {
            return builder.finish();
        }

		syntaxTree(transaction.state).iterate({
			enter(node) {

				// If we find that the file does not contain any MCM regions we can flip this
				// flag and skip all other node iterations, potentially saving a lot of compute time.
				// 
                // We only want to run the generation once per state change. If
                // a previous node has sucessfully generated regions we ignore all
                // other nodes in the state.
                if(ignoreFurtherIterations === true) {
                    return;
                }

				// We want to run on the whole file so we dont just look for a single token.
				const tokenProps = node.type.prop<string>(tokenClassNodeProp);
				if (tokenProps !== undefined) {
					return;
				}

				// We want to know where the user's cursor is, it can be
				// selecting multiple regions of text as well so we need to know
				// all locations. Used to know if we should render region as text or as preview.
				let ranges = getCursorLineLocations();

				// Setup our loop to render the regions as MCM. 
				let workingFileText = docText;

				let loopIndex = 0;
				let startIndexOffset = 0;
				while (true) {

					let regionData: RegionData = getNextRegion(workingFileText, startIndexOffset, docText);
					if(regionData === null) {
						break;
					}

					let elementText  = regionData.regionText;
					workingFileText  = regionData.remainingText;
					let startIndex   = regionData.startIndex;
					let endIndex     = regionData.endIndex;
					startIndexOffset = endIndex;

					// Here we check if the cursor is in this specific region.
					let cursorInRegion = checkCursorInRegion(startIndex, endIndex, ranges);
					if(cursorInRegion === true) {
						
						// // If the cursor is within the region we then need to know if
						// // it is within our settings block (if it exists.)
						// let settingsStartData = findStartCodeblock(elementText);
						// if(settingsStartData.found === false) {
						// 	settingsStartData = findSettingsCodeblock(elementText);
						// }

						// if(settingsStartData.found === true) {

						// 	// Since the settings block exists check if the cursor is within that region.
						// 	let codeblockStartIndex = startIndex + settingsStartData.startPosition;
						// 	let codeblockEndIndex = startIndex + settingsStartData.endPosition;
						// 	let settingsText = docText.slice(codeblockStartIndex, codeblockEndIndex )

						// 	let cursorInCodeblock = checkCursorInRegion(codeblockStartIndex, codeblockEndIndex, ranges);
						// 	if(cursorInCodeblock === false) {
	
						// 		// If the cursor is not within the region we pass the data to the
						// 		// settings view so it can be displayed in the region.
						// 		builder.add(
						// 			codeblockStartIndex,
						// 			codeblockEndIndex,
						// 			Decoration.replace({
						// 				widget: new MultiColumnMarkdown_DefinedSettings_LivePreview_Widget(settingsText),
						// 			})
						// 		);
						// 	}
						// }						
					}
					else {

						let foundSettings = getSettingsData(regionData);
						let userSettings = null;
						let settingsText = ""
						let originalText = elementText
						if(foundSettings !== null) {
							
							elementText = foundSettings.contentData;
							userSettings = foundSettings.settings;
							settingsText = foundSettings.settingsText;
						}

						const editorInfo = transaction.state.field(editorInfoField);

						// At this point if the cursor isnt in the region we pass the data to the
						// element to be rendered.
						builder.add(
							startIndex,
							endIndex,
							Decoration.replace({
								widget: new MultiColumnMarkdown_LivePreview_Widget(originalText, elementText, userSettings, editorInfo.file, settingsText, regionData.regionType),
							})
						);
					}
					ignoreFurtherIterations = true;

					// Infinite loop protection.
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

			for (let i = 0; i < ranges.length; i++) {

				// TODO: Maybe look into limiting this to the second and second to last line
				// of the region as clicking right at the top or bottom of the region
				// swaps it to unrendered.
				let range = ranges[i];
				if(valueIsInRange(range.position, startIndex, endIndex) === true) {
					return true;
				}
			}

			if(transaction.state.selection){
				for (let i = 0; i < transaction.state.selection.ranges.length; i++) {

					let range = transaction.state.selection.ranges[i];

					// If either the start or end of the selection is within the
					// region range we do not render live preview.
					if(valueIsInRange(range.from, startIndex, endIndex) || 
					   valueIsInRange(range.to, startIndex, endIndex)) {
						return true;
					}

					// // Or if the entire region is within the selection range
					// we do not render the live preview.
					if(valueIsInRange(startIndex, range.from, range.to) && 
					   valueIsInRange(endIndex, range.from, range.to)) {
						return true;
					}
				}
			}

			return false;
		}
	},
	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	},
});

interface RegionData {
	regionType: RegionType;
	regionText: string;
	remainingText: string;
	startIndex: number;
	endIndex: number;
}
interface PandocRegionData extends RegionData {
	columnCount: string;
	userSettings: string;
}

function getNextRegion(workingFileText: string, startIndexOffset: number, wholeDoc: string): RegionData | null {

	let region = findNextRegion(workingFileText);
	if(region === null) {
		return null;
	}

	if(region.dataType === "CODEBLOCK" || region.dataType === "ORIGINAL") {

		// Search for the first end tag after a start block. (No recursive columns.)
		let endTagData = findEndTag(workingFileText.slice(region.data.startPosition));
		if(endTagData.found === false) {
			return null;
		}

		/**
		 * For the region we found get the start and end position of the tags so we 
		 * can slice it out of the document.
		 */
		let startIndex = startIndexOffset + region.data.startPosition;
		let endIndex = startIndex + endTagData.startPosition + endTagData.matchLength // Without the matchLength will leave the end tag on the screen.

		// This text is the entire region data including the start and end tags.
		let elementText = wholeDoc.slice(startIndex, endIndex)
		workingFileText = wholeDoc.slice(endIndex);

		/**
		 * Update our start offset and the working text of the file so our next 
		 * iteration knows where we left off
		 */
		let data: RegionData = {
			regionType: region.dataType,
			regionText: elementText,
			remainingText: workingFileText,
			startIndex: startIndex,
			endIndex: endIndex
		}
		return data;
	}

	if(region.dataType === "PADOC") {

		let pandocData: PandocRegexData = region.data as PandocRegexData;
		let startIndex = startIndexOffset + pandocData.startPosition;
		let endIndex = startIndexOffset + pandocData.endPosition;
		workingFileText = wholeDoc.slice(endIndex);
		let data: PandocRegionData = {
			regionType: region.dataType,
			regionText: pandocData.content,
			remainingText: workingFileText,
			startIndex: startIndex,
			endIndex: endIndex,
			columnCount: pandocData.columnCount,
			userSettings: pandocData.userSettings
		}
		return data;
	}
}

function findNextRegion(workingFileText: string): { dataType: RegionType, data: StartTagRegexMatch | PandocRegexData } {

	// If there are multiple kinds of start blocks, the old way of parsing would cause issues.
	// Now search for both kinds and determine what to do after search.
	let startTagData_codeblockStart: { dataType: RegionType, data: StartTagRegexMatch } = {dataType: "CODEBLOCK", data: findStartCodeblock(workingFileText) };
	let startTagData_originalStart: { dataType: RegionType, data: StartTagRegexMatch } = {dataType: "ORIGINAL", data: findStartTag(workingFileText) };
	let pandocData: { dataType: RegionType, data: PandocRegexData } = {dataType: "PADOC", data: findPandoc(workingFileText) }

	if(startTagData_codeblockStart.data.found === false && 
	   startTagData_originalStart.data.found === false &&
	   pandocData.data.found === false) {
		return null;
	}

	let regionsFound = [startTagData_codeblockStart, startTagData_originalStart, pandocData].filter((val) => { return val.data.found === true });
	if(regionsFound.length > 1) {

		let sorted = regionsFound.sort((a, b) => {
			return a.data.startPosition - b.data.endPosition;
		})
		return sorted.first();
	}
	
	if(startTagData_codeblockStart.data.found === true) {
		return startTagData_codeblockStart;
	}
	
	if(startTagData_originalStart.data.found === true){
		return startTagData_originalStart;
	}
	
	if(pandocData.data.found === true) {
		return pandocData;
	}

	throw("Unknown type found when parsing region.")
}

function getSettingsData(regionData: RegionData): {settings: MultiColumnSettings, settingsText: string, contentData: string} {

	let contentData = regionData.regionText
	function parseCodeBlockSettings(settingsStartData: StartTagRegexMatch) {

		let settingsText = contentData.slice(settingsStartData.startPosition, settingsStartData.endPosition);
		contentData = contentData.replace(settingsText, "");

		let settings = parseColumnSettings(settingsText);

		return {
			settings: settings,
			settingsText: settingsText,
			contentData: contentData
		}
	}

	if(regionData.regionType === "CODEBLOCK") {
		let settingsStartData = findStartCodeblock(contentData);
		if (settingsStartData.found === false) {
			return null;
		}

		return parseCodeBlockSettings(settingsStartData)
	}

	if(regionData.regionType === "ORIGINAL") {
		let settingsStartData = findSettingsCodeblock(contentData);
		if (settingsStartData.found === false) {
			return null;
		}
		return parseCodeBlockSettings(settingsStartData)
	}

	if(regionData.regionType === "PADOC") {

		let pandocData = regionData as PandocRegionData
		return {
			settings: parsePandocSettings(pandocData.userSettings, pandocData.columnCount),
			settingsText: "",
			contentData: regionData.regionText
		}
	}
}

function checkUserSelecting(transaction: Transaction): boolean {
	
	let isSelecting = false;
	if(transaction.isUserEvent("select.pointer") && 
		transaction.state.selection.ranges && 
		transaction.state.selection.ranges.length > 0) {

		for(let range of transaction.state.selection.ranges) {

			if(range.to - range.from > 1) {

				isSelecting = true;
				break;
			}
		}
	}

	return isSelecting
}