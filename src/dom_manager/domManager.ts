/*
 * File: multi-column-markdown/src/domManager.ts
 * Created Date: Saturday, January 30th 2022, 3:16:32 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { parseColumnSettings } from '../utilities/textParser';
import { DOMObject, DOMStartRegionObject, DOMRegionSettingsObject, DOMObjectTag } from './domObject';
import { MultiColumnSettings, ColumnLayout } from "../regionSettings";

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
}

export type FileDOMManager = {
    regionMap: Map<string, RegionDOMManager>,
    createRegionalManager: (regionKey: string, errorElement: HTMLElement, regionElement: HTMLElement) => RegionDOMManager
    getRegionalManager: (regionKey: string) => RegionDOMManager | null,
    removeRegion: (regionKey: string) => void
}
function createFileDOMManager(parentManager: GlobalDOMManager, fileKey: string): FileDOMManager {
    
    let regionMap: Map<string, RegionDOMManager> = new Map();

    function removeRegion(regionKey: string): void {

        regionMap.delete(regionKey);
        
        if(regionMap.size === 0) {
            parentManager.removeFileManagerCallback(fileKey);
        }
    }

    function createRegionalManager(regionKey: string, errorElement: HTMLElement, regionElement: HTMLElement) {

        //TODO: Use the error element to display a warning when the region key is not defined.

        let regonalManager = createRegionalDomManager(this, regionKey, regionElement);
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

    return { regionMap: regionMap, createRegionalManager: createRegionalManager, getRegionalManager: getRegionalManager, removeRegion: removeRegion }
}

export type startRegionParent = { 
    parentRenderElement: HTMLElement, 
    parentRenderSettings: MultiColumnSettings
}

export type RegionDOMManager = {

    getDomList: () => DOMObject[]
    addObject: (siblingsAbove: HTMLDivElement, obj: DOMObject) => number,
    removeObject: (objectKey: string) => void,
    getRegionFromStartTagIndex: (startingIndex: number) => { domObjects: DOMObject[], endRegionIndex: number },
    updateElementTag: (objectUID: string, newTag: DOMObjectTag) => void,
    setElementToStartRegion: (objectUID: string, renderColumnRegion: HTMLElement) => DOMStartRegionObject,
    setElementToSettingsBlock: (objectUID: string, settingsText: string) => void,
    getRegionParent: () => startRegionParent
}

export function createRegionalDomManager(fileManager: FileDOMManager, regionKey: string, startRegionElement: HTMLElement): RegionDOMManager {

    /**
     * We use a list and a map to help keep track of the objects. Requires
     * more memory but makes processing things a little cleaner and presumably
     * faster.
     * 
     * Use the map to look up object by key and the list is used to track objects
     * in the order they are in the document.
     */
    let domList: DOMObject[] = []
    let domObjectMap: Map<string, DOMObject> = new Map();
    let regionParent: HTMLElement = startRegionElement;

    function addObject(siblingsAbove: HTMLDivElement, obj: DOMObject): number {

        let addAtIndex = siblingsAbove.children.length;

        // console.log("Attempting to add:", obj, `at index: ${addAtIndex}`);

        domList.splice(addAtIndex, 0, obj);
        domObjectMap.set(obj.UID, obj);

        // /**
        //  * Make a copy of the list to log, only because
        //  * console log updates its references with updates in memory.
        //  */
        // let x = domList.slice(0);
        // console.log(x);

        return addAtIndex;
    }

    function removeObject(objectUID: string): void {

        // /**
        //  * Make a copy of the list to log
        //  */
        // let x = domList.slice(0);
        // console.log(x);

        // Get the object by key, remove it from the map and then
        // from the list.
        let obj = domObjectMap.get(objectUID);
        domObjectMap.delete(objectUID);
        
        domList.remove(obj);

        if(domList.length === 0) {
            fileManager.removeRegion(regionKey);
        }

        // x = domList.slice(0);
        // console.log(x);
    }

    function getRegionFromStartTagIndex(startingIndex: number): { domObjects: DOMObject[], endRegionIndex: number } {

        /**
         * If we don't find an end tag we just use the rest of the document
         * as the end of the region.
         * 
         * TODO: Error checking on starting index and array size.
         */
        
        // Make a copy of the list that we can edit when performing the search.
        let domCopy = domList.slice(0);
        let endTagIndex = domCopy.length - 1;
        let removeIndicies: number[] = []
        for(let i = startingIndex; i < domCopy.length; i++) {

            /** 
             * This is a "Hacky" way to make sure we don't render
             * multiple regions within the same region. Currently
             * this solves the bug that items are removed AFTER
             * the post processing is done so the extra start
             * tags are being included in the render list.
             */
            if(domCopy[i].tag === DOMObjectTag.startRegion) {
                // console.log("Adding item to remove indicies.")
                removeIndicies.push(i);
            }
            else if(domCopy[i].tag === DOMObjectTag.endRegion) {

                // console.log(`Found end tag at index: ${i} text: ${domCopy[i].nodeKey}`)
                endTagIndex = i;
                break;
            }
        }
        for(let i = 0; i < removeIndicies.length; i++) {
            domCopy.splice(removeIndicies[i], 1);
        }
        
        let regionList = domCopy.slice(startingIndex, endTagIndex - removeIndicies.length + 1);
        // console.log("Setting up markdown with:", regionList);

        return { domObjects: regionList, endRegionIndex: endTagIndex }
    }

    function getDomList(): DOMObject[] {
        return domList.slice(0);
    }

    function updateElementTag(objectUID: string, newTag: DOMObjectTag): void {

        let obj = domObjectMap.get(objectUID);
        let index = domList.indexOf(obj);
        if(index !== -1) {
            domList[index].tag = newTag;
        }
    }

    function setElementToStartRegion(objectUID: string, renderColumnRegion: HTMLElement): DOMStartRegionObject {
        
        let startRegionObj: DOMStartRegionObject = null;
        let obj = domObjectMap.get(objectUID);
        let index = domList.indexOf(obj);
        if(index !== -1) {
            startRegionObj = new DOMStartRegionObject(domList[index], renderColumnRegion)
        
            domObjectMap.set(startRegionObj.UID, startRegionObj);
            domList[index] = startRegionObj;

        }

        return startRegionObj;
    }

    function setElementToSettingsBlock(objectUID: string, settingsText: string): void {
        

        let obj = domObjectMap.get(objectUID);
        let index = domList.indexOf(obj);
        if(index !== -1) {
            let settings: MultiColumnSettings = parseColumnSettings(settingsText);
            let regionSettingsObj: DOMRegionSettingsObject = new DOMRegionSettingsObject(domList[index], settings);
            
            domObjectMap.set(regionSettingsObj.UID, regionSettingsObj);
            domList[index] = regionSettingsObj;
        }
    }

    function getRegionParent(): startRegionParent {

        let regionSettings: MultiColumnSettings = {numberOfColumns: 2, columnLayout: ColumnLayout.standard, drawBorder: true, drawShadow: true};

        /**
         * Iterate over the list backwards searching for an item with the start
         * tag. If we find a end tag first we return null and if we find a 
         * settings tag we save the settings as those will be used to render the
         * region.
         */
        for(let i = 0; 1 < 3; i++) {
            
            if(domList.length <= i) {
                break;
            }

            if(domList[i].tag === DOMObjectTag.endRegion) {
                break;
            }
            else if(domList[i].tag === DOMObjectTag.regionSettings) {
                
                let regionSettingsObj: DOMRegionSettingsObject = domList[i] as DOMRegionSettingsObject;
                regionSettings = regionSettingsObj.regionSettings;
            }
        }
        
        return { 
            parentRenderElement: regionParent, 
            parentRenderSettings: regionSettings
        };
    }

    return { getDomList: getDomList, 
             addObject: addObject, 
             removeObject: removeObject, 
             getRegionFromStartTagIndex: getRegionFromStartTagIndex, 
             updateElementTag: updateElementTag, 
             setElementToStartRegion: setElementToStartRegion,
             setElementToSettingsBlock: setElementToSettingsBlock,
             getRegionParent: getRegionParent
    }
}
