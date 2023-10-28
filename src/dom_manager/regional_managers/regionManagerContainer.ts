/**
 * File: /src/dom_manager/regional_managers/regionManagerContainer.ts          *
 * Created Date: Sunday, May 22nd 2022, 7:50 pm                                *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2022 Cameron Robinson                                         *
 */

import { parseColumnSettings, parseSingleColumnSettings } from "../../utilities/settingsParser";
import { DOMObject } from '../domObject';
import { MultiColumnSettings, getDefaultMultiColumnSettings } from "../../regionSettings";
import { FileDOMManager } from '../domManager';
import { StandardMultiColumnRegionManager as StandardMultiColumnRegionManager } from './standardMultiColumnRegionManager';
import { SingleColumnRegionManager } from "./singleColumnRegionManager";
import { RegionManager } from "./regionManager";
import { AutoLayoutRegionManager } from './autoLayoutRegionManager';
import { ReflowRegionManager } from "./reflowRegionManager";
import { MCM_Settings, DEFAULT_SETTINGS } from '../../pluginSettings';
import { RegionErrorManager } from "../regionErrorManager";

/**
 * This class acts as an abstraction for the actual regional manager. It is used to update the
 * subclass of RegionalManager depending on user preferences to make rendering more simplified.
 */
export class RegionManagerContainer {

    protected region: RegionManager;
    protected pluginSettings: MCM_Settings;

    constructor(parentFileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement, regionParent: HTMLElement, errorManager: RegionErrorManager, pluginSettings: MCM_Settings = DEFAULT_SETTINGS) {
        this.pluginSettings = pluginSettings;
        this.region = new StandardMultiColumnRegionManager(createDefaultRegionManagerData(regionParent, parentFileManager, regionKey, rootElement, errorManager), pluginSettings);
    }

    public updateSettings(newSettings: MCM_Settings) {
        this.pluginSettings = newSettings;
        this.region.updateSettings(newSettings)
    }
    
    public getRegion(): RegionManager {
        return this.region;
    }

    public setRegionSettings(settingsText: string): RegionManager {

        let regionalSettings = parseColumnSettings(settingsText);
        if (regionalSettings.numberOfColumns === 1) {

            regionalSettings = parseSingleColumnSettings(settingsText, regionalSettings);
        }
        return this.setRegionParsedSettings(regionalSettings);
    }

    public setRegionParsedSettings(regionalSettings: MultiColumnSettings): RegionManager {

        this.region.setRegionalSettings(regionalSettings);

        if (regionalSettings.numberOfColumns === 1) {

            if(this.region instanceof SingleColumnRegionManager === false) {

                // console.debug("Converting region to single column.")
                this.convertToSingleColumn();
            }
        }
        else if(regionalSettings.autoLayout === true) {

            if(this.region instanceof AutoLayoutRegionManager === false) {

                // console.debug("Converting region to auto layout.")
                this.convertToAutoLayout()
            }
        }
        else if(regionalSettings.fullDocReflow === true) {
            if(this.region instanceof ReflowRegionManager === false) {

                // console.debug("Converting region to auto layout.")
                this.convertToDocReflow()
            } 
        }
        else if (regionalSettings.numberOfColumns >= 2) {

            if(this.region instanceof StandardMultiColumnRegionManager === false) {

                // console.debug("Converting region to standard multi-column")
                this.convertToStandardMultiColumn();
            }
        }

        return this.region;
    }

    private convertToSingleColumn(): SingleColumnRegionManager {

        let data = this.region.getRegionData();
        this.region = new SingleColumnRegionManager(data);
        this.region.updateSettings(this.pluginSettings);

        return this.region as SingleColumnRegionManager;
    }

    private convertToStandardMultiColumn(): StandardMultiColumnRegionManager {

        let data = this.region.getRegionData();
        this.region = new StandardMultiColumnRegionManager(data);
        this.region.updateSettings(this.pluginSettings);

        return this.region as StandardMultiColumnRegionManager;
    }

    private convertToAutoLayout(): AutoLayoutRegionManager {

        let data = this.region.getRegionData();
        this.region = new AutoLayoutRegionManager(data);
        this.region.updateSettings(this.pluginSettings);

        return this.region as AutoLayoutRegionManager;
    }

    private convertToDocReflow(): ReflowRegionManager {

        let data = this.region.getRegionData();
        this.region = new ReflowRegionManager(data);
        this.region.updateSettings(this.pluginSettings);

        return this.region as ReflowRegionManager;
    }
}

function createDefaultRegionManagerData(regionParent: HTMLElement, fileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement, errorManager: RegionErrorManager): RegionManagerData {

    return {
        domList: [],
        domObjectMap: new Map(),
        regionParent: regionParent,
        fileManager: fileManager,
        regionalSettings: getDefaultMultiColumnSettings(),
        regionKey: regionKey,
        rootElement: rootElement,
        errorManager: errorManager
    };
}

export type RegionManagerData = {
    domList: DOMObject[];
    domObjectMap: Map<string, DOMObject>;
    regionParent: HTMLElement;

    fileManager: FileDOMManager;
    regionalSettings: MultiColumnSettings;

    regionKey: string;
    rootElement: HTMLElement;
    errorManager: RegionErrorManager;
};
