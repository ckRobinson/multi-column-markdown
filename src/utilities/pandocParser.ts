import { MultiColumnSettings, getDefaultMultiColumnSettings } from "src/regionSettings";
import { parseColumnSettings } from "./settingsParser";
import { StartTagRegexMatch, defaultStartRegionData } from "./interfaces";


export const PANDOC_ENGLISH_NUMBER_OF_COLUMNS = [
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten"
] as const;
type PandocNumberOfColumnsTuple = typeof PANDOC_ENGLISH_NUMBER_OF_COLUMNS;
export type PandocNumberOfColumns = PandocNumberOfColumnsTuple[number];
export function isPandocNumberOfColumns(value: string): value is PandocNumberOfColumns {
    return PANDOC_ENGLISH_NUMBER_OF_COLUMNS.includes(value as PandocNumberOfColumns);
}
export function validatePandocNumberOfColumns(value: string | PandocNumberOfColumns): PandocNumberOfColumns {
    return (value.toLowerCase() as PandocNumberOfColumns);
}
export function pandocNumberOfColumnsToValue(value: PandocNumberOfColumns): number {
    switch (value) {
        case "two":
            return 2;
        case "three":
            return 3;
        case "four":
            return 4;
        case "five":
            return 5;
        case "six":
            return 6;
        case "seven":
            return 7;
        case "eight":
            return 8;
        case "nine":
            return 9;
        case "ten":
            return 10;
    }
}
const PANDOC_COL_DOT_COUNT_NAME = "colDotCount";
const PANDOC_COL_NODOT_COUNT_NAME = "colCount";
const PANDOC_COL_CONTENT = "colContent";
const PANDOC_COl_SETTINGS = "colSettings";
const PANDOC_REGEX_STR: string = (() => {

    let nums = PANDOC_ENGLISH_NUMBER_OF_COLUMNS.join("|");
    let regex_strings = `:{3,} *(?:\\{ *\\.(?<${PANDOC_COL_DOT_COUNT_NAME}>(?:${nums}|))(?:[-_]|)columns(?<${PANDOC_COl_SETTINGS}>.*)\\}|(?<${PANDOC_COL_NODOT_COUNT_NAME}>(?:${nums}|))(?:[-_]|)columns)(?:[ :]*)$\\n?`;
    return regex_strings;
})();
const PANDOC_REGEX = new RegExp(PANDOC_REGEX_STR, "m");
const PANDOC_OPEN_FENCE_REGEX = /^:{3,} *(?:[a-zA-Z]+|\{.*\})(?:[ :]*)$/m;
const PANDOC_CLOSE_FENCE_REGEX = /^:{3,} *$/m;
export function findPandoc(text: string): PandocRegexData {

    let regexData = PANDOC_REGEX.exec(text);
    if (regexData !== null) {

        let data = defaultPandocRegexData();
        data.found = true;
        data.startPosition = regexData.index;
        data.endPosition = regexData.index + regexData[0].length;

        let regionData = reducePandocRegionToEndDiv(text.slice(data.endPosition));
        data.endPosition += regionData.content.length + regionData.matchLength;
        data.content = regionData.content;
        data.matchLength = data.endPosition - data.startPosition;

        data.userSettings = regexData.groups[PANDOC_COl_SETTINGS] ? regexData.groups[PANDOC_COl_SETTINGS] : "";
        data.columnCount = regexData.groups[PANDOC_COL_DOT_COUNT_NAME] ? regexData.groups[PANDOC_COL_DOT_COUNT_NAME] : regexData.groups[PANDOC_COL_NODOT_COUNT_NAME];
        return data;
    }

    return defaultPandocRegexData();
}
export interface PandocStartData {
    found: boolean;
    userSettings: MultiColumnSettings;
}
export function getPandocStartData(text: string): PandocStartData {

    let data = findPandoc(text);
    if (data.found === false) {
        return {
            found: false,
            userSettings: getDefaultMultiColumnSettings()
        };
    }

    return {
        found: true,
        userSettings: parsePandocSettings(data.userSettings, data.columnCount)
    };
}
export function containsPandoc(text: string): boolean {
    return findPandoc(text).found;
}
export function containsPandocStartTag(text: string): boolean {

    let regexData = PANDOC_REGEX.exec(text);
    if (regexData !== null) {
        return true;
    }
    return false;
}
export function containsPandocEndTag(text: string): boolean {

    let regexData = PANDOC_CLOSE_FENCE_REGEX.exec(text);
    if (regexData !== null) {
        return true;
    }
    return false;
}
export function isValidPandocEndTag(linesAbove: string[], currentLine: string): boolean {

    if (containsPandocEndTag(currentLine) === false) {
        return false;
    }

    let contentText = linesAbove.concat(currentLine).join("\n");
    return reducePandocRegionToEndDiv(contentText).found;
}
export function reducePandocRegionToEndDiv(contentText: string) {

    let workingText = contentText;

    let result = {
        found: false,
        content: workingText,
        matchLength: 0
    };

    let state = 0;
    let offset = 0;
    for (let i = 0; true; i++) {
        if (i > 100) {
            break;
        }

        let fence = getNextPandocFence(workingText);
        if (fence === null) {
            break;
        }

        let result = fence.result;
        if (fence.type === "close") {
            // console.log(workingText.slice(result.index, result.index + result[0].length));
            offset += (result.index + result[0].length);
            state--;
        }
        else {
            // console.log(workingText.slice(result.index, result.index + result[0].length));
            offset += (result.index + result[0].length);
            state++;
        }

        if (state === -1) {
            // We have found our last close tag.
            return buildReturnData(result);
        }

        workingText = contentText.slice(offset);
    }

    function buildReturnData(matchResult: RegExpExecArray) {
        result.content = contentText.slice(0, offset - matchResult[0].length);
        result.matchLength = matchResult[0].length;
        result.found = true;
        return result;
    }

    return result;
}
function getNextPandocFence(workingText: string): { result: RegExpExecArray; type: "open" | "close"; } {

    let openResult = PANDOC_OPEN_FENCE_REGEX.exec(workingText);
    let closeResult = PANDOC_CLOSE_FENCE_REGEX.exec(workingText);

    if (openResult === null && closeResult === null) {
        return null;
    }

    if (openResult === null && closeResult !== null) {
        return {
            result: closeResult,
            type: "close"
        };
    }

    if (closeResult === null && openResult !== null) {
        return {
            result: openResult,
            type: "open"
        };
    }

    if (closeResult.index < openResult.index) {
        return {
            result: closeResult,
            type: "close"
        };
    }
    else {
        return {
            result: openResult,
            type: "open"
        };
    }
}
export function findPandocStart(text: string): StartTagRegexMatch {

    let startRegion = defaultStartRegionData();
    startRegion.regionType = "PADOC";

    let regexData = PANDOC_REGEX.exec(text);
    if (regexData !== null && regexData.length > 0) {

        startRegion.found = true;
        startRegion.startPosition = regexData.index;
        startRegion.matchLength = regexData[0].length;
        startRegion.endPosition = startRegion.startPosition + startRegion.matchLength;
    }

    return startRegion;
}
export interface PandocRegexData extends StartTagRegexMatch {
    found: boolean;
    startPosition: number;
    endPosition: number;
    content: string;
    userSettings: string;
    columnCount: string;
}
function defaultPandocRegexData(): PandocRegexData {
    return {
        found: false,
        startPosition: -1,
        endPosition: -1,
        matchLength: 0,
        content: "",
        userSettings: "",
        columnCount: "",
        regionType: "PADOC"
    };
}

const PANDOC_SETTING_REGEX = /(?<settingName>[^ ]*)=(?<settingValue>".*"|[^ =]*)/;
export function parsePandocSettings(pandocUserSettings: string, colCount: string = ""): MultiColumnSettings {

    //TODO: Add option for column rule. 

    let defaultSettings = getDefaultMultiColumnSettings();
    let colCountDefined = false;
    if (colCount !== "" && isPandocNumberOfColumns(colCount)) {
        colCountDefined = true;
        defaultSettings.numberOfColumns = pandocNumberOfColumnsToValue(validatePandocNumberOfColumns(colCount));
    }

    if (pandocUserSettings.replace(" ", "") === "") {
        return defaultSettings;
    }

    let workingString = pandocUserSettings;
    let regexValue = PANDOC_SETTING_REGEX.exec(workingString);
    let settingList = ""
    for (let i = 0; regexValue !== null; i < 100) {

        let settingName = regexValue.groups['settingName'];
        let settingValue = regexValue.groups['settingValue'];
        settingList += `${settingName}: ${settingValue}\n`

        workingString = workingString.slice(regexValue.index + regexValue[0].length);
        regexValue = PANDOC_SETTING_REGEX.exec(workingString);
    }

    let parsedSettings = parseColumnSettings(settingList)
    if(colCountDefined) {
        parsedSettings.numberOfColumns = defaultSettings.numberOfColumns
    }

    return parsedSettings;
}