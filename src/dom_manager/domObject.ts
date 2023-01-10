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

const UPDATE_TIMES: number[] = [125, 125, 250, 20000];

export enum DOMObjectTag {
    none,
    startRegion,
    regionSettings,
    columnBreak,
    endRegion
}

export enum ElementColumnBreakType {
    none = 0,
    preBreak,
    postBreak,
    midBreak
}

export class DOMObject {
    nodeKey: string;
    originalElement: HTMLElement;
    clonedElement: HTMLElement = null;
    UID: string;
    tag: DOMObjectTag;
    elementIsColumnBreak: ElementColumnBreakType = ElementColumnBreakType.none;
    usingOriginalElement: boolean
    elementType: ElementRenderType = ElementRenderType.undefined;
    elementContainer: HTMLDivElement = null;
    elementRenderedHeight = 0;
    linesOfElement: string[]

    canvasElementUpdateTime: number = Date.now();
    canvasTimerIndex = 0;

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

        // If our tag is still none here, we now want to check for
        // an in paragraph column break flag.
        if(this.tag === DOMObjectTag.none) {
            this.checkForPrePostColumnBreak()
        }
    }

    setMainDOMElement(domElement: HTMLElement) {
        this.originalElement = domElement;
        this.usingOriginalElement = true
    }

    clonedElementReadyForUpdate(): boolean {

        let deltaTime = Date.now() - this.lastClonedElementUpdateTime;
        if(deltaTime > UPDATE_TIMES[this.updateTimerIndex]) {

            return true;
        }

        return false;
    }

    canvasReadyForUpdate(): boolean {

        let deltaTime = Date.now() - this.canvasElementUpdateTime
        if(deltaTime > UPDATE_TIMES[this.canvasTimerIndex]) {

            this.canvasElementUpdateTime = Date.now();
            this.canvasTimerIndex = Math.clamp(this.canvasTimerIndex + 1, 0, UPDATE_TIMES.length - 1);
            return true;
        }

        return false;
    }

    updateClonedElement(newClonedElement: HTMLElement) {

        this.clonedElement = newClonedElement;

        this.lastClonedElementUpdateTime = Date.now();
        this.updateTimerIndex = Math.clamp(this.updateTimerIndex + 1, 0, UPDATE_TIMES.length - 1);
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

    checkForPrePostColumnBreak() {
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
    checkboxElements: Map<number, HTMLInputElement> = new Map();
    constructor(baseDOMObject: DOMObject) {

        super(baseDOMObject.originalElement, baseDOMObject.linesOfElement, baseDOMObject.UID, DOMObjectTag.none);
    }

    checkboxClicked(index: number) {

        if(this.checkboxElements.has(index)) {
            this.checkboxElements.get(index).click();
        }

        if(index < this.originalCheckboxes.length) {

            let originalInput = this.originalCheckboxes[index].getElementsByClassName('task-list-item-checkbox')
            if(originalInput.length === 1) {
                (originalInput[0] as HTMLInputElement).click();
            }
            else {
                console.error("Could not find checkbox to click.")
            }
        }
    }

    getCheckboxElement(index: number): HTMLInputElement | undefined {


        if(this.checkboxElements.has(index) === false) {

            if(index < this.originalCheckboxes.length) {

                let originalInput = this.originalCheckboxes[index]?.getElementsByClassName('task-list-item-checkbox')
                if(originalInput?.length === 1) {

                    this.checkboxElements.set(index, (originalInput[0] as HTMLInputElement))
                }
                else {
                    console.error("Could not find checkbox element to return.", this.originalCheckboxes, index);
                }
            }
        }
        return this.checkboxElements.get(index);
    }

    static checkForTaskListElement(domElement: DOMObject) {

        if(domElement.originalElement.getElementsByClassName("task-list-item").length > 0 ) {

            return new TaskListDOMObject(domElement);
        }

        return domElement;
    }

    static getChildCheckbox(el: HTMLElement): HTMLElement {

        let checkboxElements = el.getElementsByClassName('task-list-item-checkbox')
        if(checkboxElements.length === 1) {

            return checkboxElements[0] as HTMLElement;
        }
        
        return el.children[0] as HTMLElement
    }
}