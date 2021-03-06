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
    large
}

export type MultiColumnSettings = {
    numberOfColumns: number,
    columnLayout: ColumnLayout,
    drawBorder: boolean,
    drawShadow: boolean,
    autoLayout: boolean
    columnSize: SingleColumnSize,
    columnPosition: ColumnLayout,
}

export function getDefaultMultiColumnSettings() {

    return {
        numberOfColumns: 2,
        columnLayout: ColumnLayout.standard,
        drawBorder: true,
        drawShadow: true,
        autoLayout: false,
        columnSize: SingleColumnSize.medium,
        columnPosition: ColumnLayout.standard
    }
}