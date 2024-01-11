/*
 * Filename: multi-column-markdown/src/domObject.ts
 * Created Date: Tuesday, February 1st 2022, 12:04:00 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { getUID } from "../utilities/utils";
import { ElementRenderType } from "../utilities/elementRenderTypeParser";
import { checkForParagraphInnerColEndTag, containsColEndTag, containsColSettingsTag, containsEndTag, containsStartTag, elInnerTextContainsColEndTag } from "src/utilities/textParser";

const UPDATE_TIMES: number[] = [125, 125, 250, 20000];
const MID_BREAK_ERROR_MESSAGE: string = "Detected invalid column break syntax.\nPlease make sure column break tags are not in the middle of a paragraph block"

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
    elementType: ElementRenderType = "undefined";
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
        var timingArray = UPDATE_TIMES
        let {requiresUpdate, timerIndex, updateTime} = checkIfTimingIsReadyForUpdate(timingArray, this.canvasElementUpdateTime, this.canvasTimerIndex)
        if(requiresUpdate === false){
            return false
        }
        this.canvasElementUpdateTime = updateTime;
        this.canvasTimerIndex = timerIndex
        return true
    }

    updateClonedElement(newClonedElement: HTMLElement) {

        this.clonedElement = newClonedElement;
        this.updateClonedElementTimer()
    }

    updateClonedElementTimer() {
        this.lastClonedElementUpdateTime = Date.now();
        this.updateTimerIndex = Math.clamp(this.updateTimerIndex + 1, 0, UPDATE_TIMES.length - 1);
    }

    private setDomObjectTag() {

        let elementTextSpaced = this.linesOfElement.reduce((prev, curr) => {
            return prev + "\n" + curr;
        });

        if(containsEndTag(this.originalElement.textContent) === true) {

            this.elementType = "unRendered";
            this.tag = DOMObjectTag.endRegion;
            // el.addClass(MultiColumnStyleCSS.RegionEndTag)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.endRegion);
        }
        else if(containsColEndTag(this.originalElement.textContent) === true || 
        (this.originalElement.innerHTML.startsWith("<mark>")) && elInnerTextContainsColEndTag(this.originalElement.textContent)) {

            this.elementType = "unRendered"
            this.tag = DOMObjectTag.columnBreak;
            // el.addClass(MultiColumnStyleCSS.ColumnEndTag)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
        }
        else if(containsStartTag(this.originalElement.textContent) === true) {

            this.elementType = "unRendered"
            this.tag = DOMObjectTag.startRegion;
            // el.addClass(MultiColumnStyleCSS.ColumnEndTag)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.columnBreak);
        }
        else if(containsColSettingsTag(elementTextSpaced) === true) {

            this.elementType = "unRendered"
            // el.addClass(MultiColumnStyleCSS.RegionSettings)
            // regionalManager = regionalContainer.setRegionSettings(elementTextSpaced)
            // regionalManager.updateElementTag(currentObject.UID, DOMObjectTag.regionSettings);
        }
    }

    checkForPrePostColumnBreak() {
        function replaceColBreak(text: string): string {

            let colBreakData = checkForParagraphInnerColEndTag(text);
            if(containsColumnBreak === null) {
                return text;
            }

            let startIndex = colBreakData.index;
            let endIndex = startIndex + colBreakData[0].length;
            let pre = text.slice(0, startIndex);
            let post = text.slice(endIndex);

            return `${pre}${post}`;
        }

        let textOfElement = this.originalElement.innerText;
        let containsColumnBreak = checkForParagraphInnerColEndTag(textOfElement);
        if(containsColumnBreak !== null) {

            let text = this.originalElement.innerText;
            let startIndex = containsColumnBreak.index;
            let endIndex = startIndex + containsColumnBreak[0].length;
            let pre = text.slice(0, startIndex);
            let post = text.slice(endIndex)

            // Sometimes the element passed in is a DIV containing a child element, other
            // times it is the root child element alone, here we just make sure we are accessing
            // the right element we want.
            let checkNode = this.originalElement;
            if(this.originalElement.nodeName === "DIV") {
                checkNode = this.originalElement.children[0] as HTMLElement;
            }

            let paragraph = null;
            if(checkNode.nodeName === "P") {

                // Paragraphs simply remove the col-break tag
                // we set our element here incase we need to display an error.
                paragraph = checkNode;
                checkNode.innerText = `${pre}${post}`;
            }
            else if(checkNode.nodeName === "UL" || checkNode.nodeName === "OL") {

                // Attempt to get the list item that contains the column break,
                // From testing this code should only run when the column break is at the end
                // of a list not at the start of the list.
                let listItem = null;
                for(let i = checkNode.children.length - 1; i >= 0; i--) {
                    if(checkNode.children[i].nodeName === "LI") {
                        listItem = checkNode.children[i];
                        break;
                    }
                }

                if(listItem !== null) {

                    // Replace, the list element HTML without the col-break text.
                    (listItem as HTMLElement).innerHTML = replaceColBreak((listItem as HTMLElement).innerHTML);
                }
            }
            else {
                console.debug(`Element Type: ${checkNode.nodeName}, does not currently support appened column-breaks.`, checkNode.cloneNode(true));
                // if(paragraph) {
                //     paragraph.innerText = `${pre}${post}`;
                // }
            }

            // console.debug("Checking where column break is", startIndex, endIndex, text.length);
            if(startIndex === 0) {
                // console.debug("Column break at begining of element.")
                this.elementIsColumnBreak = ElementColumnBreakType.preBreak;
            }
            else if(endIndex === text.length) {
                // console.debug("Column break at end of element.")
                this.elementIsColumnBreak = ElementColumnBreakType.postBreak;
            }
            else {
                // console.debug("Column break in the middle of element?")
                this.elementIsColumnBreak = ElementColumnBreakType.midBreak;

                const ERROR_COLOR_CSS = "mcm-error-message-color";
                const CENTER_ALIGN_SPAN_CSS = "mcm-span-content-alignment-center";
                if(paragraph) {
                    paragraph.innerHTML = `${pre}\n<span class="${ERROR_COLOR_CSS} ${CENTER_ALIGN_SPAN_CSS}">${MID_BREAK_ERROR_MESSAGE}</span>\n\n${post}`.split("\n").join("<br>");

                }
            }
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
            // else {
            //     console.error("Could not find checkbox to click.")
            // }
        }
    }

    getCheckboxElement(index: number): HTMLInputElement | undefined {


        if(this.checkboxElements.has(index) === false) {

            if(index < this.originalCheckboxes.length) {

                let originalInput = this.originalCheckboxes[index]?.getElementsByClassName('task-list-item-checkbox')
                if(originalInput?.length >= 1) {

                    this.checkboxElements.set(index, (originalInput[0] as HTMLInputElement))
                }
                // else {
                //     console.error("Could not find checkbox element to return.", this.originalCheckboxes, index);
                // }
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

function checkIfTimingIsReadyForUpdate(timingArray: number[], canvasElementUpdateTime: number, canvasTimerIndex: number) {
    let deltaTime = Date.now() - canvasElementUpdateTime
    if(deltaTime > timingArray[canvasTimerIndex]) {
        canvasElementUpdateTime = Date.now();
        canvasTimerIndex = Math.clamp(canvasTimerIndex + 1, 0, UPDATE_TIMES.length - 1);
        return {
            requiresUpdate: true,
            updateTime: canvasElementUpdateTime,
            timerIndex: canvasTimerIndex,
        }
    }

    return {
        requiresUpdate: false,
        updateTime: canvasElementUpdateTime,
        timerIndex: canvasTimerIndex
    }
}