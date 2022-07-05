/**
 * File: /src/utilities/settingsParser.ts                                      
 * Created Date: Friday, June 3rd 2022, 8:16 pm                                
 * Author: Cameron Robinson                                                    
 *                                                                             
 * Copyright (c) 2022 Cameron Robinson                                         
 */

import { MultiColumnSettings, ColumnLayout, BorderOption, ShadowOption, getDefaultMultiColumnSettings, SingleColumnSize } from "../regionSettings";

/**
 * Here we define all of the valid settings strings that the user can enter for each setting type.
 * The strings are then mapped twice, first to a valid regex string that searches for the setting
 * name, ignoring all extra spaces and letter case, and then maped to a RegEx object to be used 
 * when parsing.
 */
const COL_POSITION_OPTION_STRS: string[] = [
    "column position",
    "col position",
    "column location",
    "col location",
    "single column location",
    "single column position",
];
const COL_POSITION_REGEX_ARR: RegExp[] = COL_POSITION_OPTION_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const COL_SIZE_OPTION_STRS: string[] = [
    "column size",
    "column width",
    "col size",
    "col width",
    "single column size",
    "single col size",
    "single column width",
    "single col width"
];
const COL_SIZE_OPTION_REGEX_ARR: RegExp[] = COL_SIZE_OPTION_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const NUMBER_OF_COLUMNS_STRS = [
    "number of columns"
]
const NUMBER_OF_COLUMNS_REGEX_ARR: RegExp[] = NUMBER_OF_COLUMNS_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const LARGEST_COLUMN_STRS = [
    "largest column"
]
const LARGEST_COLUMN_REGEX_ARR: RegExp[] = LARGEST_COLUMN_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const DRAW_BORDER_STRS = [
    "border"
]
const DRAW_BORDER_REGEX_ARR: RegExp[] = DRAW_BORDER_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const DRAW_SHADOW_STRS = [
    "shadow"
]
const DRAW_SHADOW_REGEX_ARR: RegExp[] = DRAW_SHADOW_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const AUTO_LAYOUT_SETTING_STRS = [
    "auto layout"
]
const AUTO_LAYOUT_REGEX_ARR: RegExp[] = AUTO_LAYOUT_SETTING_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

/**
 * This function searches the settings string through each regex option. If one of the regex
 * values match, it returns the first group found by the regex. This is depended on proper
 * regex formatting which is done by the convertStringToSettingsRegex function defined below.
 * 
 * @param settingsString The value that may match one of the setting options.
 * @param validSettingFormatRegEx The settings options through which to check all options. If one of these regex 
 * values match on the string we break from the loop returning the found value.
 * 
 * @returns the user entered data if the setting is a match, or null if non of the options matched.
 */
function getSettingsDataFromKeys(settingsString: string, validSettingFormatRegEx: RegExp[]): string | null {

    for (let i = 0; i < validSettingFormatRegEx.length; i++) {

        let regexSearchData = validSettingFormatRegEx[i].exec(settingsString)
        if(regexSearchData !== null) {
            return regexSearchData[1]
        }
    }

    return null;
}

export function parseSingleColumnSettings(settingsStr: string, originalSettings: MultiColumnSettings): MultiColumnSettings {

    let settingsLines = settingsStr.split("\n");
    for (let i = 0; i < settingsLines.length; i++) {

        let settingsLine = settingsLines[i];
        let settingsData = getSettingsDataFromKeys(settingsLine, COL_POSITION_REGEX_ARR);
        if (settingsData !== null) {

            originalSettings.columnPosition = parseForSingleColumnLocation(settingsData);
        }

        settingsData = getSettingsDataFromKeys(settingsLine, COL_SIZE_OPTION_REGEX_ARR);
        if (settingsData !== null) {

            originalSettings.columnSize = parseForSingleColumnSize(settingsData)
        }
    }

    return originalSettings;
}

export function parseColumnSettings(settingsStr: string): MultiColumnSettings {

    let parsedSettings = getDefaultMultiColumnSettings();

    let settingsLines = settingsStr.split("\n");

    for (let i = 0; i < settingsLines.length; i++) {
        let settingsLine = settingsLines[i];

        let settingsData = getSettingsDataFromKeys(settingsLine, NUMBER_OF_COLUMNS_REGEX_ARR);
        if (settingsData !== null) {

            let numOfCols = parseInt(settingsData)
            if (Number.isNaN(numOfCols) === false) {
                if (numOfCols >= 1 && numOfCols <= 3) {
                    parsedSettings.numberOfColumns = numOfCols;
                }
            }
        }

        settingsData = getSettingsDataFromKeys(settingsLine, LARGEST_COLUMN_REGEX_ARR)
        if (settingsData !== null) {

            let userDefLayout: ColumnLayout = (<any>ColumnLayout)[settingsData];
            if (userDefLayout !== undefined) {
                parsedSettings.columnLayout = userDefLayout;
                parsedSettings.columnPosition = userDefLayout;
            }
        }

        settingsData = getSettingsDataFromKeys(settingsLine, DRAW_BORDER_REGEX_ARR)
        if (settingsData !== null) {

            let isBorderDrawn: BorderOption = (<any>BorderOption)[settingsData];
            if (isBorderDrawn !== undefined) {
                switch (isBorderDrawn) {
                    case (BorderOption.disabled):
                    case (BorderOption.off):
                    case (BorderOption.false):
                        parsedSettings.drawBorder = false;
                        break;
                }
            }
        }

        settingsData = getSettingsDataFromKeys(settingsLine, DRAW_SHADOW_REGEX_ARR)
        if (settingsData !== null) {

            let isShadowDrawn: ShadowOption = (<any>ShadowOption)[settingsData];
            if (isShadowDrawn !== undefined) {
                switch (isShadowDrawn) {
                    case (ShadowOption.disabled):
                    case (ShadowOption.off):
                    case (ShadowOption.false):
                        parsedSettings.drawShadow = false;
                        break;
                }
            }
        }

        settingsData = getSettingsDataFromKeys(settingsLine, AUTO_LAYOUT_REGEX_ARR)
        if (settingsData !== null) {

            if(settingsData === "true") {
                parsedSettings.autoLayout = true
            }
        }
    }

    return parsedSettings;
}

function parseForSingleColumnLocation(locationString: string): ColumnLayout{

    switch (locationString.toLowerCase().trim().replace(" ", "")) {
        case "left":
        case "leftside":
        case "leftmargin":
        case "leftalign":
        case "leftaligned":
        case "leftalignement":
        case "first":
        case "start":
        case "beginning":
            return ColumnLayout.left
        case "middle":
        case "middlealigned":
        case "middlealignment":
        case "center":
        case "centeraligned":
        case "centeralignment":
        case "centered":
        case "standard":
            return ColumnLayout.center
        case "right":
        case "rightside":
        case "rightmargin":
        case "rightalign":
        case "rightaligned":
        case "rightalignment":
        case "last":
        case "end":
            return ColumnLayout.right
    }

    return ColumnLayout.center
}

function parseForSingleColumnSize(sizeString: string): SingleColumnSize {

    switch (sizeString = sizeString.toLowerCase().trim().replace(" ", "")) {
        case "small":
        case "sm":
            return SingleColumnSize.small;
        case "medium":
        case "med":
            return SingleColumnSize.medium;
        case "large":
        case "lg":
            return SingleColumnSize.large;
    }

    return SingleColumnSize.medium
}

function convertStringToSettingsRegex(originalString: String): string {

    originalString = originalString.replace(" ", " *");
    
    let regexString = `(?:${originalString} *: *)(.*)`;
    console.log(regexString);
    return regexString;
}