/*
 * Filename: multi-column-markdown/src/domObject.ts
 * Created Date: Tuesday, February 1st 2022, 12:04:00 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { getUID } from "./utils";
import { MultiColumnSettings, ColumnLayout } from "./regionSettings";

export enum DOMObjectTag {
    none,
    startRegion,
    regionSettings,
    columnBreak,
    endRegion
}

export class DOMObject {
    nodeKey: string;
    element: HTMLElement;
    UID: string;
    tag: DOMObjectTag;

    constructor(nodeKey: string, element: HTMLElement, 
                randomID:string = getUID(), 
                tag: DOMObjectTag = DOMObjectTag.none ) {
        this.nodeKey = nodeKey;
        this.element = element;
        this.UID = randomID;
        this.tag = tag;
    }
}

export class DOMStartRegionObject extends DOMObject {

    regionElement: HTMLElement;

    constructor(baseDOMObject: DOMObject, regionElement: HTMLElement) {

        super(baseDOMObject.nodeKey, baseDOMObject.element, baseDOMObject.UID, DOMObjectTag.startRegion);
        this.regionElement = regionElement;
    }
}

export class DOMRegionSettingsObject extends DOMObject {

    regionSettings: MultiColumnSettings;

    constructor(baseDOMObject: DOMObject, regionSettings: MultiColumnSettings) {
        super(baseDOMObject.nodeKey, baseDOMObject.element, baseDOMObject.UID, DOMObjectTag.regionSettings);

        this.regionSettings = regionSettings;
    }
}