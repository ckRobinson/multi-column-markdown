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
    pluginSettings: MCM_Settings;

    constructor(pluginSettings: MCM_Settings = DEFAULT_SETTINGS) {
        this.managers = new Map();
        this.pluginSettings = pluginSettings;
    }

    public updatedPluginSettings(newSettings: MCM_Settings) {
        this.pluginSettings = newSettings;
        for(let file of this.managers.values()) {
            file.updateSettings(newSettings);
        }
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
            fileManager = new FileDOMManager(this, key, this.pluginSettings);
            this.managers.set(key, fileManager);
        }

        return fileManager;
    }

    public getAllFileManagers() {
        return Array.from(this.managers.values());
    }
}

export class FileDOMManager {
    regionMap: Map<string, RegionManagerContainer>;
    hasStartTag: boolean;
    fileKey: string;
    parentManager: GlobalDOMManager;
    pluginSettings: MCM_Settings;

    constructor(parentManager: GlobalDOMManager, fileKey: string, pluginSettings: MCM_Settings = DEFAULT_SETTINGS) {
        this.regionMap = new Map();
        this.hasStartTag = false;
        this.parentManager = parentManager;
        this.fileKey = fileKey;
        this.pluginSettings = pluginSettings;
    }

    public updateSettings(newSettings: MCM_Settings) {
        this.pluginSettings = newSettings;
        for(let region of this.regionMap.values()) {
            region.updateSettings(newSettings);
        }
    }

    removeRegion(regionKey: string): void {

        let regionContainer = this.regionMap.get(regionKey);
        if(regionContainer === undefined) {
            return;
        }

        let regionalManager = regionContainer.getRegion();
        regionalManager.displayOriginalElements();

        this.regionMap.delete(regionKey);
        
        if(this.regionMap.size === 0) {
            this.parentManager.removeFileManagerCallback(this.fileKey);
        }
    }

    createRegionalManager(regionKey: string, rootElement: HTMLElement, errorElement: HTMLElement, renderRegionElement: HTMLElement): RegionManager {

        //TODO: Use the error element whenever there is an error.

        let regonalContainer = new RegionManagerContainer(this, regionKey, rootElement, renderRegionElement, this.pluginSettings);
        this.regionMap.set(regionKey, regonalContainer);
        return regonalContainer.getRegion();
    }

    getRegionalContainer(regionKey: string): RegionManagerContainer | null {

        let regonalManager = null;
        if(this.regionMap.has(regionKey) === true) {
            regonalManager = this.regionMap.get(regionKey);
        }

        return regonalManager;
    }

    getAllRegionalManagers(): RegionManager[] {

        let containers = Array.from(this.regionMap.values())
        let regions: RegionManager[] = containers.map((curr) => { return curr.getRegion() });
        return regions;
    }

    setHasStartTag() {
        this.hasStartTag = true;
    }

    getHasStartTag() {
        return this.hasStartTag;
    }

    getNumberOfRegions() {
        return this.regionMap.size
    }

    checkKeyExists(checkKey: string) {
        return this.regionMap.has(checkKey);
    }
}