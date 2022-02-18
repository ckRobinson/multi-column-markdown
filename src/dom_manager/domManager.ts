/*
 * File: multi-column-markdown/src/domManager.ts
 * Created Date: Saturday, January 30th 2022, 3:16:32 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { parseColumnSettings } from '../utilities/textParser';
import { DOMObject, DOMRegionSettingsObject, DOMObjectTag } from './domObject';
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

    function createRegionalManager(regionKey: string, rootElement: HTMLElement, errorElement: HTMLElement, renderRegionElement: HTMLElement) {

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

export type RegionDOMManager = {

    addObject: (siblingsAbove: HTMLDivElement, siblingsBelow: HTMLDivElement, obj: DOMObject) => number,
    removeObject: (objectKey: string) => void,
    updateElementTag: (objectUID: string, newTag: DOMObjectTag) => void,
    setElementToSettingsBlock: (objectUID: string, settingsText: string) => void,
    getRegionRenderData: () => MultiColumnRenderData,
    displayOriginalElements: () => void,
    getRootRegionElement: () => HTMLElement
}

function createRegionalDomManager(fileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement, renderRegionElement: HTMLElement): RegionDOMManager {

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
    let regionParent: HTMLElement = renderRegionElement;
    let regionSettings: DOMRegionSettingsObject[] = [];

    function addObject(siblingsAbove: HTMLDivElement, siblingsBelow: HTMLDivElement, obj: DOMObject): number {

        let prevObj = siblingsAbove.children[siblingsAbove.children.length - 1] as HTMLElement;
        let nextObj = siblingsBelow.children[0] as HTMLElement;

        let addAtIndex = siblingsAbove.children.length;

        let prevObjText = ""
        if(prevObj !== undefined) {
            
            prevObjText = prevObj.innerText;

            for(let i = domList.length - 1; i >= 0; i--) {
                if(domList[i].nodeKey === prevObj.innerText) {
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
            
            for(let i = addAtIndex; i < domList.length; i++) {

                if(domList[i].nodeKey === nextObj.innerText.trim()) {
    
                    nextElIndex = i;
                    foundNext = true
                    break;
                }
            }
        }

        // console.log(" Prev: ", siblingsAbove.children[siblingsAbove.children.length - 1], "Adding: ", obj.element, " Next: ", siblingsBelow.children[0], "Overwriting:", domList.slice(addAtIndex, nextElIndex));

        domList.splice(addAtIndex, nextElIndex - addAtIndex, obj);
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
        
        if(obj === undefined) {
            return;
        }

        if(domList.contains(obj)) {
            domList.remove(obj);
        }

        // If the object is a settings object we need to remove from the 
        // settings list.
        if(obj.tag === DOMObjectTag.regionSettings) {
            let settingsObj = obj as DOMRegionSettingsObject;
            if(regionSettings.contains(settingsObj)) {
                regionSettings.remove(settingsObj);
            }
        }

        if(domList.length === 0) {
            fileManager.removeRegion(regionKey);
        }

        // x = domList.slice(0);
        // console.log(x);
    }

    function updateElementTag(objectUID: string, newTag: DOMObjectTag): void {

        let obj = domObjectMap.get(objectUID);
        let index = domList.indexOf(obj);
        if(index !== -1) {
            domList[index].tag = newTag;
        }
    }

    function setElementToSettingsBlock(objectUID: string, settingsText: string): void {
        

        let obj = domObjectMap.get(objectUID);
        let index = domList.indexOf(obj);
        if(index !== -1) {
            let settings: MultiColumnSettings = parseColumnSettings(settingsText);
            let regionSettingsObj: DOMRegionSettingsObject = new DOMRegionSettingsObject(domList[index], settings);
            
            domObjectMap.set(regionSettingsObj.UID, regionSettingsObj);
            domList[index] = regionSettingsObj;

            regionSettings.push(regionSettingsObj)
        }
    }

    /**
     * Creates an object containing all necessary information for the region
     * to be rendered to the preview pane.
     * 
     * @returns a MultiColumnRenderData object with the root DOM element, settings object, and 
     * all child objects in the order they should be rendered.
     */
    function getRegionRenderData(): MultiColumnRenderData {

        // Set defaults before attempting to get settings.
        let settings: MultiColumnSettings = {numberOfColumns: 2, columnLayout: ColumnLayout.standard, drawBorder: true, drawShadow: true};
        if(regionSettings.length > 0) {

            /**
             * Since we append settings onto the end of the array we want the last
             * item in the array as that would be the most recent settings we parsed.
             */
            settings = regionSettings[regionSettings.length - 1].regionSettings;
        }
        
        return { 
            parentRenderElement: regionParent, 
            parentRenderSettings: settings,
            domObjects: domList
        };
    }

    /**
     * This fuction is called when a start tag is removed from view meaning
     * our parent element storing the multi-column region is removed. It 
     * removes the CSS class from all of the elements so they will be
     * re-rendered in the preview window.
     */
    function displayOriginalElements() {

        
        for(let i = 0; i < domList.length; i++) {

            if(domList[i].element) {
                domList[i].element.removeClasses([MultiColumnStyleCSS.RegionEndTag,
                                                  MultiColumnStyleCSS.ColumnEndTag,
                                                  MultiColumnStyleCSS.RegionSettings,
                                                  MultiColumnStyleCSS.RegionContent]);
                if(domList[i].element.parentElement) {
                    domList[i].element.parentElement.removeChild(domList[i].element)
                }                                                  
            }
        }
        for(let i = 0; i < regionSettings.length; i++) {
            if(regionSettings[i].element) {
                regionSettings[i].element.removeClasses([MultiColumnStyleCSS.RegionEndTag,
                                                         MultiColumnStyleCSS.ColumnEndTag,
                                                         MultiColumnStyleCSS.RegionSettings,
                                                         MultiColumnStyleCSS.RegionContent]);
                                                         
                if(regionSettings[i].element.parentElement) {
                    regionSettings[i].element.parentElement.removeChild(regionSettings[i].element)
                }
            }
        }
    }

    function getRootRegionElement(): HTMLElement {
        return rootElement;
    }

    return { addObject: addObject, 
             removeObject: removeObject, 
             updateElementTag: updateElementTag, 
             setElementToSettingsBlock: setElementToSettingsBlock,
             getRegionRenderData: getRegionRenderData,
             displayOriginalElements: displayOriginalElements,
             getRootRegionElement: getRootRegionElement
    }
}
