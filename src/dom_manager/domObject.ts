/*
 * Filename: multi-column-markdown/src/domObject.ts
 * Created Date: Tuesday, February 1st 2022, 12:04:00 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { getUID } from "../utilities/utils";
import { ElementRenderType } from "../utilities/elementRenderTypeParser";
import { containsColEndTag, containsColSettingsTag, containsEndTag } from "src/utilities/textParser";

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
    linesOfElement: string[]

    constructor(element: HTMLElement,
                linesOfElement: string[],
                randomID:string = getUID(), 
                tag: DOMObjectTag = DOMObjectTag.none ) {
        this.nodeKey = element.innerText.trim();
        this.originalElement = element;
        this.UID = randomID;
        this.tag = tag;
        this.usingOriginalElement = false
        this.linesOfElement = linesOfElement;

        if(this.tag === DOMObjectTag.none) {
            this.setDomObjectTag()
        }
    }

    setMainDOMElement(domElement: HTMLElement) {
        this.originalElement = domElement;
        this.usingOriginalElement = true
    }

    private setDomObjectTag() {

        let elementTextSpaced = this.linesOfElement.reduce((prev, curr) => {
            return prev + "\n" + curr;
        });
        if(containsEndTag(this.originalElement.textContent) === true) {

            this.elementType = ElementRenderType.unRendered
            // el.addClass(MultiColumnStyleCSS.RegionEndTag)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
        }
        else if(containsColEndTag(elementTextSpaced) === true) {

            this.elementType = ElementRenderType.unRendered
            // el.addClass(MultiColumnStyleCSS.ColumnEndTag)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
        }
        else if(containsColSettingsTag(elementTextSpaced) === true) {

            this.elementType = ElementRenderType.unRendered
            // el.addClass(MultiColumnStyleCSS.RegionSettings)
            // regionalManager = regionalContainer.setRegionSettings(elementTextSpaced)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.regionSettings);
        }
    }
}

export class DOMStartRegionObject extends DOMObject {

    regionElement: HTMLElement;

    constructor(baseDOMObject: DOMObject, regionElement: HTMLElement) {

        super(baseDOMObject.originalElement, baseDOMObject.linesOfElement, baseDOMObject.UID, DOMObjectTag.startRegion);
        this.regionElement = regionElement;
    }
}

export class TaskListDOMObject extends DOMObject {

    originalCheckboxes: HTMLElement[] = [];

    constructor(baseDOMObject: DOMObject) {

        super(baseDOMObject.originalElement, baseDOMObject.linesOfElement, baseDOMObject.UID, DOMObjectTag.none);
    }

    checkboxClicked(index: number) {

        if(index < this.originalCheckboxes.length) {

            let originalInput = this.originalCheckboxes[index].firstChild as HTMLInputElement;
            originalInput.click();
        }
    }

    static checkForTaskListElement(domElement: DOMObject) {

        if(domElement.originalElement.getElementsByClassName("task-list-item").length > 0 ) {

            return new TaskListDOMObject(domElement);
        }

        return domElement;
    }
}