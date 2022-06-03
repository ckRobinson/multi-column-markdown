/*
 * Filename: multi-column-markdown/src/domObject.ts
 * Created Date: Tuesday, February 1st 2022, 12:04:00 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { getUID } from "../utilities/utils";
import { ElementRenderType } from "../utilities/elementRenderTypeParser";
import { MultiColumnSettings } from "../regionSettings";

export enum DOMObjectTag {
    none,
    startRegion,
    regionSettings,
    columnBreak,
    endRegion
}

export class DOMObject {
    nodeKey: string;
    originalElement: HTMLElement;
    clonedElement: HTMLElement = null;
    UID: string;
    tag: DOMObjectTag;
    usingOriginalElement: boolean
    elementType: ElementRenderType = ElementRenderType.undefined;
    elementContainer: HTMLDivElement = null;
    elementRenderedHeight = 0;
    
    constructor(element: HTMLElement, 
                randomID:string = getUID(), 
                tag: DOMObjectTag = DOMObjectTag.none ) {
        this.nodeKey = element.innerText.trim();
        this.originalElement = element;
        this.UID = randomID;
        this.tag = tag;
        this.usingOriginalElement = false
    }

    setMainDOMElement(domElement: HTMLElement) {
        this.originalElement = domElement;
        this.usingOriginalElement = true
    }
}

export class DOMStartRegionObject extends DOMObject {

    regionElement: HTMLElement;

    constructor(baseDOMObject: DOMObject, regionElement: HTMLElement) {

        super(baseDOMObject.originalElement, baseDOMObject.UID, DOMObjectTag.startRegion);
        this.regionElement = regionElement;
    }
}

export class TaskListDOMObject extends DOMObject {

    originalCheckboxes: HTMLElement[] = [];

    constructor(baseDOMObject: DOMObject) {

        super(baseDOMObject.originalElement, baseDOMObject.UID, DOMObjectTag.startRegion);
    }

    checkboxClicked(index: number) {

        if(index < this.originalCheckboxes.length) {

            let originalInput = this.originalCheckboxes[index].firstChild as HTMLInputElement;
            originalInput.click();
        }
    }
}