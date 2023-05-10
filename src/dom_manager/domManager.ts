/*
 * File: multi-column-markdown/src/domManager.ts
 * Created Date: Saturday, January 30th 2022, 3:16:32 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { RegionManager } from "./regional_managers/regionManager";
import { RegionManagerContainer } from "./regional_managers/regionManagerContainer";

/**
 * This class handles the global managers keeping track of all open files that
 * contain MCM-Regions.
 */
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
    regionMap: Map<string, RegionManagerContainer>,
    hasStartTag: boolean,
    createRegionalManager: (regionKey: string, rootElement: HTMLElement, errorElement: HTMLElement, renderRegionElement: HTMLElement) => RegionManager
    getRegionalContainer: (regionKey: string) => RegionManagerContainer | null,
    getAllRegionalManagers: () => RegionManager[],
    removeRegion: (regionKey: string) => void,
    setHasStartTag: () => void,
    getHasStartTag: () => boolean,
    getNumberOfRegions: () => number,
    checkKeyExists: (checkKey: string) => boolean
}
function createFileDOMManager(parentManager: GlobalDOMManager, fileKey: string): FileDOMManager {
    
    let regionMap: Map<string, RegionManagerContainer> = new Map();
    let hasStartTag: boolean = false;

    function removeRegion(regionKey: string): void {

        let regionContainer = regionMap.get(regionKey);
        if(regionContainer === undefined) {
            return;
        }

        let regionalManager = regionContainer.getRegion();
        regionalManager.displayOriginalElements();

        regionMap.delete(regionKey);
        
        if(regionMap.size === 0) {
            parentManager.removeFileManagerCallback(fileKey);
        }
    }

    function createRegionalManager(regionKey: string, rootElement: HTMLElement, errorElement: HTMLElement, renderRegionElement: HTMLElement): RegionManager {

        //TODO: Use the error element whenever there is an error.

        let regonalContainer = new RegionManagerContainer(this, regionKey, rootElement, renderRegionElement);
        regionMap.set(regionKey, regonalContainer);
        return regonalContainer.getRegion();
    }

    function getRegionalContainer(regionKey: string): RegionManagerContainer | null {

        let regonalManager = null;
        if(regionMap.has(regionKey) === true) {
            regonalManager = regionMap.get(regionKey);
        }

        return regonalManager;
    }

    function getAllRegionalManagers(): RegionManager[] {

        let containers = Array.from(regionMap.values())
        let regions: RegionManager[] = containers.map((curr) => { return curr.getRegion() });
        return regions;
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
        getRegionalContainer: getRegionalContainer,
        getAllRegionalManagers: getAllRegionalManagers,
        removeRegion: removeRegion, 
        setHasStartTag: setHasStartTag, 
        getHasStartTag: getHasStartTag,
        getNumberOfRegions: getNumberOfRegions,
        checkKeyExists: checkKeyExists
    }
}