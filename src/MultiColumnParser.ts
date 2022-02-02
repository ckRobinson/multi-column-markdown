/*
 * File: multi-column-markdown/src/MultiColumnParser.ts
 * Created Date: Saturday, January 22nd 2022, 6:02:46 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { MultiColumnSettings, ColumnLayout, BorderOption, ShadowOption } from "./regionSettings";

const START_REGEX_STRS = ["=== start-multi-column",
                          "=== multi-column-start"]
const START_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < START_REGEX_STRS.length; i++) {
    START_REGEX_ARR.push(new RegExp(START_REGEX_STRS[i]));
}
export function containsStartTag(text: string): boolean {

    let found = false;
    for(let i = 0; i< START_REGEX_ARR.length; i++) {

        if(START_REGEX_ARR[i].test(text)) {
            found = true;
            break;
        }
    }

    return found;
}

const END_REGEX_STRS = ["=== end-multi-column",
                        "=== multi-column-end"]
const END_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < END_REGEX_STRS.length; i++) {
    END_REGEX_ARR.push(new RegExp(END_REGEX_STRS[i]));
}
export function containsEndTag(text: string): boolean {

    let found = false;
    for(let i = 0; i< END_REGEX_ARR.length; i++) {

        if(END_REGEX_ARR[i].test(text)) {
            found = true;
            break;
        }
    }

    return found;
}

const COL_REGEX_STRS: string[] = ["=== column-end ===",
                                  "=== end-column ==="];
const COL_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < COL_REGEX_STRS.length; i++) {
    COL_REGEX_ARR.push(new RegExp(COL_REGEX_STRS[i]));
}
export function containsColEndTag(text: string): boolean {

    let found = false;
    for(let i = 0; i< COL_REGEX_ARR.length; i++) {

        if(COL_REGEX_ARR[i].test(text)) {
            found = true;
            break;
        }
    }

    return found;
}

const COL_SETTINGS_REGEX_STRS = ["```settings",
                                 "```column-settings",
                                 "```multi-column-settings"];
const COL_SETTINGS_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < COL_SETTINGS_REGEX_STRS.length; i++) {
    COL_SETTINGS_REGEX_ARR.push(new RegExp(COL_SETTINGS_REGEX_STRS[i]));
}
export function containsColSettingsTag(text: string): boolean {

    let found = false;
    for(let i = 0; i< COL_SETTINGS_REGEX_ARR.length; i++) {

        if(COL_SETTINGS_REGEX_ARR[i].test(text)) {
            found = true;
            break;
        }
    }

    return found;
}

export function parseColumnSettings(settingsStr: string): MultiColumnSettings {

    // Set the minimum number of columnds to 2.
    let numberOfColumns = 2;
    let columnLayout: ColumnLayout = ColumnLayout.standard
    let borderDrawn: boolean = true;
    let shadowDrawn: boolean = true;

    let settingsLines = settingsStr.split("\n");

    for(let i = 0; i < settingsLines.length; i++) {
        if(settingsLines[i].toLowerCase().replace(/\s/g, "").contains("numberofcolumns:")) {
            let userDefNumberOfCols = parseInt(settingsLines[i].split(":")[1])

            if(Number.isNaN(userDefNumberOfCols) === false) {
                if(userDefNumberOfCols === 3) {
                    numberOfColumns = 3
                }
                else if(userDefNumberOfCols === 2) {
                    numberOfColumns = 2;
                }
            }

            break;
        }
    }

    for(let i = 0; i < settingsLines.length; i++) {
        if(settingsLines[i].toLowerCase().replace(/\s/g, "").contains("largestcolumn:")) {

            let setting = settingsLines[i].split(":")[1].trimStart().trimEnd().toLowerCase();
            let userDefLayout: ColumnLayout = (<any>ColumnLayout)[setting]

            if(userDefLayout !== undefined) {
                columnLayout = userDefLayout;
            }
        }
    }

    for(let i = 0; i < settingsLines.length; i++) {
        if(settingsLines[i].toLowerCase().replace(/\s/g, "").contains("border:")) {

            let setting = settingsLines[i].split(":")[1].trimStart().trimEnd().toLowerCase();
            let isBorderDrawn: BorderOption = (<any>BorderOption)[setting]

            if(isBorderDrawn !== undefined) {
                switch(isBorderDrawn){
                    case(BorderOption.disabled):
                    case(BorderOption.off):
                    case(BorderOption.false):
                        borderDrawn = false;
                        break;
                }
            }
        }
    }

    for(let i = 0; i < settingsLines.length; i++) {
        if(settingsLines[i].toLowerCase().replace(/\s/g, "").contains("shadow:")) {

            let setting = settingsLines[i].split(":")[1].trimStart().trimEnd().toLowerCase();
            let isShadowDrawn: ShadowOption = (<any>ShadowOption)[setting]

            if(isShadowDrawn !== undefined) {
                switch(isShadowDrawn){
                    case(ShadowOption.disabled):
                    case(ShadowOption.off):
                    case(ShadowOption.false):
                        shadowDrawn = false;
                        break;
                }
            }
        }
    }

    let settings = { numberOfColumns, columnLayout, drawBorder: borderDrawn, drawShadow: shadowDrawn }

    return settings;
}