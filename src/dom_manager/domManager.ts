/*
 * File: multi-column-markdown/src/domManager.ts
 * Created Date: Saturday, January 30th 2022, 3:16:32 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { parseColumnSettings } from '../utilities/textParser';
import { DOMObject, DOMObjectTag } from './domObject';
import { MultiColumnSettings, ColumnLayout } from "../regionSettings";
import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from '../utilities/cssDefinitions';

export class GlobalDOMManager {
    managers: Map<string, FileDOMManager>;

    constructor() {
        this.managers = new Map();
    }

    public removeFileManagerCallback(key: string) {
        if(this.managers.has(key) === true) {
            this.managers.delete(key);
        }
    }

    public getFileManager(key: string) {

        let fileManager = null;
        if(this.managers.has(key) === true) {
            fileManager = this.managers.get(key);
        }
        else {
            fileManager = createFileDOMManager(this, key);
            this.managers.set(key, fileManager);
        }

        return fileManager;
    }

    public getAllFileManagers() {
        return Array.from(this.managers.values());
    }
}

export type FileDOMManager = {
    regionMap: Map<string, RegionDOMManager>,
    hasStartTag: boolean,
    createRegionalManager: (regionKey: string, rootElement: HTMLElement, errorElement: HTMLElement, renderRegionElement: HTMLElement) => RegionDOMManager
    getRegionalManager: (regionKey: string) => RegionDOMManager | null,
    getAllRegionalManagers: () => RegionDOMManager[],
    removeRegion: (regionKey: string) => void,
    setHasStartTag: () => void,
    getHasStartTag: () => boolean,
    getNumberOfRegions: () => number,
    checkKeyExists: (checkKey: string) => boolean
}
function createFileDOMManager(parentManager: GlobalDOMManager, fileKey: string): FileDOMManager {
    
    let regionMap: Map<string, RegionDOMManager> = new Map();
    let hasStartTag: boolean = false;

    function removeRegion(regionKey: string): void {

        let regionManager = regionMap.get(regionKey);
        if(regionManager) {
            regionManager.displayOriginalElements();
        }

        regionMap.delete(regionKey);
        
        if(regionMap.size === 0) {
            parentManager.removeFileManagerCallback(fileKey);
        }
    }

    function createRegionalManager(regionKey: string, rootElement: HTMLElement, errorElement: HTMLElement, renderRegionElement: HTMLElement): RegionDOMManager {

        //TODO: Use the error element whenever there is an error.

        let regonalManager = createRegionalDomManager(this, regionKey, rootElement, renderRegionElement);
        regionMap.set(regionKey, regonalManager);
        return regonalManager;
    }

    function getRegionalManager(regionKey: string): RegionDOMManager | null {

        let regonalManager = null;
        if(regionMap.has(regionKey) === true) {
            regonalManager = regionMap.get(regionKey);
        }

        return regonalManager;
    }

    function getAllRegionalManagers(): RegionDOMManager[] {

        return Array.from(regionMap.values());
    }

    function setHasStartTag() {
        hasStartTag = true;
    }

    function getHasStartTag() {
        return hasStartTag;
    }

    function getNumberOfRegions() {
        return regionMap.size
    }

    function checkKeyExists(checkKey: string) {
        return regionMap.has(checkKey);
    }

    return { regionMap: regionMap, 
        hasStartTag: hasStartTag,  
        createRegionalManager: createRegionalManager, 
        getRegionalManager: getRegionalManager,
        getAllRegionalManagers: getAllRegionalManagers,
        removeRegion: removeRegion, 
        setHasStartTag: setHasStartTag, 
        getHasStartTag: getHasStartTag,
        getNumberOfRegions: getNumberOfRegions,
        checkKeyExists: checkKeyExists
    }
}

export type MultiColumnRenderData = { 
    parentRenderElement: HTMLElement, 
    parentRenderSettings: MultiColumnSettings,
    domObjects: DOMObject[]
}

export class RegionDOMManager {

    domList: DOMObject[] = []
    public domObjectMap: Map<string, DOMObject> = new Map();
    regionParent: HTMLElement;
    regionKey: string;
    rootElement: HTMLElement;
    fileManager: FileDOMManager;
    regionalSettings: MultiColumnSettings = {numberOfColumns: 2, columnLayout: ColumnLayout.standard, drawBorder: true, drawShadow: true};

    constructor(fileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement, regionParent: HTMLElement) {
        this.regionParent = regionParent;
        this.regionKey = regionKey;
        this.rootElement = rootElement;
        this.fileManager = fileManager;
    }

    public addObject(siblingsAbove: HTMLDivElement, siblingsBelow: HTMLDivElement, obj: DOMObject): number {

        let prevObj = siblingsAbove.children[siblingsAbove.children.length - 1] as HTMLElement;
        let nextObj = siblingsBelow.children[0] as HTMLElement;

        let addAtIndex = siblingsAbove.children.length;

        let prevObjText = ""
        if(prevObj !== undefined) {
            
            prevObjText = prevObj.innerText;

            for(let i = this.domList.length - 1; i >= 0; i--) {
                if(this.domList[i].nodeKey === prevObj.innerText) {
                    addAtIndex = i + 1;
                    break;
                }
            }
        }

        let nextElIndex = addAtIndex;
        let nextObjText = ""
        if(nextObj !== undefined) {
            
            let foundNext = false;
            nextObjText = nextObj.innerText;
            
            for(let i = addAtIndex; i < this.domList.length; i++) {

                if(this.domList[i].nodeKey === nextObj.innerText.trim()) {
    
                    nextElIndex = i;
                    foundNext = true
                    break;
                }
            }
        }

        // console.log(" Prev: ", siblingsAbove.children[siblingsAbove.children.length - 1], "Adding: ", obj.element, " Next: ", siblingsBelow.children[0], "Overwriting:", this.domList.slice(addAtIndex, nextElIndex));

        this.domList.splice(addAtIndex, nextElIndex - addAtIndex, obj);
        this.domObjectMap.set(obj.UID, obj);

        // /**
        //  * Make a copy of the list to log, only because
        //  * console log updates its references with updates in memory.
        //  */
        // let x = this.domList.slice(0);
        // console.log(x);

        return addAtIndex;
    }

    public removeObject(objectUID: string): void {

        // /**
        //  * Make a copy of the list to log
        //  */
        // let x = domList.slice(0);
        // console.log(x);

        // Get the object by key, remove it from the map and then
        // from the list.
        let obj = this.domObjectMap.get(objectUID);
        this.domObjectMap.delete(objectUID);
        
        if(obj === undefined) {
            return;
        }

        if(this.domList.contains(obj)) {
            this.domList.remove(obj);
        }

        if(this.domList.length === 0) {
            this.fileManager.removeRegion(this.regionKey);
        }

        // x = domList.slice(0);
        // console.log(x);
    }

    public updateElementTag(objectUID: string, newTag: DOMObjectTag): void {

        let obj = this.domObjectMap.get(objectUID);
        let index = this.domList.indexOf(obj);
        if(index !== -1) {
            this.domList[index].tag = newTag;
        }
    }

    public setRegionalSettings(settingsText: string): void {
        this.regionalSettings = parseColumnSettings(settingsText);
    }

    /**
     * Creates an object containing all necessary information for the region
     * to be rendered to the preview pane.
     * 
     * @returns a MultiColumnRenderData object with the root DOM element, settings object, and 
     * all child objects in the order they should be rendered.
     */
    public getRegionRenderData(): MultiColumnRenderData {

        return { 
            parentRenderElement: this.regionParent, 
            parentRenderSettings: this.regionalSettings,
            domObjects: this.domList
        };
    }

    /**
     * This fuction is called when a start tag is removed from view meaning
     * our parent element storing the multi-column region is removed. It 
     * removes the CSS class from all of the elements so they will be
     * re-rendered in the preview window.
     */
    public displayOriginalElements() {

        
        for(let i = 0; i < this.domList.length; i++) {

            if(this.domList[i].originalElement) {
                this.domList[i].originalElement.removeClasses([MultiColumnStyleCSS.RegionEndTag,
                                                  MultiColumnStyleCSS.ColumnEndTag,
                                                  MultiColumnStyleCSS.RegionSettings,
                                                  MultiColumnStyleCSS.RegionContent]);
                if(this.domList[i].originalElement.parentElement) {
                    this.domList[i].originalElement.parentElement.removeChild(this.domList[i].originalElement)
                }                                                  
            }
        }
    }

    public getRootRegionElement(): HTMLElement {
        return this.rootElement;
    }

    public getID(): string {
        return this.regionKey
    }
}

function createRegionalDomManager(fileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement, renderRegionElement: HTMLElement): RegionDOMManager {
    return new RegionDOMManager(fileManager, regionKey, rootElement, renderRegionElement)
}