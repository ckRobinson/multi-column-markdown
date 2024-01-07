/*
 * File: multi-column-markdown/src/utilities/cssDefinitions.ts
 * Created Date: Wednesday, February 16th 2022, 11:09:06 am
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

export enum MultiColumnLayoutCSS {

    RegionRootContainerDiv = "mcm-column-root-container",
    RegionErrorContainerDiv = "mcm-column-error-region-wrapper",
    RegionContentContainerDiv = "mcm-column-region-wrapper",
    RegionColumnContainerDiv = "mcm-column-parent-container",
    ColumnDualElementContainer = "mcm-column-element-wrapper",
    OriginalElementType = "mcm-original-column-element",
    ClonedElementType = "mcm-cloned-column-element",

    ContentOverflowAutoScroll_X = "mcm-content-overflow-auto-scroll-x",
    ContentOverflowAutoScroll_Y = "mcm-content-overflow-auto-scroll-y",
    ContentOverflowHidden_X = "mcm-content-overflow-hidden-x",
    ContentOverflowHidden_Y = "mcm-content-overflow-hidden-y",

    AlignmentLeft = "mcm-content-alignment-left",
    AlignmentCenter = "mcm-content-alignment-center",
    AlignmentRight = "mcm-content-alignment-right",

    TableAlignment = "mcm-table-alignment",

    NoFlexShrink = "mcm-no-flex-shrink",

    ReflowContainerDiv = "mcm-doc-reflow-container",

    ErrorRegionPadding = "mcm-column-error-padding",

    // ------------------------------------------------------ //

    SingleColumnSmall = "mcm-single-column-small",
    SingleColumnMed = "mcm-single-column-medium",
    SingleColumnLarge = "mcm-single-column-large",
    SingleColumnFull = "mcm-single-column-full",

    SingleColumnLeftLayout = "mcm-singlecol-layout-left",
    SingleColumnCenterLayout = "mcm-singlecol-layout-center",
    SingleColumnRightLayout = "mcm-singlecol-layout-right",

    // ------------------------------------------------------ //

    TwoEqualColumns = "mcm-two-equal-columns",

    TwoColumnSmall = "mcm-two-column-small",
    TwoColumnLarge = "mcm-two-column-large",

    // ------------------------------------------------------ //

    ThreeEqualColumns = "mcm-three-equal-columns",

    ThreeColumn_Large = "mcm-three-column-large",
    ThreeColumn_Small = "mcm-three-column-small",
}

export enum MultiColumnStyleCSS {

    RegionErrorMessage = "mcm-column-error-message",
    RegionSettings = "mcm-column-settings-wrapper",
    RegionContent = "mcm-column-content-wrapper",
    RegionEndTag = "mcm-column-end-tag-wrapper",
    ColumnEndTag = "mcm-column-break-tag-wrapper",
    RegionShadow = "mcm-region-shadow",
    ColumnShadow = "mcm-column-shadow",
    ColumnBorder = "mcm-column-border",
    ColumnContent = "mcm-column-div",
    SmallFont = "mcm-small-font-message"
}

export enum ObsidianStyleCSS {
    RenderedMarkdown = "markdown-rendered"
}