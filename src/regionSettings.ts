/*
 * Filename: multi-column-markdown/src/regionSettings.ts
 * Created Date: Tuesday, February 1st 2022, 12:23:53 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { HTMLSizing } from "./utilities/interfaces"

export enum BorderOption {
    enabled,
    on,
    true,
    disabled,
    off,
    false
}

export enum ShadowOption {
    enabled,
    on,
    true,
    disabled,
    off,
    false
}

export enum TableAlignOption {
    enabled,
    on,
    true,
    disabled,
    off,
    false
}

const ALL_LAYOUTS = [
    "standard",
    "left", 
    "first", 
    "center",
    "middle",
    "second",
    "right",
    "third",
    "last"
] as const;
type ColumnLayoutTuple = typeof ALL_LAYOUTS;
export type ColumnLayout = ColumnLayoutTuple[number];

export function isColumnLayout(value: string): value is ColumnLayout {
  return ALL_LAYOUTS.includes(value.toLowerCase() as ColumnLayout)
}
export function validateColumnLayout(value: string | ColumnLayout): ColumnLayout {
    return (value.toLowerCase() as ColumnLayout)
}

const ALL_SINGLE_COLUMN_SIZES = [
    "small",
    "medium",
    "large",
    "full"
]
type SingleColumnSizeTuple = typeof ALL_SINGLE_COLUMN_SIZES;
export type SingleColumnSize = SingleColumnSizeTuple[number];
export function isSingleColumnSize(value: string): value is SingleColumnSize {
    return ALL_SINGLE_COLUMN_SIZES.includes(value.toLowerCase() as SingleColumnSize)
}
export function validateSingleColumnSize(value: string | SingleColumnSize): SingleColumnSize {
    return (value.toLowerCase() as SingleColumnSize)
}

export enum ContentOverflowType {
    scroll,
    hidden
}

export enum AlignmentType {
    left,
    center,
    right
}

export enum TableAlignment {
    useSettingsDefault,
    align,
    noAlign
}

export type MultiColumnSettings = {
    columnID: string,
    numberOfColumns: number,
    drawBorder: boolean[],
    drawShadow: boolean,
    autoLayout: boolean
    columnSize: SingleColumnSize | ColumnLayout | HTMLSizing[],
    columnPosition: ColumnLayout,
    columnSpacing: string[],
    contentOverflow: ContentOverflowType[],
    alignment: AlignmentType[],
    columnHeight: HTMLSizing | null,
    fullDocReflow: boolean,
    alignTablesToAlignment: TableAlignment
}
export function MCSettings_isEqual(settingsA: MultiColumnSettings, settingsB: MultiColumnSettings): boolean {

    if(settingsA?.columnID !== settingsB?.columnID) {
        return false
    }
    if(settingsA?.numberOfColumns !== settingsB?.numberOfColumns) {
        return false
    }
    if(JSON.stringify(settingsA?.drawBorder) !== JSON.stringify(settingsB?.drawBorder)) {
        return false
    }
    if(settingsA?.drawShadow !== settingsB?.drawShadow) {
        return false
    }
    if(settingsA?.autoLayout !== settingsB?.autoLayout) {
        return false
    }
    if(JSON.stringify(settingsA?.columnSize) !== JSON.stringify(settingsB?.columnSize)) {
        return false
    }
    if(settingsA?.columnPosition !== settingsB?.columnPosition) {
        return false
    }
    if(JSON.stringify(settingsA?.columnSpacing) !== JSON.stringify(settingsB?.columnSpacing)) {
        return false
    }
    if(JSON.stringify(settingsA?.contentOverflow) !== JSON.stringify(settingsB?.contentOverflow)) {
        return false
    }
    if(JSON.stringify(settingsA?.alignment) !== JSON.stringify(settingsB?.alignment)) {
        return false
    }
    if(settingsA?.columnHeight !== settingsB?.columnHeight) {
        return false
    }
    if(settingsA?.fullDocReflow !== settingsB?.fullDocReflow) {
        return false
    }
    if(settingsA?.alignTablesToAlignment !== settingsB?.alignTablesToAlignment) {
        return false
    }
    return true
}

export function getDefaultMultiColumnSettings(): MultiColumnSettings {

    return {
        columnID: "",
        numberOfColumns: 2,
        drawBorder: [true],
        drawShadow: true,
        autoLayout: false,
        columnSize: "standard",
        columnPosition: "standard",
        columnSpacing: [""],
        contentOverflow: [ContentOverflowType.scroll],
        alignment: [AlignmentType.left],
        columnHeight: null,
        fullDocReflow: false,
        alignTablesToAlignment: TableAlignment.useSettingsDefault
    }
}

export function shouldDrawColumnBorder(index: number, settings: MultiColumnSettings): boolean {

    if(settings.drawBorder.length === 0) {
        return true;
    }

    return getIndexedClampedArrayValue(index, settings.drawBorder);
}

export function columnOverflowState(index: number, settings: MultiColumnSettings): ContentOverflowType {

    if(settings.contentOverflow.length === 0) {
        return ContentOverflowType.scroll
    }

    return getIndexedClampedArrayValue(index, settings.contentOverflow);
}

export function columnAlignmentState(index: number, settings: MultiColumnSettings): AlignmentType {

    if(settings.alignment.length === 0) {
        return AlignmentType.left
    }

    return getIndexedClampedArrayValue(index, settings.alignment)
}

export function columnSpacingState(index: number, settings: MultiColumnSettings): string {

    if(settings.columnSpacing.length === 0) {
        return "";
    }

    return `margin-inline: ${getIndexedClampedArrayValue(index, settings.columnSpacing)};`;
}

export function getIndexedClampedArrayValue<T>(index: number, arr: T[]) {

    if(arr.length === 0) {
        throw("Error getting value from empty array.")
    }

    if(index < 0) {
        return arr[0];
    }

    if(index < arr.length) {
        return arr[index];
    }

    return arr.last();
}