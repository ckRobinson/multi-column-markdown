/*
 * File: multi-column-markdown/src/MultiColumnParser.ts
 * Created Date: Saturday, January 22nd 2022, 6:02:46 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

const START_REGEX_STRS = ["=== *start-multi-column(:?[a-zA-Z0-9-_\\s]*)?",
                          "=== *multi-column-start(:?[a-zA-Z0-9-_\\s]*)?",
                          "```multi-column-start",
                          "```start-multi-column"]
const START_REGEX_ARR: RegExp[] = [];
for(let i = 0; i < START_REGEX_STRS.length; i++) {
    START_REGEX_ARR.push(new RegExp(START_REGEX_STRS[i]));
}

const START_REGEX_STRS_WHOLE_LINE = ["^=== *start-multi-column(:?[a-zA-Z0-9-_\\s]*)?$",
                                     "^=== *multi-column-start(:?[a-zA-Z0-9-_\\s]*)?$",
                                     "^```multi-column-start$",
                                     "^```start-multi-column$"]
const START_REGEX_ARR_WHOLE_LINE: RegExp[] = [];
for(let i = 0; i < START_REGEX_STRS_WHOLE_LINE.length; i++) {
    START_REGEX_ARR_WHOLE_LINE.push(new RegExp(START_REGEX_STRS_WHOLE_LINE[i]));
}


function findStartTag(text: string): { found: boolean, startPosition: number } {

    let found = false;
    let startPosition = -1;
    for(let i = 0; i< START_REGEX_ARR.length; i++) {

        if(START_REGEX_ARR[i].test(text)) {
            
            // We found a match but is it an actual match or a false positive.
            startPosition = text.search(START_REGEX_STRS[i])

            // Take the text and get the line we found.
            let line = ""
            if(startPosition > 0) {

                // If we arent at the very begining of the file we step back
                // one character to see if we find a newline before this line.
                let lines = text.slice(startPosition - 1).split("\n")

                // if the last char before our match is a newline then we will
                // end up with an empty string in index 0.
                if(lines[0] === "" && lines.length > 1) {
                    line = lines[1]
                }
            }
            else {
                line = text.slice(startPosition).split("\n")[0]
            }

            // now we recheck the regex to make sure the found line is 
            // a true start tag.
            if(START_REGEX_ARR_WHOLE_LINE[i].test(line)) {
                found = true;
                break;
            }
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

export function countStartTags(text: string): { numberOfTags: number, keys: string[] } {

    let keys: string[] = [];
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

    return { numberOfTags: keys.length, keys };
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

    if(startBlockKey === "") {

        let codeBlockData = parseCodeBlockStart(linesAboveArray)
        if(codeBlockData !== null) {
            
            startBlockKey = codeBlockData.id;

            if(codeBlockData.index > 0) {
                linesAboveArray = linesAboveArray.slice(codeBlockData.index + 1);
            }
        }
    }

    return { startBlockKey, linesAboveArray };
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