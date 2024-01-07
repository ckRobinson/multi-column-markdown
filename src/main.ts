/*
 * File: multi-column-markdown/src/main.ts
 * Created Date: Tuesday, October 5th 2021, 1:09 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { Notice, Plugin,  MarkdownRenderChild, MarkdownRenderer, TFile, Platform, MarkdownPostProcessorContext, MarkdownSectionInformation, parseFrontMatterEntry, Workspace, WorkspaceLeaf, EditorPosition } from 'obsidian';
import * as multiColumnParser from './utilities/textParser';
import * as containsPandoc from "./utilities/pandocParser";
import { FileDOMManager, GlobalDOMManager } from './dom_manager/domManager';
import { MultiColumnRenderData } from "./dom_manager/regional_managers/regionManager";
import { RegionManager } from "./dom_manager/regional_managers/regionManager";
import { RegionManagerContainer } from "./dom_manager/regional_managers/regionManagerContainer";
import { DOMObject, DOMObjectTag, TaskListDOMObject } from './dom_manager/domObject';
import { fileStillInView, getUID } from './utilities/utils';
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from './utilities/cssDefinitions';
import { multiColumnMarkdown_StateField } from './live_preview/cm6_livePreview';
import { parseColumnSettings, parseStartRegionCodeBlockID } from './utilities/settingsParser';
import { MultiColumnMarkdown_OnClickFix } from './live_preview/cm6_livePreivew_onClickFix';
import { MultiColumnSettings, getDefaultMultiColumnSettings } from './regionSettings';
import { HTMLSizing } from './utilities/interfaces';
import MultiColumnSettingsView from './settings/MultiColumnSettingsView';
import { DEFAULT_SETTINGS, MCM_SettingsManager } from './pluginSettings';
import { RegionErrorManager } from './dom_manager/regionErrorManager';
import { parseColBreakErrorType } from './utilities/errorMessage';
import { updateAllSyntax } from './utilities/syntaxUpdate';
import { getLeafFromFilePath } from './utilities/obsiUtils';

const CODEBLOCK_START_STRS = [
    "start-multi-column",
    "multi-column-start"
]
export default class MultiColumnMarkdown extends Plugin {

    settingsManager: MCM_SettingsManager = MCM_SettingsManager.shared;
    globalManager: GlobalDOMManager = new GlobalDOMManager();

	async onload() {

        console.log("Loading multi-column markdown");

        await this.loadSettings();

        this.globalManager = new GlobalDOMManager();

        this.registerEditorExtension(multiColumnMarkdown_StateField)
        this.registerEditorExtension(MultiColumnMarkdown_OnClickFix);

        for(let i = 0; i < CODEBLOCK_START_STRS.length; i++) {

            let startStr = CODEBLOCK_START_STRS[i]
            this.setupMarkdownCodeblockPostProcessor(startStr);
        }
        this.setupMarkdownPostProcessor();

        this.addSettingTab(new MultiColumnSettingsView(this.app, this))

        this.addCommand({            
            id: `toggle-mobile-rendering-mcm`,
            name: `Toggle Mobile Rendering - Multi-Column Markdown`,
            callback: async () => {

                this.settingsManager.renderOnMobile = !this.settingsManager.renderOnMobile;
                await this.saveSettings();

                let noticeString = `Toggled mobile rendering ${this.settingsManager.renderOnMobile ? "on" : "off"}.`
                if(Platform.isMobile === true) {
                    noticeString += ` Please reload any open files for change to take effect.`
                }
                new Notice (noticeString);
            }
        });

        //TODO: Set up this as a modal to set settings automatically
        this.addCommand({            
            id: `insert-multi-column-region`,
            name: `Insert Multi-Column Region`,
            editorCallback: (editor, view) => {

                try {
                    let cursorStartPosition = editor.getCursor("from");

                    editor.getDoc().replaceSelection(
`
--- start-multi-column: ID_${getUID(4)}
\`\`\`column-settings
Number of Columns: 2
Largest Column: standard
\`\`\`



--- column-break ---



--- end-multi-column

${editor.getDoc().getSelection()}`
                    );
                    
                    cursorStartPosition.line = cursorStartPosition.line + 7
                    cursorStartPosition.ch = 0;

                    editor.setCursor(cursorStartPosition);
                } catch (e) {
                    new Notice(
                        "Encountered an error inserting a multi-column region. Please try again later."
                    );
                }
            }
        });

        this.addCommand({            
            id: `add-IDs-To-multi-column-region`,
            name: `Fix Missing IDs for Multi-Column Regions`,
            editorCallback: (editor, view) => {

                try {
                    /**
                     * Not sure if there is an easier way to do this.
                     * 
                     * Get all of the lines of the document split by newlines.
                     */
                    let docText = editor.getRange({ line: 0, ch: 0 }, { line: editor.getDoc().lineCount(), ch: 0});
                    let lines = docText.split("\n");

                    let startCodeblock = multiColumnParser.findStartCodeblock(docText);
                    let lineOffset = 0;
                    let numCodeblocksUpdated = 0;
                    while(startCodeblock.found === true) {

                        // Get the text of the settings block so we can check if it contains an ID,
                        // also so we can get the length of the first line, used to calculate where to append a new ID if needed
                        let settingsText = docText.slice(startCodeblock.startPosition, startCodeblock.endPosition);
                        let firstLineOfCodeblockLength = settingsText.split("\n")[0].length;
                        
                        // We need the lines before the block to know where to start replacing text
                        // and the lines including the block to know where to set our offset to after this iteration.
                        let linesBefore = docText.slice(0, startCodeblock.startPosition);
                        let startReplacementLineIndex = (linesBefore.split("\n").length - 1) + lineOffset;
                        let linesOf = docText.slice(0, startCodeblock.endPosition);
                        let endReplacementLineIndex =  (linesOf.split("\n").length - 1) + lineOffset;

                        let settingsID = parseStartRegionCodeBlockID(settingsText);
                        if(settingsID === "") {

                            // copy the first line of the codeblock and append a new ID, then replace the first line of the block
                            let replacementText = editor.getRange({ line: startReplacementLineIndex, ch: 0 }, { line: startReplacementLineIndex, ch: firstLineOfCodeblockLength}) + `\nID: ID_${getUID(4)}`
                            editor.replaceRange(replacementText, { line: startReplacementLineIndex, ch: 0 }, 
                                                                 { line: startReplacementLineIndex, ch: firstLineOfCodeblockLength});
                            endReplacementLineIndex += 1;
                            numCodeblocksUpdated += 1;
                        }

                        lineOffset = endReplacementLineIndex
                        docText = docText.slice(startCodeblock.endPosition);
                        startCodeblock = multiColumnParser.findStartCodeblock(docText);
                    }

                    /**
                     * Loop through all of the lines checking if the line is a 
                     * start tag and if so is it missing an ID.
                     */
                    let linesWithoutIDs = []
                    let textWithoutIDs = []
                    for(let i = 0; i < lines.length; i++) {

                        let data = multiColumnParser.isStartTagWithID(lines[i]);
                        if(data.isStartTag === true && data.hasKey === false) {
                            linesWithoutIDs.push(i);
                            textWithoutIDs.push(lines[i])
                        }
                    }                    

                    if(linesWithoutIDs.length === 0 && numCodeblocksUpdated === 0) {
                        new Notice ("Found 0 missing IDs in the current document.");
                        return;
                    }

                    /**
                     * Now loop through each line that is missing an ID and
                     * generate a random ID and replace the original text.
                     */
                    for(let i = 0; i < linesWithoutIDs.length; i++) {

                        let originalText = textWithoutIDs[i]
                        let text = originalText;
                        text = text.trimEnd();
                        if(text.charAt(text.length - 1) === ":") {
                            text = text.slice(0, text.length-1);
                        }
                        text = `${text}: ID_${getUID(4)}`;

                        editor.replaceRange(text, { line: linesWithoutIDs[i], ch: 0 }, 
                                                  { line: linesWithoutIDs[i], ch: originalText.length});
                    }

                    new Notice (`Replaced ${linesWithoutIDs.length + numCodeblocksUpdated} missing ID(s) in the current document.`);
                } catch (e) {
                    new Notice(
                        "Encountered an error addign IDs to multi-column regions. Please try again later."
                    );
                }
            }
        });
        this.addCommand({            
            id: `mcm-Toggle-Document-Reflow`,
            name: `Setup Multi-Column Reflow - Multi-Column Markdown`,
            editorCallback: (editor, view) => {

                app.fileManager.processFrontMatter(view.file, (frontmatter) => {

                    let isReflow = isMultiColumnReflow(frontmatter);
                    if(isReflow) {
                        return;
                    }

                    frontmatter["Multi-Column Markdown"] = [
                        {"Number of Columns": 2},
                        {"Column Size": "Standard"}
                    ]
                    view.editor.refresh()
                });
            }
        });
        this.addCommand({            
            id: `mcm-fix-file-multi-column-syntax`,
            name: `Fix Multi-Column Syntax in Current File.`,
            editorCallback: (editor, view) => {

                try {
                    let fromPosition: EditorPosition = { line: 0, ch: 0 }
                    let toPosition: EditorPosition = { line: editor.getDoc().lineCount(), ch: 0}

                    let docText = editor.getRange(fromPosition, toPosition);
                    let result = updateAllSyntax(docText);
                    let regionStartCount = result.regionStartCount;
                    let columnBreakCount = result.columnBreakCount;
                    let columnEndCount = result.columnEndCount;
                    let updatedFileContent = result.updatedFileContent;

                    if(result.fileWasUpdated) {
                        editor.replaceRange(updatedFileContent, fromPosition, toPosition)
                        new Notice(`Finished updating:\n${regionStartCount} start syntaxes,\n${columnBreakCount} column breaks, and\n${columnEndCount} column end tags.`)
                    }
                    else {
                        new Notice(`Found no region syntax to update.`)
                    }
                } catch (e) {
                    new Notice(
                        "Encountered an error fixing multi-column region syntax. Please try again later."
                    );
                }
            }
        });
        this.registerInterval(window.setInterval(() => {
            
            this.UpdateOpenFilePreviews();
        }, 500));
    }

    UpdateOpenFilePreviews() {

        let fileManagers = this.globalManager.getAllFileManagers();
        fileManagers.forEach(element => {
            
            let regionalManagers = element.getAllRegionalManagers();
            regionalManagers.forEach(regionManager => {
                
                regionManager.updateRenderedMarkdown()
            });
        });
    }

    setupMarkdownPostProcessor() {
        this.registerMarkdownPostProcessor(async (el, ctx) => {

            if(this.settingsManager.renderOnMobile === false &&
               Platform.isMobile === true) {
                return;
            }

            const sourcePath = ctx.sourcePath;

            let fileDOMManager = this.globalManager.getFileManager(sourcePath);
            if(fileDOMManager === null) {
                console.warn("Found null DOM manager. Could not process multi-column markdown.")
                return;
            }

            /**
             * Here we check if the export "print" flag is in the DOM so we can determine if we
             * are exporting and handle that case.
             */
            if(this.checkExporting(el)) {

                this.exportDocumentToPDF(el, fileDOMManager, sourcePath);
            }

            // Get the info for our current context and then check
            // if the entire text contains a start tag. If there is
            // no start tag in the document we can just return and
            // ignore the rest of the parsing.
            let info = ctx.getSectionInfo(el);

            /**
             * We need the context info to properly parse so returning here 
             * info is null. TODO: Set error in view if this occurs.
             */
            if(!info) {

                return;
            }

            let docString = info.text;
            let docLines = docString.split("\n");

            let reflowFrontmatter = isMultiColumnReflow(ctx.frontmatter);
            if(reflowFrontmatter === true) {
 
                this.renderDocReflow(el, ctx, sourcePath, fileDOMManager, docString, info);
                return;
            }
            else {
                fileDOMManager.removeRegion("Multi-Column Reflow Region");
            }

            /**
             * If we encounter a start tag on the document we set the flag to start
             * parsing the rest of the document.
             */
            if(multiColumnParser.containsRegionStart(docString)) {

                fileDOMManager.setHasStartTag();
            }

            /** 
             * If the document does not contain any start tags we ignore the
             * rest of the parsing. This is only set to true once the first
             * start tag element is parsed above.
             */
            if(fileDOMManager.getHasStartTag() === false) {
                return;
            }

            /**
             * Take the info provided and generate the required variables from 
             * the line start and end values.
             */
            let relativeTexts: ElementRelativeLocationData = extractElementRelativeLocationData(docLines, info);

            /**
             * If the current line is a start tag we want to set up the
             * region manager. The regional manager takes care
             * of all items between it's start and end tags while the
             * file manager we got above above takes care of all regional 
             * managers in each file.
             */
            if(multiColumnParser.containsStartTag(relativeTexts.textOfElement)) {
                
                createStartElement(el, relativeTexts.linesOfElement, ctx, fileDOMManager, docString);
                return;
            }

            // Pandoc Start Region Tag.
            if(containsPandoc.containsPandocStartTag(relativeTexts.textOfElement)) {

                createPandocStartElement(el, relativeTexts.textOfElement, ctx, fileDOMManager, docString);
                return;
            }

            /**
             * Check if any of the lines above us contain a start block, and if
             * so get the lines from our current element to the start block.
             */
            let startBockAbove = multiColumnParser.getStartDataAboveLine(relativeTexts.linesAboveArray);
            if(startBockAbove === null) {
                return;
            }
            /**
             * We now know we're within a multi-column region, so we update our
             * list of lines above to just be the items within this region.
             */
            relativeTexts.linesAboveArray = startBockAbove.linesAboveArray;

            /**
             * We use the start block's key to get our regional manager. If this
             * lookup fails we can not continue processing this element.
             */
            let regionalContainer: RegionManagerContainer = fileDOMManager.getRegionalContainer(startBockAbove.startBlockKey);
            if(regionalContainer === null) {
                return;
            }
            let regionalManager: RegionManager = regionalContainer.getRegion();

            /**
             * To make sure we're placing the item in the right location (and 
             * overwrite elements that are now gone) we now want all of the
             * lines after this element up to the end tag.
             */
            relativeTexts.linesBelowArray =  multiColumnParser.getEndBlockBelow(relativeTexts.linesBelowArray);

            /**
             * Now we take the lines above our current element up until the
             * start region tag and render that into an HTML element. We will 
             * use these elements to determine where to place our current element.
             */
            regionalManager = this.appendToRegionalManager(el, regionalContainer, ctx, relativeTexts, sourcePath, startBockAbove, (domObj: DOMObject) => {
                onUnloadElement(domObj, regionalContainer);
            });
            return;
        });
    }

    private appendToRegionalManager(el: HTMLElement, regionalContainer: RegionManagerContainer, ctx: MarkdownPostProcessorContext, relativeLines: ElementRelativeLocationData, sourcePath: string, parentStartBlock: multiColumnParser.StartTagData, onUnloadCallback: (domObj: DOMObject) => void) {

        let { linesAboveArray, linesOfElement, linesBelowArray, textOfElement } = relativeLines;

        let siblingsAbove: HTMLDivElement = renderMarkdownFromLines(linesAboveArray, sourcePath);

        let siblingsBelow: HTMLDivElement = renderMarkdownFromLines(linesBelowArray, sourcePath);
        
        let regionalManager: RegionManager = regionalContainer.getRegion();

        /**
         * Set up our dom object to be added to the manager.
         */
        let currentObject: DOMObject = new DOMObject(el, linesOfElement);
        el.id = currentObject.UID;

        currentObject = TaskListDOMObject.checkForTaskListElement(currentObject);

        /**
         * Now we add the object to the manager and then setup the
         * callback for when the object is removed from view that will remove
         * the item from the manager.
         */
        let addIndex = regionalManager.addObject(siblingsAbove, siblingsBelow, currentObject);

        let elementMarkdownRenderer = new MarkdownRenderChild(el);
        elementMarkdownRenderer.onunload = () => {
            onUnloadCallback(currentObject);
        }
        ctx.addChild(elementMarkdownRenderer);

        /**
         * Now we check if our current element is a special flag so we can
         * properly set the element tag within the regional manager.
         */
        if (multiColumnParser.containsEndTag(el.textContent) === true &&
            parentStartBlock.startBlockType !== "PADOC") {

            currentObject.elementType = "unRendered";
            regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
        }
        if (containsPandoc.isValidPandocEndTag(linesAboveArray, el.textContent) === true &&
            parentStartBlock.startBlockType === "PADOC") {

            currentObject.elementType = "unRendered";
            regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
        }
        else if (multiColumnParser.containsColEndTag(textOfElement) === true) {

            currentObject.elementType = "unRendered";
            regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
        }
        else if (multiColumnParser.containsColSettingsTag(textOfElement) === true) {

            currentObject.elementType = "unRendered";
            regionalManager = regionalContainer.setRegionSettings(textOfElement);
            regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.regionSettings);
        }
        setElementCSS(currentObject, el);

        parseColBreakErrorType({
            lineAbove: linesAboveArray.last(),
            lineBelow: linesBelowArray.first(),
            objectTag: currentObject.tag,
            colBreakType: currentObject.elementIsColumnBreak
        }, regionalManager.errorManager)

        regionalManager.renderRegionElementsToScreen();
        return regionalManager;
    }

    setupMarkdownCodeblockPostProcessor(startStr: string) {

        this.registerMarkdownCodeBlockProcessor(startStr, (source, el, ctx) => {

            if(this.settingsManager.renderOnMobile === false &&
                Platform.isMobile === true) {
 
                 return;
            }

            const sourcePath = ctx.sourcePath;
        
            // Set up our CSS so that the codeblock only renders this data in reading mode
            // source/live preview mode is handled by the CM6 implementation.
            el.parentElement?.addClass("preivew-mcm-start-block");
        
            // To determine what kind of view we are rendering in we need a markdown leaf.
            // Really this should never return here since rendering is only done in markdown leaves.
            let markdownLeaves = app.workspace.getLeavesOfType("markdown");
            if(markdownLeaves.length === 0) {
                return;
            }
        
            if(this.globalManager === null || this.globalManager === undefined) {
                // console.log("Global manager is undefined?");
                return;
            }

            let fileDOMManager = this.globalManager.getFileManager(sourcePath);
            if(fileDOMManager === null) {
                return;
            }
            
            if(ctx.frontmatter && 
               ctx.frontmatter["Multi-Column Reflow"] !== undefined) {
                return;
            }
            else {
                fileDOMManager.removeRegion("Multi-Column Reflow Region");
            }

            // Set file to have start tag.
            fileDOMManager.setHasStartTag();
        
            // Get the info for our current context and then check
            // if the entire text contains a start tag. If there is
            // no start tag in the document we can just return and
            // ignore the rest of the parsing.
            let info = ctx.getSectionInfo(el);
        
            /**
             * We need the context info to properly parse so returning here 
             * info is null. TODO: Set error in view if this occurs.
             */
            if(!info) {
                return;
            }
        
            /** 
             * Set up the current element to act as the parent for the 
             * multi-column region.
             */
            el.classList.add(MultiColumnLayoutCSS.RegionRootContainerDiv)

            let errorManager = new RegionErrorManager(el, ["The codeblock region start syntax has been depricated. Please manually update to the current syntax defined in the ReadMe, run the \"Fix Multi-Column Syntax in Current File\" from the Command Palette, or use the \"Update Depricated Syntax\" command found in the plugin settings window. You must reload the file for changes to take effect."]);
            let renderColumnRegion = el.createDiv({
                cls: MultiColumnLayoutCSS.RegionContentContainerDiv
            })
        
            let regionKey = parseStartRegionCodeBlockID(source);
        
            let createNewRegionManager = true;
            if(fileDOMManager.checkKeyExists(regionKey) === true) {
                
                createNewRegionManager = false;
                let { numberOfTags, keys } = multiColumnParser.countStartTags(info.text);
        
                let numMatches = 0;
                for(let i = 0; i < numberOfTags; i++) {
        
                    // Because we checked if key exists one of these has to match.
                    if(keys[i] === regionKey) {
                        numMatches++;
                    }
                }
        
                // We only want to display an error if there are more than 2 of the same id across
                // the whole document. This prevents erros when obsidian reloads the whole document
                // and there are two of the same key in the map.
                if(numMatches >= 2) {
                    if(regionKey === "") {
                        errorManager.addErrorMessage("Found multiple regions with empty IDs. Please set a unique ID in the codeblock.\nEG: 'ID: randomID'");
                    }
                    else {
                        errorManager.addErrorMessage("Region ID already exists in document, please set a unique ID.");
                    }
                    return;
                }
            }
            el.id = `MultiColumnID:${regionKey}`
        
            // If something changes in the codeblock we dont necessarily want to update our
            // old reference to the region manager. This could be a potential bug area.
            if(createNewRegionManager === true) {
        
                // Create a new regional manager.
                let elementMarkdownRenderer = new MarkdownRenderChild(el);
                fileDOMManager.createRegionalManager(regionKey, el, errorManager, renderColumnRegion);
        
                // Set up the on unload callback. This can be called if the user changes
                // the start/settings codeblock in any way. We only want to unload
                // if the file is being removed from view.
                elementMarkdownRenderer.onunload = () => {
        
                    if(fileDOMManager && fileStillInView(sourcePath) === false) {
        
                        // console.debug("File not in any markdown leaf. Removing region from dom manager.")
                        fileDOMManager.removeRegion(regionKey);
                    }
                };
                ctx.addChild(elementMarkdownRenderer);
            }
        
            let regionalManagerContainer = fileDOMManager.getRegionalContainer(regionKey);
            if(regionalManagerContainer !== null) {
        
                let regionalManager = regionalManagerContainer.setRegionSettings(source);
                regionalManager.regionParent = renderColumnRegion;
            }
        })
    }

    async loadSettings() {

		this.settingsManager.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settingsManager.settings);
	}

    renderDocReflow(el: HTMLElement, ctx: MarkdownPostProcessorContext, sourcePath: string, fileDOMManager: FileDOMManager, docString: string, info: MarkdownSectionInformation) {

        let regionalContainer: RegionManagerContainer = null;
        if(fileDOMManager.checkKeyExists("Multi-Column Reflow Region") === true &&
           el.getElementsByClassName("frontmatter").length === 0) {
            regionalContainer = fileDOMManager.getRegionalContainer("Multi-Column Reflow Region");
        }
        else if(fileDOMManager.checkKeyExists("Multi-Column Reflow Region") === true &&
                el.getElementsByClassName("frontmatter").length === 1) {

            let parentEl = createDiv()
            el.appendChild(parentEl);

            // Get current data, remove old region.
            regionalContainer = fileDOMManager.getRegionalContainer("Multi-Column Reflow Region");
            let domList = regionalContainer.getRegion().getRegionData().domList.slice();
            fileDOMManager.removeRegion("Multi-Column Reflow Region");

            // Create new region.
            setupStartTag(parentEl, ctx, fileDOMManager, docString, "Multi-Column Reflow Region");
            regionalContainer = fileDOMManager.getRegionalContainer("Multi-Column Reflow Region");
            let settings = getMultiColumnSettingsFromFrontmatter(ctx);
            
            let leaf = getLeafFromFilePath(this.app.workspace, ctx.sourcePath);
            let clientHeight = calcVisibleClietHeight(leaf, this.app.workspace);
            if(settings.columnHeight === null) {
                settings.columnHeight = HTMLSizing.create().setWidth(clientHeight).setUnits("px");
            }
            else {
                settings.columnHeight = settings.columnHeight.convertToPX(this.app.workspace.containerEl);
            }
            regionalContainer.setRegionParsedSettings(settings);
            
            // Re-Render after small delay.
            // Delay is so the auto layout check can properly read the client height.
            async function delayRender() {

                setTimeout(()=> {                    

                    // Append all items to region.
                    let regionalManager = regionalContainer.getRegion();
                    let listLength = domList.length;
                    for(let i = 0; i < listLength; i++) {

                        let domObj = domList.shift()
                        regionalManager.addObjectAtIndex(domObj, i);

                        setElementCSS(domObj, domObj.originalElement);
                    }

                    regionalContainer.getRegion().renderRegionElementsToScreen();
                }, 50)
            }
            delayRender();

            return;
        }
        else {

            // The first element to hit this point appears to be the yaml information which we can use
            // as our root div since the whole doc is going to be re-formatted.
            let parentEl = createDiv()
            el.appendChild(parentEl);

            setupStartTag(parentEl, ctx, fileDOMManager, docString, "Multi-Column Reflow Region");
            regionalContainer = fileDOMManager.getRegionalContainer("Multi-Column Reflow Region");

            let settings = getMultiColumnSettingsFromFrontmatter(ctx);
            let leaf = getLeafFromFilePath(this.app.workspace, ctx.sourcePath);

            let clientHeight = calcVisibleClietHeight(leaf, this.app.workspace);
            if(settings.columnHeight === null) {
                settings.columnHeight = HTMLSizing.create().setWidth(clientHeight).setUnits("px");
            }
            else {
                settings.columnHeight = settings.columnHeight.convertToPX(this.app.workspace.containerEl);
            }
            regionalContainer.setRegionParsedSettings(settings);

            return;
        }

        if(regionalContainer === null) {
            return;
        }

        let docLines = docString.split("\n");
        let relativeTexts: ElementRelativeLocationData = extractElementRelativeLocationData(docLines, info);
        relativeTexts.linesBelowArray =  multiColumnParser.getEndBlockBelow(relativeTexts.linesBelowArray);

        if(multiColumnParser.containsStartTag(relativeTexts.textOfElement) ||
           multiColumnParser.containsColSettingsTag(relativeTexts.textOfElement)) {

            if(multiColumnParser.containsStartTag(relativeTexts.textOfElement)) {
                setElementCSSByTag(DOMObjectTag.startRegion, el);
            }
            else if(multiColumnParser.containsColSettingsTag(relativeTexts.textOfElement)) {
                setElementCSSByTag(DOMObjectTag.regionSettings, el);
            }
            return;
        }

        let startBockAbove: multiColumnParser.StartTagData = {
            linesAboveArray: relativeTexts.linesAboveArray,
            startBlockKey: "Multi-Column Reflow Region",
            startBlockType: "ORIGINAL"
        }

        this.appendToRegionalManager(el, regionalContainer, ctx, relativeTexts, sourcePath, startBockAbove, (domObj: DOMObject) => {
            onUnloadElement(domObj, regionalContainer);
        });
    }

    //#region PDF Exporting.
    private isStartCodeblockInExport(node: HTMLElement): boolean {

        for(let i = 0; i < CODEBLOCK_START_STRS.length; i++) {

            if(node.hasClass(`block-language-${CODEBLOCK_START_STRS[i]}`)) {
                return true;
            }
        }
        return false;
    }

    private async exportDocumentToPDF(el: HTMLElement, fileDOMManager: FileDOMManager, sourcePath: string) {

        // A true export will be passed an element with all other items in the doc as children. 
        // So if there are no children we can just return
        let docChildren = Array.from(el.childNodes);
        if(docChildren.length === 0) {
            return;
        }

        let childrenToRemove = [];
        
        // To export codeblocks we need to get the IDs so we can get the data from our managers.
        // however since the ID isnt being stored in the element yet this means we need to read
        // all of the IDs out of the full document.
        let codeblockStartBlocks = []
        let aFile = this.app.vault.getAbstractFileByPath(sourcePath);
        if(aFile instanceof TFile) {

            let file = aFile as TFile
            let fileText = await this.app.vault.cachedRead(file) // Is cached read Ok here? It should be.

            // Once we have our data we search the text for all codeblock start values.
            // storing them into our queue.
            let codeBlockData = multiColumnParser.findStartCodeblock(fileText);
            while(codeBlockData.found === true) {

                let codeblockText = fileText.slice(codeBlockData.startPosition, codeBlockData.endPosition);
                fileText = fileText.slice(codeBlockData.endPosition);
                codeblockStartBlocks.push(codeblockText);

                codeBlockData = multiColumnParser.findStartCodeblock(fileText);
            }
        }
        else {
            console.error(`Error getting file from source path: ${sourcePath}`)
        }

        let inBlock = false;
        for (let i = 0; i < docChildren.length; i++) {

            let child = docChildren[i];
            if (child instanceof HTMLElement) {
                let childEl = child as HTMLElement;
                if (inBlock === false) {
                    
                    let foundBlockData = false;
                    let regionKey = "";

                    let blockData = multiColumnParser.isStartTagWithID(child.textContent);
                    let pandocData = containsPandoc.getPandocStartData(child.textContent)
                    if (blockData.isStartTag === true) {

                        // If an old-style start tag.
                        foundBlockData = true;
                        if (blockData.hasKey === true) {
                            let foundKey = multiColumnParser.getStartTagKey(child.textContent);
                            if (foundKey !== null) {
                                regionKey = foundKey;
                            }
                        }
                    }
                    else if(blockData.isStartTag === false && this.isStartCodeblockInExport(child)) {

                        // If the start tag from the old version is null we then check to see if the element is
                        // a codeblock start. If it is we use the next available codeblock data to retrieve our ID.
                        let codeblockText = codeblockStartBlocks.shift();
                        if(codeblockText === undefined) {
                            console.error("Found undefined codeblock data when exporting.")
                            return;
                        }

                        let id = parseStartRegionCodeBlockID(codeblockText);
                        if(id !== "") {
                            foundBlockData = true;
                            regionKey = id;
                        }
                    }
                    else if(pandocData.found) {
                        foundBlockData = true;
                        regionKey = pandocData.userSettings.columnID;
                    }

                    if(foundBlockData === true && regionKey !== "") {

                        inBlock = true;

                        for (let i = child.children.length - 1; i >= 0; i--) {
                            child.children[i].detach();
                        }
                        child.innerText = "";

                        child.classList.add(MultiColumnLayoutCSS.RegionRootContainerDiv);

                        let errorManager = new RegionErrorManager(el);
                        let renderColumnRegion = child.createDiv({
                            cls: MultiColumnLayoutCSS.RegionContentContainerDiv
                        });


                        let regionalContainer: RegionManagerContainer = fileDOMManager.getRegionalContainer(regionKey);
                        if (regionalContainer === null || regionalContainer.getRegion().numberOfChildren === 0) {
                            // If the number of children is 0, we are probably in LivePreview, where the codeblock start regions have been processed by native obsidian live preview but do not have any children linked to them.
                            errorManager.addErrorMessage("Error rendering multi-column region.\nPlease close and reopen the file, then make sure you are in reading mode before exporting.");
                        }
                        else {
                            let regionalManager: RegionManager = regionalContainer.getRegion();
                            regionalManager.exportRegionElementsToPDF(renderColumnRegion);
                        }
                    }
                }
                else {

                    if (multiColumnParser.containsEndTag(child.textContent) === true ||
                        containsPandoc.containsPandocEndTag(child.textContent) === true) {

                        inBlock = false;
                    }

                    childrenToRemove.push(child);
                }
            }
        }

        childrenToRemove.forEach(child => {
            if(child.parentElement === el) {
                el.removeChild(child);
            }
        });
    }

    checkExporting(element: HTMLElement): boolean {

        if(element === null) {
            return false;
        }

        if(element.classList.contains("print")) {
            return true;
        }

        if(element.parentNode !== null) {
            return this.checkExporting(element.parentElement);
        }

        return false;
    }
    //#endregion PDF Exporting.
}

function setElementCSS(currentObject: DOMObject, el: HTMLElement) {
    setElementCSSByTag(currentObject.tag, el);
}
function setElementCSSByTag(tag: DOMObjectTag, el: HTMLElement) {
    if (tag === DOMObjectTag.endRegion) {
        el.addClass(MultiColumnStyleCSS.RegionEndTag);
    }
    else if (tag === DOMObjectTag.columnBreak) {
        el.addClass(MultiColumnStyleCSS.ColumnEndTag);
    }
    else if (tag === DOMObjectTag.regionSettings) {
        el.addClass(MultiColumnStyleCSS.RegionSettings);
    }
    else {
        el.addClass(MultiColumnStyleCSS.RegionContent);
    }
}

function onUnloadElement(currentObject: DOMObject, regionalContainer: RegionManagerContainer): void {

    if (regionalContainer === null) {
        return;
    }

    let regionalManager: RegionManager = regionalContainer.getRegion();
    if (regionalManager) {

        // We can attempt to update the view here after the item is removed
        // but need to get the item's parent element before removing object from manager.
        let regionRenderData: MultiColumnRenderData = regionalManager.getRegionRenderData();

        regionalManager.removeObject(currentObject.UID);

        /**
         * Need to check here if element is null as this closure will be called
         * repeatedly on file change.
         */
        if (regionRenderData.parentRenderElement === null) {
            return;
        }
        regionalManager.renderRegionElementsToScreen();
    }
};

interface ElementRelativeLocationData {
    linesAboveArray: string[];
    linesOfElement: string[];
    linesBelowArray: string[];
    textOfElement: string;
}

export type nearbySiblings = { 
    siblingsAbove: HTMLDivElement,
    currentObject: DOMObject, 
}

function extractElementRelativeLocationData(docLines: string[], info: MarkdownSectionInformation): ElementRelativeLocationData {

    let linesAboveArray = docLines.slice(0, info.lineStart);
    let linesOfElement = docLines.slice(info.lineStart, info.lineEnd + 1);
    let textOfElement = linesOfElement.join("\n");
    let linesBelowArray = docLines.slice(info.lineEnd + 1);

    return {
        linesAboveArray,
        linesOfElement,
        linesBelowArray,
        textOfElement
    };
}

function createStartElement(el: HTMLElement, linesOfElement: string[], ctx: MarkdownPostProcessorContext, fileDOMManager: FileDOMManager, docString: string) {

    el.children[0].detach();

    let startBlockData = multiColumnParser.getStartBlockAboveLine(linesOfElement)
    if(startBlockData === null) {
        return;
    }

    let regionID = startBlockData.startBlockKey;

    setupStartTag(el, ctx, fileDOMManager, docString, regionID);
    return;
}

function createPandocStartElement(el: HTMLElement, textOfElement: string, ctx: MarkdownPostProcessorContext, fileDOMManager: FileDOMManager, docString: string) {
    el.children[0].detach();

    let pandocData = containsPandoc.getPandocStartData(textOfElement);
    let settings = pandocData.userSettings;

    let regionManager = setupStartTag(el, ctx, fileDOMManager, docString, settings.columnID);
    regionManager.setRegionalSettings(settings);
    return;
}

function renderMarkdownFromLines(mdLines: string[], sourcePath: string): HTMLDivElement {

    /**
     * We re-render all of the items above our element, until the start tag, 
     * so we can determine where to place the new item in the manager.
     * 
     * TODO: Can reduce the amount needing to be rendered by only rendering to
     * the start tag or a column-break whichever is closer.
     */
    let siblings = createDiv();
    let markdownRenderChild = new MarkdownRenderChild(
        siblings
    );
    MarkdownRenderer.renderMarkdown(
        mdLines.reduce((prev, current) => {
            return prev + "\n"  + current;
        }, ""),
        siblings,
        sourcePath,
        markdownRenderChild
    );

    return siblings;
}

function setupStartTag(el: HTMLElement, ctx: MarkdownPostProcessorContext, fileDOMManager: FileDOMManager, docString: string, regionID: string) {
    /** 
     * Set up the current element to act as the parent for the 
     * multi-column region.
     */
    el.classList.add(MultiColumnLayoutCSS.RegionRootContainerDiv)

    let errorManager = new RegionErrorManager(el);
    let renderColumnRegion = el.createDiv({
        cls: MultiColumnLayoutCSS.RegionContentContainerDiv
    })

    if(fileDOMManager.checkKeyExists(regionID) === true) {

        let { numberOfTags, keys } = multiColumnParser.countStartTags(docString);

        let numMatches = 0;
        for(let i = 0; i < numberOfTags; i++) {

            // Because we checked if key exists one of these has to match.
            if(keys[i] === regionID) {
                numMatches++;
            }
        }

        // We only want to display an error if there are more than 2 of the same id across
        // the whole document. This prevents erros when obsidian reloads the whole document
        // and there are two of the same key in the map.
        if(numMatches >= 2) {
            if(regionID === "") {
                errorManager.addErrorMessage("Found multiple regions with empty IDs. Please set a unique ID after each start tag.\nEG: '--- multi-column-start: randomID'\nOr use 'Fix Missing IDs' in the command palette and reload the document.");
            }
            else {
                errorManager.addErrorMessage("Region ID already exists in document, please set a unique ID.\nEG: '--- multi-column-start: randomID'");
            }
            return;
        }
    }
    el.id = `MultiColumnID:${regionID}`

    let elementMarkdownRenderer = new MarkdownRenderChild(el);
    let regionManager = fileDOMManager.createRegionalManager(regionID, el, errorManager, renderColumnRegion);
    elementMarkdownRenderer.onunload = () => {
        if(fileDOMManager) {

            fileDOMManager.removeRegion(regionID);
        }
    };
    ctx.addChild(elementMarkdownRenderer);

    return regionManager
}

const FRONTMATTER_REGEX: RegExp[] =
[
/Multi[- ]*Column *Markdown/i,
/Multi[- ]*Column *Reflow/i
]
function isMultiColumnReflow(frontmatter: any): boolean {

    if(frontmatter === null ||
       frontmatter === undefined) {
        return false;
    }

    for(let regex of FRONTMATTER_REGEX) {

        let frontmatterReflowData = parseFrontMatterEntry(frontmatter, regex);
        if(frontmatterReflowData !== null) {
            return true;
        }
    }

    let [keys, values] = Object.entries(frontmatter);
    if(keys === undefined) {
        return false;
    }

    for(let key of keys) {

        if(typeof key !== "string") {
            continue;
        }

        for(let regex of FRONTMATTER_REGEX) {

            let regexResult = regex.exec(key);
            if(regexResult !== null) {
                return true;
            }
        }
    }

    return false;
}

function getMultiColumnSettingsFromFrontmatter(ctx: MarkdownPostProcessorContext): MultiColumnSettings {

    let settings = getDefaultMultiColumnSettings();
    settings.fullDocReflow = true;
    if(ctx.frontmatter === null ||
       ctx.frontmatter === undefined) {
        return settings;
    }

    for(let regex of FRONTMATTER_REGEX) {

        let frontmatterReflowData = parseFrontMatterEntry(ctx.frontmatter, regex);
        if(frontmatterReflowData !== null &&
           Array.isArray(frontmatterReflowData)) {
            settings = parseFrontmatterSettings(frontmatterReflowData);
            settings.fullDocReflow = true;
            break;
        }
    }

    return settings;
}

function parseFrontmatterSettings(frontmatterReflowData: any[]): MultiColumnSettings {

    let str = "";
    for(let obj of frontmatterReflowData) {

        let [key, value] = Object.entries(obj)[0];
        str += `${key}: [${value}]\n`;
    }

    let settings = parseColumnSettings(str);

    return settings;
}

function getContentHeightFromLeaf(leaf: WorkspaceLeaf): number {

    let contentEl = (leaf.view as any)["contentEl"] as HTMLElement
    if(contentEl !== undefined &&
       contentEl.clientHeight > 0) {
        return contentEl.clientHeight;
    }

    let clientHeight = leaf.view.containerEl.clientHeight;
    let titleContainer = (leaf.view as any)["titleContainerEl"] as HTMLElement 
    if(titleContainer !== undefined &&
       titleContainer.clientHeight > 0) {
        return clientHeight - titleContainer.clientHeight;
    }

    return clientHeight - 50;
}

function calcVisibleClietHeight(leaf: WorkspaceLeaf, workspace: Workspace): number {

    let clientHeight = 0;
    if (leaf) {
        clientHeight = getContentHeightFromLeaf(leaf);
    }
    else if ((workspace !== null && workspace !== undefined) &&
             (workspace.containerEl !== null && workspace.containerEl !== undefined) &&
              workspace.containerEl.clientHeight > 0) {
        clientHeight = workspace.containerEl.clientHeight - 100;
    }
    else {
        clientHeight = 1000;
    }
    return clientHeight;
}