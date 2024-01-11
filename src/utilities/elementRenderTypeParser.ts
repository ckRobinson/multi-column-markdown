/**
 * File: /src/utilities/elementRenderTypeParser.ts                             *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2023 Cameron Robinson                                         *
 */

import { searchChildrenForNodeType } from "./utils";

const ALL_ELEMENT_RENDER_TYPES = [
    "undefined",
    "basicElement",
    "specialRender",
    "buttonPlugin",
    "dataviewPlugin",
    "imageEmbed",
    "admonitionFold",
    "calloutCopyButton",
    "internalEmbed",
    "dataviewJSCanvasEmbed",
    "dataviewJSEmbed",
    "dataviewInlineQuery",
    "diceRoller",
    "admonition",
    "customFramePlugin",
    "iFrameEmbed",
    "tasksPlugin",
    "unRendered",
    "pdfEmbed"
] as const;
export type ElementRenderType = typeof ALL_ELEMENT_RENDER_TYPES[number];

export function getElementRenderType(element: HTMLElement): ElementRenderType {

    if(isEmbededImage(element) === true) {
        return "imageEmbed"
    }

    if(isButtonPlugin_CrossCompatibilty(element) === true) {
        return "buttonPlugin"
    }

    if(isTasksPlugin(element) === true) {
        return "tasksPlugin"
    }

    /**
     * The Dataview plugin needs to be constantly checked if the clone should be
     * updated but should not always update the "dual render" aspect, so we add
     * a special case for that plugin and maybe others in the future.
     */
    if(hasDataview(element) === true) {
        return "dataviewPlugin"
    }
    else if(isPDFEmbed(element)) {
        return "pdfEmbed"
    }
    else if(isInternalEmbed(element)) {
        return "internalEmbed"
    }

    /**
     * Some types of content are rendered in canvases which are not rendered properly
     * when we clone the original node. Here we are flagging the element as a canvas
     * element so we can clone the canvas to a copy element within the region.
     * 
     */
    if( hasDataviewJSCanvas(element) === true) {
        return "dataviewJSCanvasEmbed"
    }
    if( hasDataviewJS(element) === true) {
        return "dataviewJSEmbed"
    }
    if(hasDataviewInline(element) === true) {
        return "dataviewInlineQuery"
    }

    /**
     * Look for specific kinds of elements by their CSS class names here. These 
     * are going to be brittle links as they rely on other plugin definitions but
     * as this is only adding in extra compatability to the plugins defined here 
     * it should be ok.
     * 
     * These may be classes on one of the simple elements (such as a paragraph)
     * that we search for below so need to look for these first.
     */
    if(hasDiceRoller(element) === true) {
        return "diceRoller"
    }
    else if(hasCopyButton(element) === true) {
        return "calloutCopyButton"
    }
    else if(hasAdmonitionFold(element) === true) {
        return "admonitionFold"
    }

    /**
     * This checks for special types of elements that should be rendered normally. Is
     * slightly redundant with next check but differentiates between types of ements 
     * being checked.
     */
    if(hasAdmonition(element) === true) {
        return "admonition"
    }
    else if (isIFrame(element) === true) {

        return "iFrameEmbed"
    }
    else if(isCustomIFrame(element) === true) {
        
        return "customFramePlugin"
    }

    /**
     * If we didnt find a special element we want to check for simple elements
     * such as paragraphs or lists. In the current implementation we only set up
     * the special case for "specialRender" elements so this *should* be saving
     * some rendering time by setting these tags properly.
     */
    if(hasParagraph(element) || 
       hasHeader(element)    ||
       hasList(element) ||
       isHorizontalRule(element) ||
       isTable(element)) {

        return "basicElement"
    }

    // If still nothing found we return other as the default response if nothing else found.
    return "specialRender"
}

function hasParagraph(element: HTMLElement): boolean {
    return element.innerHTML.startsWith("<p");
}

export function hasHeader(element: HTMLElement): boolean {

    if(element.innerHTML.startsWith("<h1") || 
       element.innerHTML.startsWith("<h2") || 
       element.innerHTML.startsWith("<h3") || 
       element.innerHTML.startsWith("<h4") ||
       element.innerHTML.startsWith("<h5") ||
       element.innerHTML.startsWith("<h6")) {

        return true;
    }

    return false;
}

function hasList(element: HTMLElement): boolean {
    
    if(element.innerHTML.startsWith("<ul") || 
       element.innerHTML.startsWith("<ol")) {
        return true;
    }

    return false;
}

function hasCopyButton(element: HTMLElement): boolean {
    return element.getElementsByClassName("copy-code-button").length !== 0 || 
            element.getElementsByClassName("admonition-content-copy").length !== 0;
}

function hasDiceRoller(element: HTMLElement): boolean {
    return element.getElementsByClassName("dice-roller").length !== 0;
}

function hasAdmonition(element: HTMLElement): boolean {
    return element.getElementsByClassName("admonition").length !== 0;
}

function isIFrame(element: HTMLElement): boolean {

    if(element.children.length > 0) {

        return element.firstChild.nodeName.toLowerCase() === "iframe";
    }

    return false
}

export function isTasksPlugin(element: HTMLElement): boolean {    
    return element.hasClass("block-language-tasks") || 
    element.getElementsByClassName("block-language-tasks").length !== 0
}

function isHorizontalRule(element: HTMLElement): boolean {
    return element.innerHTML.startsWith("<hr")
}

function isTable(element: HTMLElement): boolean {
    return element.innerHTML.startsWith("<table")
}

function hasAdmonitionFold(element: HTMLElement) {
    return element.getElementsByClassName("callout-fold").length !== 0;
}

function hasDataview(element: HTMLElement) {

    let isDataview = element.getElementsByClassName("block-language-dataview").length !== 0;
    return isDataview;
}

function hasDataviewInline(element: HTMLElement) {
    let isDataview = element.getElementsByClassName("dataview-inline-query").length !== 0;
    return isDataview;
}

function hasDataviewJSCanvas(element: HTMLElement) {

    let isDataviewJS = element.getElementsByClassName("block-language-dataviewjs").length !== 0;
    let canvas = searchChildrenForNodeType(element, "canvas");

    /**
     * This means only dataviewJS chart canvas elements should be rendered properly. Other canvases will 
     * need thier own case put in or the restriction removed after testing.
     */
    return canvas !== null && isDataviewJS 
}

function hasDataviewJS(element: HTMLElement) {

    let isDataviewJS = element.getElementsByClassName("block-language-dataviewjs").length !== 0;
    return isDataviewJS 
}

function isInternalEmbed(element: HTMLElement) {
    let isEmbed = element.getElementsByClassName("internal-embed").length !== 0;
    return isEmbed;
}

function isPDFEmbed(element: HTMLElement): boolean {
    let isPDFEmbed = element.getElementsByClassName("pdf-embed").length !== 0;
    return isPDFEmbed;
}

export function getHeadingCollapseElement(element: HTMLElement): Element | null {

    if(element === null) {
        return null;
    }

    let childElements = element.getElementsByClassName("heading-collapse-indicator")
    if(childElements.length === 1) {
        return childElements[0];
    }
    if(childElements.length > 1) {
        // console.debug("Found multiple heading collapse indicators in element.")
    }
    return null;
}

function isCustomIFrame(element: HTMLElement) {
    let isFrame = element.getElementsByClassName("custom-frames-frame").length !== 0;
    return isFrame;
}

export function isButtonPlugin_CrossCompatibilty(element: HTMLElement) {

    if(element.hasClass("block-language-button")) {
        return true;
    }

    let buttonPluginBlock = element.getElementsByClassName("block-language-button")[0];
    if(buttonPluginBlock) {
        return true;
    }

    return false;
}

function isEmbededImage(element: HTMLElement): boolean {
    
    let img = element.getElementsByTagName("img")[0];
    if(img === null || 
       img === undefined) {

        return false;
    }
    return true;
}