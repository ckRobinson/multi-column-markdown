/*
 * Filename: multi-column-markdown/src/domObject.ts
 * Created Date: Tuesday, February 1st 2022, 12:04:00 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { getUID } from "../utilities/utils";
import { ElementRenderType } from "../utilities/elementRenderTypeParser";
import { containsColEndTag, containsColSettingsTag, containsEndTag, containsStartTag, elInnerTextContainsColEndTag } from "src/utilities/textParser";

const CLONE_UPDATE_TIMES: number[] = [250, 20000];

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

    lastClonedElementUpdateTime: number = Date.now();
    updateTimerIndex = 0;

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

    clonedElementReadyForUpdate(): boolean {

        let deltaTime = Date.now() - this.lastClonedElementUpdateTime;
        if(deltaTime > CLONE_UPDATE_TIMES[this.updateTimerIndex]) {

            return true;
        }

        return false;
    }

    updateClonedElement(newClonedElement: HTMLElement) {

        this. clonedElement = newClonedElement;

        this.lastClonedElementUpdateTime = Date.now();
        this.updateTimerIndex = Math.clamp(this.updateTimerIndex + 1, 0, CLONE_UPDATE_TIMES.length - 1);
    }

    private setDomObjectTag() {

        let elementTextSpaced = this.linesOfElement.reduce((prev, curr) => {
            return prev + "\n" + curr;
        });

        if(containsEndTag(this.originalElement.textContent) === true) {

            this.elementType = ElementRenderType.unRendered;
            this.tag = DOMObjectTag.endRegion;
            // el.addClass(MultiColumnStyleCSS.RegionEndTag)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
        }
        else if(containsColEndTag(this.originalElement.textContent) === true || 
        (this.originalElement.innerHTML.startsWith("<mark>")) && elInnerTextContainsColEndTag(this.originalElement.textContent)) {

            this.elementType = ElementRenderType.unRendered
            this.tag = DOMObjectTag.columnBreak;
            // el.addClass(MultiColumnStyleCSS.ColumnEndTag)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
        }
        else if(containsStartTag(this.originalElement.textContent) === true) {

            this.elementType = ElementRenderType.unRendered
            this.tag = DOMObjectTag.startRegion;
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