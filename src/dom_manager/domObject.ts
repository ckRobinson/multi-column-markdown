/*
 * Filename: multi-column-markdown/src/domObject.ts
 * Created Date: Tuesday, February 1st 2022, 12:04:00 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { getUID } from "../utilities/utils";
import { MultiColumnSettings } from "../regionSettings";

export enum DOMObjectTag {
    none,
    startRegion,
    regionSettings,
    columnBreak,
    endRegion
}

export enum ElementType {
    paragraph,
    heading,
    list,
    specialRender,
    normalRender
}

function getElementType(element: HTMLElement): ElementType {

    /**
     * Look for specific kinds of elements by their CSS class names here. These 
     * are going to be brittle links as they rely on other plugin definitions but
     * as this is only adding in extra compatability to the plugins defined here 
     * it should be ok.
     * 
     * These may be classes on one of the simple elements (such as a paragraph)
     * that we search for below so need to look for these first.
     */
    if(element.getElementsByClassName("dice-roller").length !== 0) {

        return ElementType.specialRender
    }

    if(element.getElementsByClassName("admonition").length !== 0) {
        return ElementType.normalRender
    }

    /**
     * If we didnt find a special element we want to check for simple elements
     * such as paragraphs or lists. In the current implementation we only set up
     * the special case for "specialRender" elements so this *should* be saving
     * some rendering time by setting these tags properly.
     */
    let innerHTML = element.innerHTML;
    if(innerHTML.startsWith("<p")) {

        return ElementType.paragraph;
    }
    else if(innerHTML.startsWith("<h1") || 
       innerHTML.startsWith("<h2") || 
       innerHTML.startsWith("<h3") || 
       innerHTML.startsWith("<h4") ||
       innerHTML.startsWith("<h5")) {

        return ElementType.heading;
    }
    else if(innerHTML.startsWith("<ul") || 
       innerHTML.startsWith("<ol")) {
        return ElementType.list;
    }
    
    // If still nothing found we return other as the default response if nothing else found.
    return ElementType.specialRender;
}

export class DOMObject {
    nodeKey: string;
    element: HTMLElement;
    UID: string;
    tag: DOMObjectTag;
    usingOriginalElement: boolean
    elementType: ElementType = ElementType.specialRender;
    specialElementContainer: HTMLElement = null;

    constructor(element: HTMLElement, 
                randomID:string = getUID(), 
                tag: DOMObjectTag = DOMObjectTag.none ) {
        this.nodeKey = element.innerText.trim();
        this.element = element;
        this.UID = randomID;
        this.tag = tag;
        this.usingOriginalElement = false
        this.elementType = getElementType(element);
    }

    setMainDOMElement(domElement: HTMLElement) {
        this.element = domElement;
        this.usingOriginalElement = true
    }
}

export class DOMStartRegionObject extends DOMObject {

    regionElement: HTMLElement;

    constructor(baseDOMObject: DOMObject, regionElement: HTMLElement) {

        super(baseDOMObject.element, baseDOMObject.UID, DOMObjectTag.startRegion);
        this.regionElement = regionElement;
    }
}

export class DOMRegionSettingsObject extends DOMObject {

    regionSettings: MultiColumnSettings;

    constructor(baseDOMObject: DOMObject, regionSettings: MultiColumnSettings) {
        super(baseDOMObject.element, baseDOMObject.UID, DOMObjectTag.regionSettings);

        this.regionSettings = regionSettings;
    }
}