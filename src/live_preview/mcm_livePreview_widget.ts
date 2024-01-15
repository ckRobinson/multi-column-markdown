/*
 * Filename: multi-column-markdown/src/live_preview/MultiColumnMarkdown_Widget.ts
 * Created Date: Tuesday, August 16th 2022, 4:38:43 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { MarkdownRenderChild, MarkdownRenderer, TFile, WorkspaceLeaf } from "obsidian";
import { WidgetType } from "@codemirror/view";
import { getDefaultMultiColumnSettings, MCSettings_isEqual, MultiColumnSettings } from "../regionSettings";
import { parseSingleColumnSettings } from "../utilities/settingsParser";
import { StandardMultiColumnRegionManager } from "../dom_manager/regional_managers/standardMultiColumnRegionManager";
import { RegionManagerData } from "../dom_manager/regional_managers/regionManagerContainer";
import { getUID } from "../utilities/utils";
import { DOMObject, DOMObjectTag, ElementColumnBreakType } from "../dom_manager/domObject";
import { RegionManager } from "../dom_manager/regional_managers/regionManager";
import { SingleColumnRegionManager } from "../dom_manager/regional_managers/singleColumnRegionManager";
import { AutoLayoutRegionManager } from "../dom_manager/regional_managers/autoLayoutRegionManager";
import { MultiColumnStyleCSS, ObsidianStyleCSS } from "src/utilities/cssDefinitions";
import { isTasksPlugin } from "src/utilities/elementRenderTypeParser";
import { RegionErrorManager } from "src/dom_manager/regionErrorManager";
import { RegionType } from "src/utilities/interfaces";
import { parseColBreakErrorType } from "src/utilities/errorMessage";
import { checkForParagraphInnerColEndTag, containsColEndTag, findEndTagClosestToEnd } from "src/utilities/textParser";
import { getPreviewLeafFromFilePath } from "src/utilities/obsiUtils";
import { MCM_SettingsManager } from "src/pluginSettings";

const CACHE_MAX_DELTA_TIME_MS = 2 * 60 * 1000; // 2m

interface cacheData {
    timestamp: number,
    element: HTMLElement,
    regionManager: RegionManager,
    errorRootEl: HTMLDivElement,
    cacheSettings: MultiColumnSettings,
    pluginSettingsUpdateTimestamp: number
}

let livePreviewElementCache: Map<string, cacheData> = new Map()
async function clearCache(skipKey: string = "") {

    let index = -1;
    let keys = Array.from(livePreviewElementCache.keys())
    for(let key of keys) {
        index++

        if(key === skipKey) {
            // console.debug(`Element: ${index} | Skipping key: ${key.split(" : ")[0]}`)
            continue;
        }

        if(livePreviewElementCache.has(key) === false) {
            continue;
        } 

        let val = livePreviewElementCache.get(key)

        let deltaTimeMS = Date.now() - val.timestamp
        if((val.element.parentNode === null || val.element.parentNode.parentNode === null) && deltaTimeMS > CACHE_MAX_DELTA_TIME_MS) {
            // console.debug(`cache delta: ${deltaTimeMS} > ${CACHE_MAX_DELTA_TIME_MS} or 2 minutes.`)
            livePreviewElementCache.delete(key)
        }
        else if(val.element.parentNode == null || val.element.parentNode.parentNode === null) {
            
            // console.debug(`Element ${index} null but not removing from cache yet. \nElement file path: ${key.split(" : ")[0]} \nPath Elapsed time: ${Math.floor(deltaTimeMS / 1000)}`)
        }
    }
}

export class MultiColumnMarkdown_LivePreview_Widget extends WidgetType {

    contentData: string;
    tempParent: HTMLDivElement;
    domList: DOMObject[] = [];
    settingsText: string;
    regionSettings: MultiColumnSettings = getDefaultMultiColumnSettings();
    regionManager: RegionManager;
    sourceFile: TFile;
    sourcePath: string = "";
    elementCacheID: string;
    errorRootEl: HTMLDivElement;
    
    constructor(originalText: string, contentData: string, userSettings: MultiColumnSettings, sourceFile: TFile, settingsText: string = "", regionType: RegionType) {
        super();
        this.contentData = contentData;
        this.settingsText = settingsText;
        this.sourceFile = sourceFile;

        if(this.sourceFile === null) {
            return
        }
        this.elementCacheID = `${this.sourceFile.path} : ${this.contentData}`;

        if(this.sourceFile) {
            this.sourcePath = sourceFile.path;
        }

        if(userSettings !== null) {
            this.regionSettings = userSettings;
        }

        let errorManager = new RegionErrorManager(createDiv());
        if(regionType === "CODEBLOCK") {
            errorManager.addErrorMessage("The codeblock region start syntax has been depricated. Please manually update to the current syntax defined in the ReadMe, run the \"Fix Multi-Column Syntax in Current File\" from the Command Palette, or use the \"Update Depricated Syntax\" command found in the plugin settings window. You must reload the file for changes to take effect.")
        }

        (async () => {
            function hasBadContentBetween(contentBetween: string): boolean {

                let regexResult = new RegExp("((?: *\n){6,})").exec(contentBetween)
                if(regexResult !== null) {
                    // console.log("Found at least 6 empty lines.")
                    return false;
                }

                regexResult = /^(?:(?! *$)(?! *--- *$)).+$/mg.exec(contentBetween);
                if(regexResult !== null) {
                    return false;
                }

                return true;
            }

            let fileText = await sourceFile.vault.cachedRead(sourceFile);
            fileText = fileText.replace(originalText, "###--START_HERE--###")

            let regexResult = new RegExp("###--START_HERE--###").exec(fileText)
            if(regexResult === null) {
                return;
            }

            fileText = fileText.slice(0, regexResult.index);

            let nextStartTag = findEndTagClosestToEnd(fileText);
            if(nextStartTag.found === false) {
                return;
            }

            let errorString = hasBadContentBetween(fileText.slice(nextStartTag.endPosition))
            if(errorString === false) {
                return;
            }

            errorManager.addWarningMessage("Detected possible issue with the content between this region and the region above. \
            If you experience page jumping when clicking within this document, please make sure there are at least 6 blank \
            lines or some form of text content between the two regions. This is a known issue that is under investigation. Sorry for the inconvenience.")
        })();

        if(livePreviewElementCache.has(this.elementCacheID)) {
            let cache = livePreviewElementCache.get(this.elementCacheID)
            let regionManager = cache.regionManager
            let regionSettingsEqual = MCSettings_isEqual(userSettings, cache.cacheSettings)
            let pluginSettingsUpdated = MCM_SettingsManager.shared.lastUpdateTimestamp > cache.pluginSettingsUpdateTimestamp
            if(regionManager && regionSettingsEqual === true && pluginSettingsUpdated === false) {
                regionManager.updateErrorManager(errorManager, cache.errorRootEl);

                let useLivePreviewCache = MCM_SettingsManager.shared.useLivePreviewCache;
                let fileLeaf = getPreviewLeafFromFilePath(app.workspace, this.sourceFile.path)
                if(useLivePreviewCache && fileLeaf === null) {
                    return
                }
            }
            else {
                livePreviewElementCache.delete(this.elementCacheID);
            }
        }

        // Render the markdown content to our temp parent element.
        this.tempParent = createDiv();
        let elementMarkdownRenderer = new MarkdownRenderChild(this.tempParent);
        MarkdownRenderer.renderMarkdown(this.contentData, this.tempParent, this.sourcePath, elementMarkdownRenderer);

        let previousText = "";
        let workingText = originalText;
        // take all elements, in order, and create our DOM list.
        let arr = Array.from(this.tempParent.children);
        for (let i = 0; i < arr.length; i++) {

            let el = this.fixElementRender(arr[i]);

            let domObject = new DOMObject(el as HTMLElement, [""])
            this.domList.push(domObject);

            let newData = sliceWorkingTextToEl(domObject, previousText, workingText)
            previousText = newData.previousText;
            workingText = newData.workingText;

            newData = attemptToFixCheckboxes(domObject, previousText, workingText, sourceFile, this.elementCacheID)
            previousText = newData.previousText;
            workingText = newData.workingText;

            workingText = checkForColumnBreakErrors(domObject, previousText, workingText, errorManager)
        }

        // Set up the region manager data before then creating our region manager.
        let regionData: RegionManagerData = {
            domList: this.domList,
            domObjectMap: new Map<string, DOMObject>(),
            regionParent: createDiv(),
            fileManager: null,
            regionalSettings: this.regionSettings,
            regionKey: getUID(),
            rootElement: createDiv(),
            errorManager: errorManager
        };

        // Finally setup the type of region manager required.
        if (this.regionSettings.numberOfColumns === 1) {
            this.regionSettings = parseSingleColumnSettings(this.settingsText, this.regionSettings);
            this.regionManager = new SingleColumnRegionManager(regionData);
        }
        else if (this.regionSettings.autoLayout === true) {
            this.regionManager = new AutoLayoutRegionManager(regionData, true);
        }
        else {
            this.regionManager = new StandardMultiColumnRegionManager(regionData);
        }

        clearCache(this.elementCacheID)
    }

    fixElementRender(el: Element): Element {

        let fixedEl = fixImageRender(el, this.sourcePath);
        fixedEl = fixPDFRender(fixedEl, this.sourcePath);
        fixedEl = fixFileEmbed(fixedEl, this.sourcePath);
        fixedEl = fixTableRender(fixedEl);
        fixedEl = fixUnSupportedRender(fixedEl);
        return fixedEl;
    }

    toDOM() {

        let useLivePreviewCache = MCM_SettingsManager.shared.useLivePreviewCache;
        let fileLeaf = getPreviewLeafFromFilePath(app.workspace, this.sourceFile.path)
        if(useLivePreviewCache && 
            livePreviewElementCache.has(this.elementCacheID) &&
            fileLeaf === null) {
            return livePreviewElementCache.get(this.elementCacheID).element
        }

        // Create our element to hold all of the live preview elements.
        let el = document.createElement("div");
        el.className = "mcm-cm-preview";

        /**
         * For situations where we need to know the rendered height, AutoLayout, 
         * the element must be rendered onto the screen to get the info, even if 
         * only for a moment. Here we attempt to get a leaf from the app so we 
         * can briefly append our element, check any data if required, and then
         * remove it.
         */
        let autolayoutLeaf: WorkspaceLeaf = null;
        if (app) {
            let leaves = app.workspace.getLeavesOfType("markdown");
            if (leaves.length > 0) {
                autolayoutLeaf = leaves[0];
            }
        }

        if (this.regionManager) {

            this.errorRootEl = el.createDiv()
            let contentElement = el.createDiv()
            this.regionManager.getRegionData().errorManager.setRegionRootElement(this.errorRootEl)

            let requireUnload = false
            if (autolayoutLeaf && this.regionManager instanceof AutoLayoutRegionManager) {
                autolayoutLeaf.view.containerEl.appendChild(el);
                requireUnload = true
            }

            this.regionManager.renderRegionElementsToLivePreview(contentElement);
            for(let domObj of this.regionManager.getRegionData().domList) {
                fixListCSS(domObj.originalElement)
            }

            if (requireUnload) {
                autolayoutLeaf.view.containerEl.removeChild(el);
            }
        }

        fixExternalLinks(el)

        livePreviewElementCache.set(this.elementCacheID, {
            timestamp: Date.now(),
            element: el,
            regionManager: this.regionManager,
            errorRootEl: this.errorRootEl,
            cacheSettings: this.regionSettings,
            pluginSettingsUpdateTimestamp: MCM_SettingsManager.shared.lastUpdateTimestamp
        })

        return el;
    }

    fixElementCSS(domObject: DOMObject) {
        fixListCSS(domObject.originalElement);
    }
}

export class MultiColumnMarkdown_DefinedSettings_LivePreview_Widget extends WidgetType {

    contentData: string;

    constructor(contentData: string) {
        super();

        this.contentData = contentData;
    }

    toDOM() {
        // Create our element to hold all of the live preview elements.
        let el = document.createElement("div");
        el.className = "mcm-cm-settings-preview";

        let labelDiv = el.createDiv()
        let label = labelDiv.createSpan({
            cls: "mcm-col-settings-preview"
        })
        label.textContent = "Column Settings:";

        let list = el.createEl("ul")
        let lines = this.contentData.split("\n")
        for(let i = 1; i < lines.length - 1; i++) {
            let item = list.createEl("li")
            item.textContent = lines[i]
        }

        return el;
    }
}

const OBSIDIAN_LIVEPREVIEW_TABLE_CLASSES = "cm-embed-block markdown-rendered cm-table-widget show-indentation-guide"
function fixTableRender(el: Element): Element {

    if(el.tagName !== "TABLE") {
        return el;
    }

    let parentDiv = createDiv({
        "cls": OBSIDIAN_LIVEPREVIEW_TABLE_CLASSES
    })
    parentDiv.appendChild(el);
    return parentDiv;
}

function fixFileEmbed(el: Element, source: string): Element {

    let embed = getEmbed(el);
    if(embed === null) {
        return el;
    }

    let alt = embed.getAttr("alt")
    let src = embed.getAttr("src")
    if(src === null) {
        return el;
    }

    let file: TFile = app.metadataCache.getFirstLinkpathDest(src, source);
    if(file === null) {
        return el;
    }
    
    if(isMDExtension(file.extension) === false) {
        return el;
    }

    return createLPErrorElement("File embeds are not supported in Live Preview.\nPlease use reading mode to view.", alt, src);
}

function createLPErrorElement(errorText: string, alt: string = "", src: string = ""): HTMLDivElement {
    let errorEl = createDiv({
        cls: "internal-embed markdown-embed inline-embed is-loaded",
        attr: {
            "tabindex": "-1",
            "contenteditable": "false"
        }
    })
    errorEl.setAttr("alt", alt);
    errorEl.setAttr("src", `app://obsidian.md/${src}`)
    errorEl.appendChild(createDiv(
        {
            "cls": "embed-title markdown-embed-title",
        }
    ));
    let contentEl = errorEl.createDiv({
        "cls": `markdown-embed-content`,
    });
    let paragraph = contentEl.createEl("p", {
        "cls": `${MultiColumnStyleCSS.RegionErrorMessage}, ${MultiColumnStyleCSS.SmallFont}`
    });
    paragraph.innerText = errorText;

    return errorEl
}

function fixPDFRender(el: Element, source: string): Element {

    let embed = getEmbed(el);
    if(embed === null) {
        return el;
    }

    let alt = embed.getAttr("alt")
    let src = embed.getAttr("src")
    if(src === null) {
        return el;
    }

    let file: TFile = app.metadataCache.getFirstLinkpathDest(src, source);
    if(file === null) {
        return el;
    }
    
    if(isPDFExtension(file.extension) === false) {
        return el;
    }

    return createLPErrorElement("Due to an update to Obsidian's PDF viewer, PDF embeds are currently not supported.\nSorry for the inconvienence.", alt, src);
}

function fixImageRender(el: Element, source: string): Element {

    let embed = getEmbed(el);
    if(embed === null) {
        return el;
    }

    let customWidth = embed.attributes.getNamedItem("width")
    let alt = embed.getAttr("alt")
    let src = embed.getAttr("src")
    if(src === null) {
        return el;
    }

    let file: TFile = app.metadataCache.getFirstLinkpathDest(src, source);
    if(file === null) {
        return el;
    }
    
    // If the link source is not an image we dont want to make any adjustments.
    if(isImageExtension(file.extension) === false) {
        return el;
    }

    let fixedEl = createDiv({
        cls: "internal-embed image-embed is-loaded",
    })
    fixedEl.setAttr("alt", alt);

    let resourcePath = app.vault.getResourcePath(file);
    let image = fixedEl.createEl("img");
    image.setAttr("src", resourcePath);

    if(customWidth !== null) {
        image.setAttr("width", customWidth.value);
    }

    return fixedEl;
}

function fixExternalLinks(el: Element): Element {

    let items = el.getElementsByClassName("external-link");
    for(let linkEl of Array.from(items)) {

        let link = linkEl as HTMLElement;
        if(link === undefined ||
           link === null ) {
            continue;
        }

        // Remove the href from the link and setup an event listener to open the link in the default browser.
        let href = link.getAttr("href")
        link.removeAttribute("href");

        link.addEventListener("click", (ev) => {

            window.open(href); 
        });
    }

    items = el.getElementsByClassName("internal-link");
    for(let linkEl of Array.from(items)) {

        let link = linkEl as HTMLElement;
        if(link === undefined ||
           link === null ) {
            continue;
        }

        // Removing the href from internal links is all that seems to be required to fix the onclick.
        link.removeAttribute("href");
    }

    return el;
}

function getEmbed(el: Element): Element | null {

    // embeds can either be a <div class="internal-embed" or <p><div class="internal-embed"
    // depending on the syntax this additional check is to fix false negatives when embed is
    // the first case.
    if(el.hasClass("internal-embed")) {
        return el;
    }
    else {

        let items = el.getElementsByClassName("internal-embed");
        if(items.length === 1) {
            return items[0];
        }
    }

    return null;
}

function isImageExtension(extension: string): boolean {

    extension = extension.toLowerCase();
    switch(extension) {
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "bmp":
        case "svg":
        case "webp":
            return true;
    }
    return false;
}

function isPDFExtension(extension: string): boolean {
    return extension.toLowerCase() === "pdf";
}

function isMDExtension(extension: string): boolean {
    return extension.toLowerCase() === "md";
}

function fixListCSS(el: Element): Element {
    if(el.tagName !== "UL" && el.tagName !== "OL") {
        return el
    }
    el.parentElement?.addClass(ObsidianStyleCSS.RenderedMarkdown)
    return el;
}

function fixUnSupportedRender(el: Element): Element {

    if(isTasksPlugin(el as HTMLElement)) {

        if(MCM_SettingsManager.shared.renderInlineElErrors === true) {
            let fixedEl = createDiv()
            let paragraph = fixedEl.createEl("p", {
                "cls": `${MultiColumnStyleCSS.RegionErrorMessage} ${MultiColumnStyleCSS.SmallFont}`
            });
            paragraph.innerText = "The Tasks plugin is not supported in Live Preview.\nPlease use reading mode."
            return fixedEl;
        }
        return el;
    }

    return el;
}

function checkForColumnBreakErrors(domObject: DOMObject,
                                   previousText: string,
                                   workingText: string,
                                   errorManager: RegionErrorManager): string {

    if(domObject.tag !== DOMObjectTag.columnBreak &&
        domObject.elementIsColumnBreak === ElementColumnBreakType.none) {
        return workingText;
    }

    let prevLine = previousText.split("\n").slice(-2).join("\n")
    let checkText = workingText;
    if(checkForParagraphInnerColEndTag(prevLine)) {
        checkText = prevLine + workingText
    }

    let nextColBreak = checkForParagraphInnerColEndTag(checkText)
    if(nextColBreak === null) {
        console.error("Error. Something went wrong parsing column break out of text.")
        return workingText;
    }

    let startIndex = nextColBreak.index
    let matchLength = nextColBreak[0].length
    let endIndex = startIndex + matchLength
    let matchText = nextColBreak[0].trim();

    let newWorkingText = checkText.slice(endIndex)

    // Already parsed column break warning.
    if(domObject.elementIsColumnBreak !== ElementColumnBreakType.none) {

        parseColBreakErrorType({
            lineAbove: "",
            lineBelow: "",
            objectTag: DOMObjectTag.none,
            colBreakType: domObject.elementIsColumnBreak
        }, errorManager)

        return newWorkingText;
    }

    // Now we have a standard column break but due to changes in obsidian parsing may still 
    // require displaying an error message.
    let endTagText = domObject.originalElement.innerText

    // make sure the element text is a column break just to be sure. This really should never fail.
    if(containsColEndTag(endTagText) === false) {
        // If something went wrong here we can not proceed with the next regex unless this passes.
        console.error("Error parsing column-break tag back out of element text.", endTagText)
        return workingText;
    }

    // make sure the text of the element matche the syntax of what we parsed from the text.
    if(matchText !== endTagText) {
        console.error("Error matching next col-break to current element. Can not continue.")
        return workingText;
    }

    // Slice out the 20 characters before and after the column break and then get just
    // the one line before and after to check if error message required.
    let startIndexOffset = Math.clamp(startIndex - 20, 0, startIndex);
    let endIndexOffset = Math.clamp(endIndex + 20, endIndex, checkText.length - 1);
    
    let additionalText = checkText.slice(startIndexOffset, endIndexOffset);
    let textBefore = additionalText.slice(0, 20);
    let textAfter = additionalText.slice(20 + matchLength)
    textBefore = textBefore.replace(endTagText, "")

    let linesAbove = textBefore.split("\n").filter((val) => {
        return val !== ""
    })
    let linesBelow = textAfter.split("\n").filter((val) => {
        return val !== ""
    })
    if(linesAbove.length === 0 && linesBelow.length === 0) {
        return workingText
    }

    let lineAbove = linesAbove.last()
    let lineBelow = linesBelow.first()
    parseColBreakErrorType({
        lineAbove: lineAbove,
        lineBelow: lineBelow,
        objectTag: DOMObjectTag.columnBreak,
        colBreakType: ElementColumnBreakType.none
    }, errorManager)

    return newWorkingText
}

function sliceWorkingTextToEl(domObject: DOMObject, previousText: string, workingText: string): {previousText: string, workingText: string} {

    function processParagraph() {
        let regex = new RegExp(`^ *${escapeRegExp(domObject.originalElement.textContent)} *$`, "m")
        let result = regex.exec(workingText)
        if(result) {
            let updatedPrevious = previousText + workingText.slice(0, result.index);
            let updatedItemText = workingText.slice(result.index, result.index + result[0].length)
            let updatedWorkingText = workingText.slice(result.index)
            return { 
                previousText: updatedPrevious,
                workingText: updatedWorkingText
            };
        }
        return { 
            previousText: previousText,
            workingText: workingText
        };
    }

    function processHeader() {
        let count = parseInt(domObject.originalElement.tagName.slice(1))
        let text = '#'.repeat(count);

        let regex = new RegExp(`^${text} +${escapeRegExp(domObject.originalElement.textContent)} *$`, "m")

        let result = regex.exec(workingText)
        if(result) {
            let updatedPrevious = previousText + workingText.slice(0, result.index);
            let updatedItemText = workingText.slice(result.index, result.index + result[0].length)
            let updatedWorkingText = workingText.slice(result.index)
            return { 
                previousText: updatedPrevious,
                workingText: updatedWorkingText
            };
        }
        return { 
            previousText: previousText,
            workingText: workingText
        };
    }

    if(domObject.originalElement.tagName === "P") {
        return processParagraph();
    }

    if(domObject.originalElement.tagName === "H1" ||
       domObject.originalElement.tagName === "H2" ||
       domObject.originalElement.tagName === "H3" ||
       domObject.originalElement.tagName === "H4" ||
       domObject.originalElement.tagName === "H5") {
        return processHeader();
    }

    return {
        previousText: previousText,
        workingText: workingText
    }
}

function attemptToFixCheckboxes(domObject: DOMObject, textBeforeElement: string, textOfElementAndAfter: string, sourceFile: TFile, cacheID: string) {

    if(domObject.originalElement.tagName !== "UL") {
        return {
            previousText: textBeforeElement,
            workingText: textOfElementAndAfter
        }
    }
    if(domObject.originalElement.hasClass("contains-task-list") === false) {
        return {
            previousText: textBeforeElement,
            workingText: textOfElementAndAfter
        }
    }

    let listItems = Array.from(domObject.originalElement.getElementsByTagName("li")).filter((item) => {
        return item.hasClass("task-list-item")
    })

    let workingTextBefore = textBeforeElement;
    let workingText = textOfElementAndAfter;
    for(let listElement of listItems) {

        let possibleCheckbox = listElement.getElementsByTagName("input");
        if(possibleCheckbox.length !== 1) {
            console.error("Error: Could not get input for task item.")
            continue;
        }

        let checkbox = possibleCheckbox[0];
        if(checkbox.getAttr("type") !== "checkbox") {
            console.error("Error: Checkbox not of proper type");
            continue;
        }

        if(checkbox.hasClass("task-list-item-checkbox") === false) {
            console.error("Error: Checkbox is missing proper class.")
            continue;
        }

        if(checkbox.onclick !== null) {
            console.error("Error: OnClick aready defined, not overwriting method.");
            continue;
        }

        let checkboxIsChecked = listElement.getAttr("data-task") === "x" || listElement.getAttr("data-task") === "X"

        let checkboxTextRegexSearch = RegExp(`^( *)-( +)\\[${checkboxIsChecked ? "[xX]" : " *"}\\]( +)${escapeRegExp(listElement.innerText)}( *)$`, "m");
        let checkboxTextRegexResult = checkboxTextRegexSearch.exec(workingText);
        if(checkboxTextRegexResult === null) {
            console.error("Could not find text in provided document.");
            continue;
        }

        let startOfElementIndex = checkboxTextRegexResult.index
        let endOfElementIndex = startOfElementIndex + checkboxTextRegexResult[0].length
        let newTextAfter = workingText.slice(endOfElementIndex);
        let onClickNewTextAfter = newTextAfter;

        workingTextBefore = workingTextBefore + workingText.slice(0, startOfElementIndex);
        let onClickNewTextBefore = workingTextBefore;

        workingText = workingText.slice(startOfElementIndex)
        let onClickNewWorkingText = workingText;

        let spaceBeforeDash = checkboxTextRegexResult[1]
        let spaceAfterDash = checkboxTextRegexResult[2]
        let spaceAfterCheck = checkboxTextRegexResult[3]
        let spaceAfterContent = checkboxTextRegexResult[4]

        let currentCacheID = cacheID
        let sourceFilePath = sourceFile.path
        checkbox.onclick = () => {

            let replacementLine = `${spaceBeforeDash}-${spaceAfterDash}[${checkboxIsChecked ? " " : "X"}]${spaceAfterCheck}${listElement.innerText}${spaceAfterContent}`

            let originalTextToReplace = onClickNewTextBefore + onClickNewWorkingText
            let newReplacementText = onClickNewTextBefore + replacementLine + onClickNewTextAfter

            if(livePreviewElementCache.has(currentCacheID)) {
                let newCacheID = `${sourceFilePath} : ${newReplacementText}`;
                let currentData = livePreviewElementCache.get(currentCacheID);
                livePreviewElementCache.set(newCacheID, currentData)
                currentCacheID = newCacheID
            }

            (async () => {
                let fileText = await sourceFile.vault.read(sourceFile);
                if(fileText.contains(originalTextToReplace) === false) {
                    console.error("Could not update file. File does not contain region text.")
                    return;
                }

                let newFileText = fileText.replace(originalTextToReplace, newReplacementText)
                sourceFile.vault.modify(sourceFile, newFileText)
            })();

            listElement.classList.toggle("is-checked")
            if(checkboxIsChecked) {
                listElement.removeAttribute("data-task")
            }
            else {
                listElement.setAttribute("data-task", "x")
            }
            checkboxIsChecked = !checkboxIsChecked
        }
    }

    return {
        previousText: workingTextBefore,
        workingText: workingText
    }
}

function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
