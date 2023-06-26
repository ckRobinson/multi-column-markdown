/*
 * Filename: multi-column-markdown/src/live_preview/MultiColumnMarkdown_Widget.ts
 * Created Date: Tuesday, August 16th 2022, 4:38:43 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { MarkdownRenderChild, MarkdownRenderer, TFile, WorkspaceLeaf } from "obsidian";
import { WidgetType } from "@codemirror/view";
import { getDefaultMultiColumnSettings, MultiColumnSettings } from "../regionSettings";
import { parseSingleColumnSettings } from "../utilities/settingsParser";
import { StandardMultiColumnRegionManager } from "../dom_manager/regional_managers/standardMultiColumnRegionManager";
import { RegionManagerData } from "../dom_manager/regional_managers/regionManagerContainer";
import { getUID } from "../utilities/utils";
import { DOMObject } from "../dom_manager/domObject";
import { RegionManager } from "../dom_manager/regional_managers/regionManager";
import { SingleColumnRegionManager } from "../dom_manager/regional_managers/singleColumnRegionManager";
import { AutoLayoutRegionManager } from "../dom_manager/regional_managers/autoLayoutRegionManager";
import { MultiColumnStyleCSS } from "src/utilities/cssDefinitions";
import { isButtonPlugin_CrossCompatibilty } from "src/utilities/elementRenderTypeParser";

export class MultiColumnMarkdown_LivePreview_Widget extends WidgetType {

    contentData: string;
    tempParent: HTMLDivElement;
    domList: DOMObject[] = [];
    settingsText: string;
    regionSettings: MultiColumnSettings = getDefaultMultiColumnSettings();
    regionManager: RegionManager;
    sourceFile: TFile;
    sourcePath: string = "";

    constructor(contentData: string, userSettings: MultiColumnSettings, sourceFile: TFile, settingsText: string = "") {
        super();
        this.contentData = contentData;
        this.settingsText = settingsText;
        this.sourceFile = sourceFile;
        if(this.sourceFile) {
            this.sourcePath = sourceFile.path;
        }

        if(userSettings !== null) {
            this.regionSettings = userSettings;
        }

        // Render the markdown content to our temp parent element.
        this.tempParent = createDiv();
        let elementMarkdownRenderer = new MarkdownRenderChild(this.tempParent);
        MarkdownRenderer.renderMarkdown(this.contentData, this.tempParent, this.sourcePath, elementMarkdownRenderer);

        // take all elements, in order, and create our DOM list.
        let arr = Array.from(this.tempParent.children);
        for (let i = 0; i < arr.length; i++) {

            let el = this.fixElementRender(arr[i]);
            this.domList.push(new DOMObject(el as HTMLElement, [""]));
        }

        // Set up the region manager data before then creating our region manager.
        let regionData: RegionManagerData = {
            domList: this.domList,
            domObjectMap: new Map<string, DOMObject>(),
            regionParent: createDiv(),
            fileManager: null,
            regionalSettings: this.regionSettings,
            regionKey: getUID(),
            rootElement: createDiv()
        };

        // Finally setup the type of region manager required.
        if (this.regionSettings.numberOfColumns === 1) {
            this.regionSettings = parseSingleColumnSettings(this.settingsText, this.regionSettings);
            this.regionManager = new SingleColumnRegionManager(regionData);
        }
        else if (this.regionSettings.autoLayout === true) {
            this.regionManager = new AutoLayoutRegionManager(regionData, 1);
        }
        else {
            this.regionManager = new StandardMultiColumnRegionManager(regionData);
        }
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
        let leaf: WorkspaceLeaf = null;
        if (app) {
            let leaves = app.workspace.getLeavesOfType("markdown");
            if (leaves.length > 0) {
                leaf = leaves[0];
            }
        }

        if (this.regionManager) {

            if (leaf) {
                leaf.view.containerEl.appendChild(el);
            }

            this.regionManager.renderRegionElementsToLivePreview(el);

            if (leaf) {
                leaf.view.containerEl.removeChild(el);
            }
        }

        fixExternalLinks(el)

        return el;
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

    // If we found the resource path then we update the element to be a proper PDF render.
    let fixedEl = createDiv({
        cls: "internal-embed markdown-embed inline-embed is-loaded",
        attr: {
            "tabindex": "-1",
            "contenteditable": "false"
        }
    })
    fixedEl.setAttr("alt", alt);
    fixedEl.setAttr("src", `app://obsidian.md/${src}`)
    fixedEl.appendChild(createDiv(
        {
            "cls": "embed-title markdown-embed-title",
        }
    ));
    let contentEl = fixedEl.createDiv({
        "cls": `markdown-embed-content`,
    });
    let paragraph = contentEl.createEl("p", {
        "cls": `${MultiColumnStyleCSS.RegionErrorMessage}, ${MultiColumnStyleCSS.SmallFont}`
    });
    paragraph.innerText = "File embeds are not supported in Live Preview.\nPlease use reading mode to view."

    return fixedEl;
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

    let resourcePath = app.vault.getResourcePath(file);

    // If we found the resource path then we update the element to be a proper PDF render.
    let fixedEl = createDiv({
        cls: "internal-embed pdf-embed is-loaded",
    })
    fixedEl.setAttr("alt", alt);

    let iframe = fixedEl.createEl("iframe", {
        "attr": {
            "style": "width: 100%; height: 100%;"
        }
    });
    iframe.setAttr("src", resourcePath);
    return fixedEl;
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

function fixUnSupportedRender(el: Element): Element {

    if(isButtonPlugin_CrossCompatibilty(el as HTMLElement)) {

        console.log("Got button.")
        let fixedEl = createDiv()
        let paragraph = fixedEl.createEl("p", {
            "cls": `${MultiColumnStyleCSS.RegionErrorMessage} ${MultiColumnStyleCSS.SmallFont}`
        });
        paragraph.innerText = "Buttons are not supported in Live Preview.\nPlease use reading mode."
        return fixedEl;
    }

    return el;
}