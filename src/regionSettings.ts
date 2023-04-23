/*
 * Filename: multi-column-markdown/src/regionSettings.ts
 * Created Date: Tuesday, February 1st 2022, 12:23:53 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

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

export enum ColumnLayout { 
    standard,
    left,
    first,
    center,
    middle,
    second,
    right,
    third,
    last
};

export enum SingleColumnSize {
    small,
    medium,
    large,
    full
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
    numberOfColumns: number,
    columnLayout: ColumnLayout,
    drawBorder: boolean[],
    drawShadow: boolean,
    autoLayout: boolean
    columnSize: SingleColumnSize,
    columnPosition: ColumnLayout,
    columnSpacing: string[],
    contentOverflow: ContentOverflowType[],
    alignment: AlignmentType[],
    columnHeight: string | null
}

export function getDefaultMultiColumnSettings(): MultiColumnSettings {

    return {
        numberOfColumns: 2,
        columnLayout: ColumnLayout.standard,
        drawBorder: [true],
        drawShadow: true,
        autoLayout: false,
        columnSize: SingleColumnSize.medium,
        columnPosition: ColumnLayout.standard,
        columnSpacing: [""],
        contentOverflow: [ContentOverflowType.scroll],
        alignment: [AlignmentType.left],
        columnHeight: null
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