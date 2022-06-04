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
    ColumnDualElementContainer = "MultiColumn_ElementContainer",
    OriginalElementType = "MultiColumn_OriginalElement",
    ClonedElementType = "MultiColumn_ClonedElement",

    // ------------------------------------------------------ //

    SingleColumnSmallLeft = "singleColumnSmallLeft",
    SingleColumnMedLeft = "singleColumnMedLeft",
    SingleColumnLargeLeft = "singleColumnLargeLeft",

    SingleColumnSmallRight = "singleColumnSmallRight",
    SingleColumnMedRight = "singleColumnMedRight",
    SingleColumnLargeRight = "singleColumnLargeRight",

    SingleColumnSmallCenter = "singleColumnSmallCenter",
    SingleColumnMedCenter = "singleColumnMedCenter",
    SingleColumnLargeCenter = "singleColumnLargeCenter",

    // ------------------------------------------------------ //

    TwoEqualColumn_LeftCol = "twoEqualColumns_Left",
    TwoEqualColumn_RightCol = "twoEqualColumns_Right",

    TwoColumnHeavyRight_LeftCol = "twoColumnsHeavyLeft_Left",
    TwoColumnHeavyRight_RightCol = "twoColumnsHeavyLeft_Right",

    TwoColumnHeavyLeft_LeftCol = "twoColumnsHeavyRight_Left",
    TwoColumnHeavyLeft_RightCol = "twoColumnsHeavyRight_Right",

    // ------------------------------------------------------ //

    ThreeColumnsStandard_LeftCol = "threeEqualColumns_Left",
    ThreeColumnsStandard_MiddleCol = "threeEqualColumns_Middle",
    ThreeColumnsStandard_RightCol = "threeEqualColumns_Right",

    ThreeColumnsHeavyLeft_LeftCol = "threeColumnsHeavyLeft_Left",
    ThreeColumnsHeavyLeft_MiddleCol = "threeColumnsHeavyLeft_Middle",
    ThreeColumnsHeavyLeft_RightCol = "threeColumnsHeavyLeft_Right",

    ThreeColumnsHeavyMiddle_LeftCol = "threeColumnsHeavyMiddle_Left",
    ThreeColumnsHeavyMiddle_MiddleCol = "threeColumnsHeavyMiddle_Middle",
    ThreeColumnsHeavyMiddle_RightCol = "threeColumnsHeavyMiddle_Right",

    ThreeColumnsHeavyRight_LeftCol = "threeColumnsHeavyRight_Left",
    ThreeColumnsHeavyRight_MiddleCol = "threeColumnsHeavyRight_Middle",
    ThreeColumnsHeavyRight_RightCol = "threeColumnsHeavyRight_Right",
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
    ColumnContent = "columnContent"
}