/*
 * File: multi-column-markdown/src/MultiColumnParser.ts
 * Created Date: Saturday, January 22nd 2022, 6:02:46 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { MultiColumnSettings, ColumnLayout, BorderOption, ShadowOption } from "../regionSettings";

const START_REGEX_STRS = ["=== *start-multi-column",
                          "=== *multi-column-start"]
const START_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < START_REGEX_STRS.length; i++) {
    START_REGEX_ARR.push(new RegExp(START_REGEX_STRS[i]));
}
function findStartTag(text: string): { found: boolean, startPosition: number } {

    let found = false;
    let startPosition = -1;
    for(let i = 0; i< START_REGEX_ARR.length; i++) {

        if(START_REGEX_ARR[i].test(text)) {
            found = true;
            startPosition = text.search(START_REGEX_STRS[i])
            break;
        }
    }

    return { found, startPosition };
}
export function containsStartTag(text: string): boolean {
    return findStartTag(text).found
}

export function isStartTagWithID(text: string): {isStartTag: boolean, hasKey: boolean} {

    let startTagData = findStartTag(text);
    if(startTagData.found === true) {

        let key = getStartTagKey(text)
        if(key === null || key === "") {
            return {isStartTag: true, hasKey: false};
        }
        return {isStartTag: true, hasKey: true};
    }

    return {isStartTag: false, hasKey: false};
}

const END_REGEX_STRS = ["=== *end-multi-column",
                        "=== *multi-column-end"]
const END_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < END_REGEX_STRS.length; i++) {
    END_REGEX_ARR.push(new RegExp(END_REGEX_STRS[i]));
}
function findEndTag(text: string): { found: boolean, startPosition: number } {

    let found = false;
    let startPosition = -1;
    for(let i = 0; i< END_REGEX_ARR.length; i++) {

        if(END_REGEX_ARR[i].test(text)) {
            found = true;
            startPosition = text.search(END_REGEX_STRS[i])
            break;
        }
    }

    return { found, startPosition };
}
export function containsEndTag(text: string): boolean {
    return findEndTag(text).found
}

const COL_REGEX_STRS: string[] = ["=== *column-end *===",
                                  "=== *end-column *===",
                                  "=== *column-break *===",
                                  "=== *break-column *==="];
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

/**
 * This function will filter a set of strings, returning all items starting
 * from the closest open start tag through the last item in the set. 
 * 
 * The function filters out all end tags to make sure that the start tag we 
 * find is the proper start tag for the list sent. 
 * @param linesAboveArray 
 * @returns 
 */
export function getStartBlockAboveLine(linesAboveArray: string[]): { startBlockKey: string, 
                                                        linesAboveArray: string[] } | null {

    // Reduce the array down into a single string so that we can
    // easily RegEx over the string and find the indicies we're looking for.
    let linesAboveStr = linesAboveArray.reduce((prev, current) => {
        return prev + "\n"  + current;
    }, "");

    /*
        * First thing we need to do is check if there are any end tags in the
        * set of strings (which logically would close start tags and therefore
        * the start tag it closes is not what we want). If there are we want to 
        * slowly narrow down our set of strings until the last end tag is 
        * removed. This makes it easier to find the closest open start tag 
        * in the data.
        */
    let endTagSerachData = findEndTag(linesAboveStr);
    while(endTagSerachData.found === true) {

        // Get the index of where the first regex match in the
        // string is. then we slice from 0 to index off of the string
        // split it by newline, cut off the first line (which actually
        // contains the regex) then reduce back down to a single string.
        //
        // TODO: This could be simplified if we just slice the text after
        // the end tag instead of the begining.
        let indexOfRegex = endTagSerachData.startPosition;
        linesAboveArray = linesAboveStr.slice(indexOfRegex).split("\n").splice(1)
        linesAboveStr = linesAboveArray.reduce((prev, current) => {
            return prev + "\n"  + current;
        }, "");
        endTagSerachData = findEndTag(linesAboveStr);
    }

    /**
     * Now we have the set of lines after all other end tags. We now
     * need to check if there is still a start tag left in the data. If 
     * there is no start tag then we want to return an empty array and empty 
     * key.
     */ 
    let startBlockKey = "";
    let startTagSearchData = findStartTag(linesAboveStr);
    if(startTagSearchData.found === false) {
        return null;
    }
    else {

        /**
         * Now we know there is at least 1 start key left, however there
         * may be multiple start keys if the user is not closing their
         * blocks. We currently dont allow recusive splitting so we 
         * want to get the last key in our remaining set. Same idea as
         * above.
         */
        while(startTagSearchData.found === true) {

            // Get the index of where the first regex match in the
            // string is. then we slice from 0 to index off of the string
            // split it by newline, cut off the first line (which actually
            // contains the regex) then reduce back down to a single string.
            //
            // TODO: This could be simplified if we just slice the text after
            // the end tag instead of the begining.
            let startIndex = startTagSearchData.startPosition;

            linesAboveArray = linesAboveStr.slice(startIndex).split("\n")
            
            let startTag = linesAboveArray[0];
            let key = getStartTagKey(startTag);
            if(key !== null) {
                startBlockKey = key;
            }

            linesAboveArray = linesAboveArray.splice(1)
            linesAboveStr = linesAboveArray.reduce((prev, current) => {
                return prev + "\n"  + current;
            }, "");

            startTagSearchData = findStartTag(linesAboveStr);
        }
    }

    return { startBlockKey, linesAboveArray };
}

function getStartTagKey(startTag: string): string | null {

    let keySplit = startTag.split(":");
    if(keySplit.length > 1){
        return keySplit[1].replace(" ", "")
    }

    return null;
}
