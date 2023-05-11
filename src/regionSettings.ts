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
  return ALL_LAYOUTS.includes(value as ColumnLayout)
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
    return ALL_SINGLE_COLUMN_SIZES.includes(value as SingleColumnSize)
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
    columnHeight: string | null,
    fullDocReflow: boolean
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
        fullDocReflow: false
    }
}

export function shouldDrawColumnBorder(index: number, settings: MultiColumnSettings): boolean {

    if(settings.drawBorder.length === 0) {
        console.debug("Missing draw border value in settings data, using default state.")
        return true;
    }

    return getIndexedClampedArrayValue(index, settings.drawBorder);
}

export function columnOverflowState(index: number, settings: MultiColumnSettings): ContentOverflowType {

    if(settings.contentOverflow.length === 0) {
        console.debug("Missing content overflow value in settings data, using default state.")
        return ContentOverflowType.scroll
    }

    return getIndexedClampedArrayValue(index, settings.contentOverflow);
}

export function columnAlignmentState(index: number, settings: MultiColumnSettings): AlignmentType {

    if(settings.alignment.length === 0) {
        console.debug("Missing content alignment value in settings data, using default state.")
        return AlignmentType.left
    }

    return getIndexedClampedArrayValue(index, settings.alignment)
}

export function columnSpacingState(index: number, settings: MultiColumnSettings): string {

    if(settings.columnSpacing.length === 0) {
        console.debug("Missing column spacing value in settings data, using default state.")
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