import { searchChildrenForNodeType } from "./utils";

export enum ElementRenderType {
    undefined,
    normalRender,
    specialRender,
    specialSingleElementRender,
    canvasRenderElement,
    unRendered
}

export function getElementRenderType(element: HTMLElement): ElementRenderType {

    /**
     * The Dataview plugin needs to be constantly checked if the clone should be
     * updated but should not always update the "dual render" aspect, so we add
     * a special case for that plugin and maybe others in the future.
     */
    if(hasDataview(element) === true) {
        return ElementRenderType.specialSingleElementRender;
    }

    /**
     * Some types of content are rendered in canvases which are not rendered properly
     * when we clone the original node. Here we are flagging the element as a canvas
     * element so we can clone the canvas to a copy element within the region.
     * 
     */
    if( hasDataviewJS(element) === true) {
        return ElementRenderType.canvasRenderElement;
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
    if(hasDiceRoller(element) === true ||
       hasCopyButton(element) === true ||
       hasAdmonitionFold(element) === true) {

        return ElementRenderType.specialRender
    }

    /**
     * This checks for special types of elements that should be rendered normally. Is
     * slightly redundant with next check but differentiates between types of ements 
     * being checked.
     */
    if(hasAdmonition(element) === true ||
       isIFrame(element) === true) {
        
        return ElementRenderType.normalRender
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

        return ElementRenderType.normalRender;
    }

    // If still nothing found we return other as the default response if nothing else found.
    return ElementRenderType.specialRender;
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

    let isDataview = element.getElementsByClassName("dataview").length !== 0;
    return isDataview;
}

function hasDataviewJS(element: HTMLElement) {

    let isDataviewJS = element.getElementsByClassName("block-language-dataviewjs").length !== 0;
    let canvas = searchChildrenForNodeType(element, "canvas");

    /**
     * This means only dataviewJS chart canvas elements should be rendered properly. Other canvases will 
     * need thier own case put in or the restriction removed after testing.
     */
    return canvas !== null && isDataviewJS 
}