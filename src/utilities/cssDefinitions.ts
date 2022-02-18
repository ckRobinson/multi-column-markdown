/*
 * File: multi-column-markdown/src/utilities/cssDefinitions.ts
 * Created Date: Wednesday, February 16th 2022, 11:09:06 am
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

export enum MultiColumnLayoutCSS {

    RegionRootContainerDiv = "multiColumnContainer",
    RegionErrorContainerDiv = "multiColumnErrorContainer",
    RegionContentContainerDiv = "RenderColRegion",
    RegionColumnContainerDiv = "multiColumnParent",
    RegionColumnContent = "columnContent",
    ColumnDualElementContainer = "MultiColumn_DualElementContainer",
    OriginalElementType = "MultiColumn_OriginalElement",
    ClonedElementType = "MultiColumn_ClonedElement"
}

export enum MultiColumnStyleCSS {

    RegionErrorMessage = "multiColumnErrorMessage",
    RegionSettings = "multiColumnSettings",
    RegionContent = "multiColumnContent",
    RegionEndTag = "multiColumnRegionEndTag",
    ColumnEndTag = "multiColumnBreak",
    RegionShadow = "multiColumnParentShadow",
    ColumnShadow = "columnShadow",
    ColumnBorder = "columnBorder",
}