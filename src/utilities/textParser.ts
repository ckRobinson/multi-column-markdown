/*
 * File: multi-column-markdown/src/MultiColumnParser.ts
 * Created Date: Saturday, January 22nd 2022, 6:02:46 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { parseStartRegionCodeBlockID } from "./settingsParser";
import { containsPandoc, findPandocStart, reducePandocRegionToEndDiv, getPandocStartData } from "./pandocParser";
import { RegionType, StartTagRegexMatch, defaultStartRegionData } from "./interfaces";

const START_REGEX_STRS = ["(===|---) *start-multi-column(:?[a-zA-Z0-9-_\\s]*)?",
                          "(===|---) *multi-column-start(:?[a-zA-Z0-9-_\\s]*)?"]
const START_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < START_REGEX_STRS.length; i++) {
    START_REGEX_ARR.push(new RegExp(START_REGEX_STRS[i]));
}

const START_REGEX_STRS_WHOLE_LINE = ["^(===|---) *start-multi-column(:?[a-zA-Z0-9-_\\s]*)?$",
                                     "^(===|---) *multi-column-start(:?[a-zA-Z0-9-_\\s]*)?$"]
const START_REGEX_ARR_WHOLE_LINE: RegExp[] = [];
for(let i = 0; i < START_REGEX_STRS_WHOLE_LINE.length; i++) {
    START_REGEX_ARR_WHOLE_LINE.push(new RegExp(START_REGEX_STRS_WHOLE_LINE[i]));
}


export function findStartTag(text: string): StartTagRegexMatch {

    let startRegion = defaultStartRegionData();
    startRegion.regionType = "ORIGINAL";

    for(let i = 0; i< START_REGEX_ARR.length; i++) {

        let regexData = START_REGEX_ARR[i].exec(text)
        if(regexData !== null && regexData.length > 0) {
            startRegion.startPosition = regexData.index
            startRegion.matchLength = regexData[0].length;
            startRegion.endPosition = startRegion.startPosition + startRegion.matchLength;

            let line = text.slice(startRegion.startPosition, startRegion.endPosition);
            if(START_REGEX_ARR_WHOLE_LINE[i].test(line)) {
                startRegion.found = true;
                break;
            }
        }
    }
    return startRegion;
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

const END_REGEX_STRS = ["--- *end-multi-column",
                        "--- *multi-column-end",
                        "=== *end-multi-column",
                        "=== *multi-column-end"]
const END_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < END_REGEX_STRS.length; i++) {
    END_REGEX_ARR.push(new RegExp(END_REGEX_STRS[i]));
}

type TagPositioningData = {
    found: boolean;
    startPosition: number;
    endPosition: number;
    matchLength: number;
};

export function findEndTag(text: string): TagPositioningData {

    // We want to find the first end tag in the text.
    // So here we loop backwards, slicing off the tail until
    // there are no more end tags available
    let lastValidData = getEndTagData(text);
    let workingRegexData = lastValidData;
    while(workingRegexData.found === true) {

        lastValidData = workingRegexData;
        text = text.slice(0, workingRegexData.startPosition);
        workingRegexData = getEndTagData(text);
    }

    return lastValidData;
}

export function findEndTagClosestToEnd(text: string): TagPositioningData {

    let workingText = text;
    let offset = 0;

    let lastValidData = getEndTagData(workingText);
    while(lastValidData.found) {

        workingText = workingText.slice(lastValidData.endPosition);
        let newData = getEndTagData(workingText);
        if(newData.found === false) {
            break;
        }
        offset += lastValidData.endPosition;
        lastValidData = newData;
    }

    return {
        found: lastValidData.found,
        startPosition: lastValidData.startPosition + offset,
        endPosition: lastValidData.endPosition + offset,
        matchLength: lastValidData.matchLength
    };
}
export function containsEndTag(text: string): boolean {
    return findEndTag(text).found
}

function getEndTagData(text: string) {

    let found = false;
    let startPosition = -1;
    let endPosition = -1
    let matchLength = 0;
    for(let i = 0; i< END_REGEX_ARR.length; i++) {

        let regexData = END_REGEX_ARR[i].exec(text)
        if(regexData !== null && regexData.length > 0) {
            found = true;
            startPosition = regexData.index
            matchLength = regexData[0].length;
            break;
        }
    }
    endPosition = startPosition + matchLength;

    return { found, startPosition, endPosition, matchLength };
}

const COL_REGEX_STRS: [string,string][] = [["^===\\s*?column-end\\s*?===\\s*?$"   ,""], // [Regex, Regex Flags]
                                           ["^===\\s*?end-column\\s*?===\\s*?$"   ,""],
                                           ["^===\\s*?column-break\\s*?===\\s*?$" ,""],
                                           ["^===\\s*?break-column\\s*?===\\s*?$" ,""],
                                           ["^---\\s*?column-end\\s*?---\\s*?$"   ,""],
                                           ["^---\\s*?end-column\\s*?---\\s*?$"   ,""],
                                           ["^---\\s*?column-break\\s*?---\\s*?$" ,""],
                                           ["^---\\s*?break-column\\s*?---\\s*?$" ,""],
                                           ["^ *?(?:\\?)\\columnbreak *?$"        ,""],
                                           ["^:{3,} *column-?break *(?:(?:$\\n^)?| *):{3,} *$" ,"m"]];
const COL_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < COL_REGEX_STRS.length; i++) {
    COL_REGEX_ARR.push(new RegExp(COL_REGEX_STRS[i][0], COL_REGEX_STRS[i][1]));
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

const INNER_COL_END_REGEX_ARR: RegExp[] = [
    /^-{3}\s*?column-end\s*?-{3}\s*?$\n?/m,
    /^-{3}\s*?end-column\s*?-{3}\s*?$\n?/m,
    /^-{3}\s*?column-break\s*?-{3}\s*?$\n?/m,
    /^-{3}\s*?break-column\s*?-{3}\s*?$\n?/m,
    /^={3}\s*?column-end\s*?={3}\s*?$\n?/m,
    /^={3}\s*?end-column\s*?={3}\s*?$\n?/m,
    /^={3}\s*?column-break\s*?={3}\s*?$\n?/m,
    /^={3}\s*?break-column\s*?={3}\s*?$\n?/m,
    /^ *?(?:\\?)\\columnbreak *?$\n?/m,
    /^:{3,} *column-?break *(?:(?:$\n^)?| *):{3,} *$/m
]
export function checkForParagraphInnerColEndTag(text: string): RegExpExecArray | null {

    for(let i = 0; i< INNER_COL_END_REGEX_ARR.length; i++) {

        let regexResult = INNER_COL_END_REGEX_ARR[i].exec(text);
        if(regexResult) {
            return regexResult;
        }
    }
    return null;
}

const COL_ELEMENT_INNER_TEXT_REGEX_STRS: string[] = ["= *column-end *=",
                                                    "= *end-column *=",
                                                    "= *column-break *=",
                                                    "= *break-column *="]
const COL_ELEMENT_INNER_TEXT_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < COL_ELEMENT_INNER_TEXT_REGEX_STRS.length; i++) {
    COL_ELEMENT_INNER_TEXT_REGEX_ARR.push(new RegExp(COL_ELEMENT_INNER_TEXT_REGEX_STRS[i]));
}
export function elInnerTextContainsColEndTag(text: string): boolean {

    let found = false;
    for(let i = 0; i< COL_ELEMENT_INNER_TEXT_REGEX_ARR.length; i++) {

        if(COL_ELEMENT_INNER_TEXT_REGEX_ARR[i].test(text)) {
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

export function findSettingsCodeblock(text: string): StartTagRegexMatch {

    let found = false;
    let startPosition = -1;
    let endPosition = -1
    let matchLength = 0;
    for(let i = 0; i< COL_SETTINGS_REGEX_ARR.length; i++) {

        let regexData = COL_SETTINGS_REGEX_ARR[i].exec(text)
        if(regexData !== null && regexData.length > 0) {

            found = true;
            startPosition = regexData.index
            matchLength = regexData[0].length;
            endPosition = startPosition + matchLength;

            let remainingText = text.slice(endPosition)
            regexData = CODEBLOCK_END_REGEX.exec(remainingText)
            if(regexData !== null && regexData.length > 0) {

                found = true;
                endPosition += regexData.index + regexData[0].length 
            }
            break;
        }
    }

    return { 
        found, 
        startPosition, 
        endPosition, 
        matchLength,
        regionType: "CODEBLOCK"
    };
}

const CODEBLOCK_START_REGEX_STR: string = [
"multi-column-start",
"start-multi-column"
].reduce((prev, cur) => {
    if(prev === "") {
        return cur;
    }
    return `${prev}|${cur}`;
}, "")
const START_CODEBLOCK_REGEX: RegExp = new RegExp(`\`\`\`(:?${CODEBLOCK_START_REGEX_STR})(.*?)\`\`\``, "ms");

export function findStartCodeblock(text: string): StartTagRegexMatch {

    let startRegion = defaultStartRegionData();
    startRegion.regionType = "CODEBLOCK";

    let regexData = START_CODEBLOCK_REGEX.exec(text)
    if(regexData !== null && regexData.length > 0) {

        startRegion.found = true;
        startRegion.startPosition = regexData.index
        startRegion.matchLength = regexData[0].length;
        startRegion.endPosition = startRegion.startPosition + startRegion.matchLength;
    }

    return startRegion;
}
export function containsStartCodeBlock(text: string): boolean {
    return findStartCodeblock(text).found
}

export function containsRegionStart(text: string): boolean {
    return containsStartCodeBlock(text) || containsStartTag(text) || containsPandoc(text);
}

export function countStartTags(initialText: string): { numberOfTags: number, keys: string[] } {

    let keys: string[] = [];
    let text = initialText
    let startTagData = findStartTag(text);
    while(startTagData.found) {
        
        // Slice off everything before the tag
        text = text.slice(startTagData.startPosition);

        /**
         * Get just the start tag line and then set text to everything just
         * after the start tag.
         */
        let tag = text.split("\n")[0];
        text = text.slice(1); // This moves the text 1 character so we dont match the same tag.

        // Parse out the key and append to the list.
        let key = getStartTagKey(tag);
        if(key === null) {
            key = ""
        }
        keys.push(key);

        // Search again for another tag before looping.
        startTagData = findStartTag(text);
    }

    text = initialText;
    startTagData = findStartCodeblock(text);
    while(startTagData.found) {
        
        let settingsText = text.slice(startTagData.startPosition, startTagData.endPosition);
        text = text.slice(startTagData.endPosition);

        let key = parseStartRegionCodeBlockID(settingsText);
        if(key === null) {
            key = ""
        }
        keys.push(key);

        // Search again for another tag before looping.
        startTagData = findStartCodeblock(text);
    }

    return { numberOfTags: keys.length, keys };
}

export interface StartTagData {
    startBlockKey: string;
    linesAboveArray: string[];
    startBlockType: RegionType;
}
export function getStartDataAboveLine(linesAboveArray: string[]): StartTagData {
    return getStartBlockOrCodeblockAboveLine(linesAboveArray, [
        findStartTag,
        findStartCodeblock,
        findPandocStart
    ])
}

export function getStartBlockOrCodeblockAboveLine(linesAboveArray: string[], 
                                                  searchFunctions: ((text: string) => StartTagRegexMatch)[]): { startBlockKey: string, 
                                                                                                             linesAboveArray: string[],
                                                                                                             startBlockType: RegionType  } | null {

    let originalText = linesAboveArray.join("\n");
    let {tagMatchData, lastFoundTag, textAbove} =  findLastValidTag(originalText);

    if(tagMatchData === null) {
        return null;
    }

    if(tagMatchData.found === false) {
        return null;
    }

    if(tagMatchData.regionType === "CODEBLOCK") {
    
        let endTagSerachData = findEndTag(textAbove);
        if(endTagSerachData.found === true) {
            return null;
        }

        let startBlockKey = parseStartRegionCodeBlockID(lastFoundTag);
        let linesAboveArray = textAbove.split("\n");

        return { startBlockKey, linesAboveArray, startBlockType: "CODEBLOCK" };
    }

    if(tagMatchData.regionType === "ORIGINAL") {
    
        let endTagSerachData = findEndTag(textAbove);
        if(endTagSerachData.found === true) {
            return null;
        }

        let linesAboveArray = textAbove.split("\n");
        let startBlockKey = getStartTagKey(lastFoundTag);

        let codeBlockData = parseCodeBlockStart(linesAboveArray)
        if(codeBlockData !== null) {
            
            startBlockKey = codeBlockData.id;
            if(codeBlockData.index > 0) {
                linesAboveArray = linesAboveArray.slice(codeBlockData.index + 1);
            }
        }

        if(startBlockKey === null) {
            startBlockKey = "";
        }

        return { startBlockKey, linesAboveArray, startBlockType: "ORIGINAL" };
    }

    if(tagMatchData.regionType === "PADOC") {

        let endTagSerachData = reducePandocRegionToEndDiv(textAbove)
        if(endTagSerachData.found === true) {
            return null;
        }

        let linesAboveArray = textAbove.split("\n");

        let pandocData = getPandocStartData(`${lastFoundTag}`);
        let startBlockKey = pandocData.userSettings.columnID;

        return {
            startBlockKey,
            linesAboveArray,
            startBlockType: "PADOC"
        }
    }

    return null;

    function findLastValidTag(originalText: string) {

        let textAbove = originalText;
        let offset = 0;
        let tagMatchData: StartTagRegexMatch = null;
        let lastFoundTag = ""
        for (let i = 0; true; i++) {
            if (i > 100) {
                break;
            }

            let tagsFound: StartTagRegexMatch[] = [];
            searchFunctions.forEach((func) => {
                tagsFound.push(func(textAbove));
            });
            tagsFound = tagsFound.filter((val) => {
                return val.found === true;
            }).sort((a, b) => {
                return a.startPosition - b.startPosition;
            });

            if (tagsFound.length === 0) {
                break;
            }

            tagMatchData = tagsFound[0];
            let startIndex = offset + tagMatchData.startPosition;
            lastFoundTag = originalText.slice(startIndex, startIndex + tagMatchData.matchLength).trimEnd();

            offset += (tagMatchData.startPosition + tagMatchData.matchLength);
            textAbove = originalText.slice(offset);
        }

        return {
            tagMatchData,
            lastFoundTag,
            textAbove
        }
    }
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

    return getStartBlockOrCodeblockAboveLine(linesAboveArray, [findStartTag]);
}

export function getEndBlockBelow(linesBelow: string[]): string[] {

    // Reduce the array down into a single string so that we can
    // easily RegEx over the string and find the indicies we're looking for.
    let linesBelowStr = linesBelow.reduce((prev, current) => {
        return prev + "\n"  + current;
    }, "");
    let endTagSerachData = findEndTag(linesBelowStr);
    let startTagSearchData = findStartTag(linesBelowStr);

    let sliceEndIndex = -1; // If neither start or end found we return the entire array.
    if(endTagSerachData.found === true && startTagSearchData.found === false) {

        sliceEndIndex = endTagSerachData.startPosition;
    }
    else if(endTagSerachData.found === false && startTagSearchData.found === true) {

        sliceEndIndex = startTagSearchData.startPosition;
    }
    else if(endTagSerachData.found === true && startTagSearchData.found === true) {

        sliceEndIndex = endTagSerachData.startPosition;
        if(startTagSearchData.startPosition < endTagSerachData.startPosition) {

            /**
             * If we found a start tag before an end tag we want to use the start tag
             * our current block is not properly ended and we use the next start tag 
             * as our limit
             */
            sliceEndIndex = startTagSearchData.startPosition;
        }
    }

    return linesBelow.slice(0, sliceEndIndex);
}

export function getStartTagKey(startTag: string): string | null {

    let keySplit = startTag.split(":");
    if(keySplit.length > 1){
        return keySplit[1].replace(" ", "")
    }

    return null;
}


const TAB_HEADER_END_REGEX_STR = "^```$";
const TAB_HEADER_END_REGEX: RegExp = new RegExp(TAB_HEADER_END_REGEX_STR);
export function parseCodeBlockStart(codeBlockLines: string[]): { id: string, index: number} | null {

    let id = null;
    for(let i = 0; i < codeBlockLines.length; i++) {
        let line = codeBlockLines[i];

        if(id === null) {
            let key = line.split(":")[0];
            if(key.toLowerCase() === "region id") {
                id = line.split(":")[1].trim()
            }
        }
        else {
            if(TAB_HEADER_END_REGEX.test(line)) {

                return { id: id, index: i };
            }
        }
    }

    if(id === null) {
        return null;
    }
    else {
        return { id: id, index: -1 }
    }
}
const CODEBLOCK_END_REGEX_STR = "```";
const CODEBLOCK_END_REGEX: RegExp = new RegExp(CODEBLOCK_END_REGEX_STR);
export function findEndOfCodeBlock(text: string): { found: boolean, startPosition: number, endPosition: number, matchLength: number } {

    let found = false;
    let startPosition = -1;
    let matchLength = 0;
    let endPosition = -1;

    let regexData = CODEBLOCK_END_REGEX.exec(text)
    if(regexData !== null && regexData.length > 0) {
        found = true;
        startPosition = regexData.index
        matchLength = regexData[0].length
    }
    endPosition = startPosition + matchLength;

    return { found, startPosition, endPosition, matchLength };
}

export function parseCodeBlockSettings(codeBlockLines: string[]): string {

    let settingsLines = [];
    for(let i = 0; i < codeBlockLines.length; i++) {
        let line = codeBlockLines[i];

        let key = line.split(":")[0];
        if(key.toLowerCase() !== "region id") {
            settingsLines.push(line);
        }
    }

    return settingsLines.join("\n");
}