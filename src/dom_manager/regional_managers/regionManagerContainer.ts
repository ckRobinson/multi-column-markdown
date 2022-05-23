/**
 * File: /src/dom_manager/regional_managers/regionManagerContainer.ts          *
 * Created Date: Sunday, May 22nd 2022, 7:50 pm                                *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2022 Cameron Robinson                                         *
 */

import { parseColumnSettings } from '../../utilities/textParser';
import { DOMObject } from '../domObject';
import { MultiColumnSettings, ColumnLayout } from "../../regionSettings";
import { FileDOMManager } from '../domManager';
import { TwoColumnRegionManager as StandardMultiColumnRegionManager } from './standardMultiColumnRegionManager';
import { SingleColumnRegionManager } from "./singleColumnRegionManager";
import { RegionManager } from "./regionManager";

/**
 * This class acts as an abstraction for the actual regional manager. It is used to update the
 * subclass of RegionalManager depending on user preferences to make rendering more simplified.
 */
export class RegionManagerContainer {

    protected region: RegionManager;
    constructor(parentFileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement, regionParent: HTMLElement) {
        this.region = new StandardMultiColumnRegionManager(createDefaultRegionManagerData(regionParent, parentFileManager, regionKey, rootElement));
    }

    public getRegion(): RegionManager {
        return this.region;
    }

    public setRegionSettings(settingsText: string): RegionManager {

        let regionalSettings = parseColumnSettings(settingsText);
        this.region.setRegionalSettings(settingsText);

        if (regionalSettings.numberOfColumns === 1 && this.region instanceof SingleColumnRegionManager === false) {

            this.convertToSingleColumn();
        }
        else if (regionalSettings.numberOfColumns >= 2 && this.region instanceof StandardMultiColumnRegionManager === false) {
            this.convertToStandardMultiColumn();
        }

        return this.region;
    }

    private convertToSingleColumn(): SingleColumnRegionManager {

        let data = this.region.getRegionData();
        this.region = new SingleColumnRegionManager(data);

        return this.region as SingleColumnRegionManager;
    }

    private convertToStandardMultiColumn(): StandardMultiColumnRegionManager {

        let data = this.region.getRegionData();
        this.region = new StandardMultiColumnRegionManager(data);

        return this.region as StandardMultiColumnRegionManager;
    }
}

function createDefaultRegionManagerData(regionParent: HTMLElement, fileManager: FileDOMManager, regionKey: string, rootElement: HTMLElement): RegionManagerData {

    return {
        domList: [],
        domObjectMap: new Map(),
        regionParent: regionParent,
        fileManager: fileManager,
        regionalSettings: { numberOfColumns: 2, columnLayout: ColumnLayout.standard, drawBorder: true, drawShadow: true },
        regionKey: regionKey,
        rootElement: rootElement
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
};
