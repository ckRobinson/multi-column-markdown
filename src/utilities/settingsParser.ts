/**
 * File: /src/utilities/settingsParser.ts                                      
 * Created Date: Friday, June 3rd 2022, 8:16 pm                                
 * Author: Cameron Robinson                                                    
 *                                                                             
 * Copyright (c) 2022 Cameron Robinson                                         
 */

import { HTMLSizing } from "src/utilities/interfaces";
import { MultiColumnSettings, ColumnLayout, BorderOption, ShadowOption, getDefaultMultiColumnSettings, SingleColumnSize, ContentOverflowType, AlignmentType, isColumnLayout, validateColumnLayout, TableAlignOption, TableAlignment } from "../regionSettings";

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
    "single col width",
    "largest column"
];
const COL_SIZE_OPTION_REGEX_ARR: RegExp[] = COL_SIZE_OPTION_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const NUMBER_OF_COLUMNS_STRS = [
    "number of columns",
    "num of cols",
    "col count",
    "column count"
]
const NUMBER_OF_COLUMNS_REGEX_ARR: RegExp[] = NUMBER_OF_COLUMNS_STRS.map(convertStringToSettingsRegex).map((value) => {
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
    "auto layout",
    "fluid div",
    "fluid divs",
    "fluid columns",
    "fluid cols",
    "fluid col"
]
const AUTO_LAYOUT_REGEX_ARR: RegExp[] = AUTO_LAYOUT_SETTING_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});

const COLUMN_SPACING_REGEX_ARR: RegExp[] = [
    "column spacing",
    "column gap",
    "column sep"
].map((value) => {
    return new RegExp(convertStringToSettingsRegex(value), "i");
});

const COLUMN_HEIGHT_REGEX_ARR: RegExp[] = [
    "column height",
    "col height",
    "column max height",
    "col max height",
    "max column height",
    "max col height"
].map((value) => {
    return new RegExp(convertStringToSettingsRegex(value), "i");
});

const CONTENT_OVERFLOW_REGEX_ARR: RegExp[] = [
    "overflow",
    "content overflow"
].map((value) => {
    return new RegExp(convertStringToSettingsRegex(value), "i")
});

const ALIGNMENT_REGEX_ARR: RegExp[] = [
    "alignment",
    "content alignment",
    "align",
    "content align",
    "align content",
    "text align",
    "align text",
    "Text Alignment"
].map((value) => {
    return new RegExp(convertStringToSettingsRegex(value), "i");
});

const TABLE_ALIGNMENT_REGEX_ARR: RegExp[] = [
    "align tables to text alignment"
].map((value) => {
    return new RegExp(convertStringToSettingsRegex(value), "i");
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
            return regexSearchData[1].trim()
        }
    }

    return null;
}

export function parseSingleColumnSettings(settingsStr: string, originalSettings: MultiColumnSettings): MultiColumnSettings {

    originalSettings.columnSize = "medium";
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

        checkSettingIsRegionID(settingsLine, parsedSettings);
        checkSettingIsNumberOfColumns(settingsLine, parsedSettings);
        checkSettingDefinesColumnSize(settingsLine, parsedSettings);
        checkSettingIsDrawBorder(settingsLine, parsedSettings);
        checkSettingIsDrawShadow(settingsLine, parsedSettings);
        checkSettingIsAutoLayout(settingsLine, parsedSettings);
        checkSettingIsColumnSpacing(settingsLine, parsedSettings);
        checkSettingIsContentOverflow(settingsLine, parsedSettings);
        checkSettingIsColumnAlignment(settingsLine, parsedSettings);
        checkSettingIsColumnHeight(settingsLine, parsedSettings);
        checkSettingIsTableAlignment(settingsLine, parsedSettings);
    }

    return parsedSettings;
}

function checkSettingIsNumberOfColumns(settingsLine: string, parsedSettings: MultiColumnSettings) {

    let settingsData = getSettingsDataFromKeys(settingsLine, NUMBER_OF_COLUMNS_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    let settingValues = parseForMultiSettings(settingsData);
    settingsData = settingValues[0];

    let numOfCols = parseInt(settingsData);
    if (Number.isNaN(numOfCols) === false) {
        if (numOfCols >= 1) {
            parsedSettings.numberOfColumns = numOfCols;
        }
    }
}

function checkSettingIsRegionID(settingsLine: string, parsedSettings: MultiColumnSettings) {
    let settingsData = getSettingsDataFromKeys(settingsLine, CODEBLOCK_REGION_ID_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    parsedSettings.columnID = settingsData;
}

function checkSettingDefinesColumnSize(settingsLine: string, parsedSettings: MultiColumnSettings) {

    let settingsData = getSettingsDataFromKeys(settingsLine, COL_SIZE_OPTION_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    let settingValues = parseForMultiSettings(settingsData);
    if(settingValues.length === 1) {
        // If there is only 1 item we attempt to parse out a layout type. If we get a valid item we 
        // return here.
        if (isColumnLayout(settingValues[0])) {
            parsedSettings.columnSize = validateColumnLayout(settingValues[0]);
            return;
        }
    }

    let widths: HTMLSizing[] = []
    for(let setting of settingValues) {

        let parsed = HTMLSizing.parseToSizing(setting.trim());
        if(parsed !== null) {
            widths.push(parsed);
        }
    }

    // If none are parsed properly to a width then we return a default.
    if(widths.length === 0) {
        console.warn("Error parsing column layout or width, defaulting to standard layout.")
        parsedSettings.columnSize = "standard";
        return;
    }

    // If we parsed some lengths and some did not parse properly, the user has either
    // poorly defined their settings or is attempting to break us. Take the first valid option
    // between the two arrays.
    if(widths.length !== settingValues.length) {

        for(let setting of settingValues) {

            let unitData = HTMLSizing.getLengthUnit(setting);
            if(unitData.isValid === true) {
                parsedSettings.columnSize = widths;
                return;
            }

            if (isColumnLayout(settingValues[0])) {
                parsedSettings.columnSize = validateColumnLayout(settingValues[0]);
                return;
            }
        }
    }

    parsedSettings.columnSize = widths;
}

function checkSettingIsDrawBorder(settingsLine: string, parsedSettings: MultiColumnSettings) {

    let settingsData = getSettingsDataFromKeys(settingsLine, DRAW_BORDER_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    let borders: boolean[] = []
    let settingValues = parseForMultiSettings(settingsData);
    for(let settingsData of settingValues) {

        let borderState = true;
        let isBorderDrawn: BorderOption = (<any>BorderOption)[settingsData];
        if (isBorderDrawn !== undefined) {
            switch (isBorderDrawn) {
                case (BorderOption.disabled):
                case (BorderOption.off):
                case (BorderOption.false):
                    borderState = false;
                    break;
            }
        }
        
        borders.push(borderState);
    }

    parsedSettings.drawBorder = borders;
}

function checkSettingIsDrawShadow(settingsLine: string, parsedSettings: MultiColumnSettings) {

    let settingsData = getSettingsDataFromKeys(settingsLine, DRAW_SHADOW_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    let settingValues = parseForMultiSettings(settingsData);
    settingsData = settingValues[0];

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

function checkSettingIsAutoLayout(settingsLine: string, parsedSettings: MultiColumnSettings) {
    
    let settingsData = getSettingsDataFromKeys(settingsLine, AUTO_LAYOUT_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    let settingValues = parseForMultiSettings(settingsData);
    settingsData = settingValues[0];


    if (settingsData === "false" || 
        settingsData === "off"     ) {

        parsedSettings.autoLayout = false;
    }
    parsedSettings.autoLayout = true;
}

function checkSettingIsColumnSpacing(settingsLine: string, parsedSettings: MultiColumnSettings) {
    
    let settingsData = getSettingsDataFromKeys(settingsLine, COLUMN_SPACING_REGEX_ARR);
    if (settingsData === null) {
        return;
    }


    let spacings: string[] = []

    let settingValues = parseForMultiSettings(settingsData);
    for(let settingsData of settingValues) {
        
        let parsed = HTMLSizing.parseToSizing(settingsData.trim());
        let spacingStr = "";
        if (parsed !== null) {
            spacingStr = parsed.toString();
        }
        else {
    
            let noUnitsNum = parseInt(settingsData.trim());
            if (isNaN(noUnitsNum) === false) {
    
                spacingStr = `${noUnitsNum}pt`;
            }
        }
        spacings.push(spacingStr);
    }

    parsedSettings.columnSpacing = spacings;
}

function checkSettingIsContentOverflow(settingsLine: string, parsedSettings: MultiColumnSettings) {
    
    let settingsData = getSettingsDataFromKeys(settingsLine, CONTENT_OVERFLOW_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    let overflowStates: ContentOverflowType[] = []
    let settingValues = parseForMultiSettings(settingsData);

    for(let settingsData of settingValues) {
        
        let overflowType = ContentOverflowType.scroll;
        settingsData = settingsData.toLowerCase().trim();
        if (settingsData === "hidden") {
            overflowType = ContentOverflowType.hidden;
        }
        overflowStates.push(overflowType);
    }
    parsedSettings.contentOverflow = overflowStates;
}

function checkSettingIsColumnAlignment(settingsLine: string, parsedSettings: MultiColumnSettings) {
    
    let settingsData = getSettingsDataFromKeys(settingsLine, ALIGNMENT_REGEX_ARR);
    if (settingsData === null) {
        return;
    }


    let alignments: AlignmentType[] = []

    let settingValues = parseForMultiSettings(settingsData);
    for(let settingsData of settingValues) {
        
        let alignmentType = AlignmentType.left;
        settingsData = settingsData.toLowerCase().trim();
        if (settingsData === "center") {
            alignmentType = AlignmentType.center;
        }
        if (settingsData === "right") {
            alignmentType = AlignmentType.right;
        }
        alignments.push(alignmentType);
    }
    parsedSettings.alignment = alignments;
}

function checkSettingIsTableAlignment(settingsLine: string, parsedSettings: MultiColumnSettings) {
    
    let settingsData = getSettingsDataFromKeys(settingsLine, TABLE_ALIGNMENT_REGEX_ARR);
    if (settingsData === null) {
        return;
    }

    let settingValues = parseForMultiSettings(settingsData);
    settingsData = settingValues[0];

    let tableAlignment: TableAlignOption = (<any>TableAlignOption)[settingsData];
    if (tableAlignment !== undefined) {
        switch (tableAlignment) {
            case (TableAlignOption.disabled):
            case (TableAlignOption.off):
            case (TableAlignOption.false):
                parsedSettings.alignTablesToAlignment = TableAlignment.noAlign;
                break;
            default:
                parsedSettings.alignTablesToAlignment = TableAlignment.align;
        }
    }
}

function checkSettingIsColumnHeight(settingsLine: string, parsedSettings: MultiColumnSettings) {

    let settingsData = getSettingsDataFromKeys(settingsLine, COLUMN_HEIGHT_REGEX_ARR);
    if(settingsData === null) {
        return;
    }

    let settingValues = parseForMultiSettings(settingsData);
    settingsData = settingValues[0];

    let parsed = HTMLSizing.parseToSizing(settingsData.trim());
    if (parsed !== null) {

        parsedSettings.columnHeight = parsed;
    }
    else {

        let noUnitsNum = parseInt(settingsData.trim());
        if (isNaN(noUnitsNum) === false) {

            parsedSettings.columnHeight = HTMLSizing.create().setWidth(noUnitsNum).setUnits("pt")
        }
    }
}

function parseForMultiSettings(originalValue: string): string[] {

    // Parse off brackets. If no brackets we return original value to be parsed as sole value.
    let result = /\[(.*)\]/.exec(originalValue);
    if(result === null) {
        return [originalValue];
    }

    let settingsList: string = result[1];
    let settings: string[] = settingsList.split(",").map((val) => {
        return val.trim();
    })

    return settings;
}

const CODEBLOCK_REGION_ID_REGEX_STRS = [
    "id",
    "region id"
]
const CODEBLOCK_REGION_ID_REGEX_ARR: RegExp[] = CODEBLOCK_REGION_ID_REGEX_STRS.map(convertStringToSettingsRegex).map((value) => {
    return new RegExp(value, "i");
});
export function parseStartRegionCodeBlockID(settingsStr: string): string {

    let codeBlockRegionID = ""
    let settingsLines = settingsStr.split("\n");

    for (let i = 0; i < settingsLines.length; i++) {
        let settingsLine = settingsLines[i];

        let settingsData = getSettingsDataFromKeys(settingsLine, CODEBLOCK_REGION_ID_REGEX_ARR);
        if (settingsData !== null) {

            codeBlockRegionID = settingsData
        }
    }

    return codeBlockRegionID;
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
            return "left"
        case "middle":
        case "middlealigned":
        case "middlealignment":
        case "center":
        case "centeraligned":
        case "centeralignment":
        case "centered":
        case "standard":
            return "center"
        case "right":
        case "rightside":
        case "rightmargin":
        case "rightalign":
        case "rightaligned":
        case "rightalignment":
        case "last":
        case "end":
            return "right"
    }

    return "center"
}

function parseForSingleColumnSize(sizeString: string): SingleColumnSize {

    switch (sizeString = sizeString.toLowerCase().trim().replace(" ", "")) {
        case "small":
        case "sm":
            return "small";
        case "medium":
        case "med":
            return "medium";
        case "large":
        case "lg":
            return "large";
        case "full":
        case "full size":
            return "full";
    }

    return "medium"
}

function convertStringToSettingsRegex(originalString: String): string {

    originalString = originalString.replace(" ", "(?:[-_]| *|)");

    let regexString = `(?:${originalString} *[:=] *)(.*)`;
    return regexString;
}

