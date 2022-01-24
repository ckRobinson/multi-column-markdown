export type DivKey = {
    keyText: string,
    startIndex: number,
    endIndex: number, 
    getKeyWithOffset: (offset: number) => string
}

function createDivKey(keyText: string, startIndex: number, endIndex: number, ): DivKey {
    
    function getKeyWithOffset(offset: number): string {
        return (startIndex + offset) + keyText + (endIndex + offset)
    }

    return {keyText: keyText, startIndex: startIndex, endIndex: endIndex, getKeyWithOffset: getKeyWithOffset}
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

enum BorderOption {
    enabled,
    on,
    true,
    disabled,
    off,
    false
}

export type MultiColumnSettings = {
    numberOfColumns: number,
    columnLayout: ColumnLayout,
    drawBorder: boolean
}

export type MultiColumnParser = {
    containsStartTag: (text: string) => { found: boolean, startPosition: number },
    containsEndTag: (text: string) => { found: boolean, startPosition: number, tagLength: number  },
    formatDivText: (text: string) => string,
    parseColumnSettings: (text: string) => {text: string, settings: MultiColumnSettings},
    parseDivText: (linesToHide: string[]) => {keys: DivKey[], originals: string[]},
    splitTextByColumn: (originalText: string, numberOfRequestedColumns: number) => string[],
    getEndBlockBelowLine: (stringsToFilter: string[], includeEndTag?: boolean) => string[],
    getStartBlockAboveLine: (linesAboveArray: string[]) => { startBlockKey: string, linesAboveArray: string[] }
}

export function createMultiColumnParser(): MultiColumnParser {
    
    // TODO: Set these up to be customizable in settings?
    // TODO: Set up optional start and end with shorter tag?
    // TODO: Update parser to check toLowerCase on text?

    const START_REGEX_STRS = ["=== start-multi-column:[a-zA-Z0-9-_]*(\\s[\\s\\S]+)?",
                              "=== multi-column-start:[a-zA-Z0-9-_]*(\\s[\\s\\S]+)?"]
    const START_REGEX_ARR: RegExp[] = [];
    for(let i = 0; i < START_REGEX_STRS.length; i++) {
        START_REGEX_ARR.push(new RegExp(START_REGEX_STRS[i]));
    }

    function containsStartTag(text: string): { found: boolean, startPosition: number } {

        let found = false;
        let startPosition = -1;

        for(let i = 0; i< START_REGEX_STRS.length; i++) {

            if(START_REGEX_ARR[i].test(text)) {
                found = true;
                startPosition = text.search(START_REGEX_STRS[i])
                break;
            }
        }

        return { found: found, startPosition: startPosition };    
    }

    const END_REGEX_STRS = ["=== end-multi-column(\\s[\\s\\S]+)?",
                            "=== multi-column-end(\\s[\\s\\S]+)?"]
    const END_REGEX_ARR: RegExp[] = [];
    for(let i = 0; i < END_REGEX_STRS.length; i++) {
        END_REGEX_ARR.push(new RegExp(END_REGEX_STRS[i]));
    }
    function containsEndTag(text: string): { found: boolean, startPosition: number, tagLength: number  } {

        let found = false;
        let startPosition = -1;
        let tagLength = -1;

        for(let i = 0; i< END_REGEX_STRS.length; i++) {

            if(END_REGEX_ARR[i].test(text)) {
                found = true;
                startPosition = text.search(END_REGEX_STRS[i])

                tagLength = text.slice(startPosition).split("\n")[0].length;
                break;
            }
        }

        return { found: found, startPosition: startPosition, tagLength: tagLength };    
    }


    const COL_REGEX_STRS: string[] = ["=== column-end ===",
                                      "=== end-column ==="];
    const COL_REGEX_ARR: RegExp[] = [];
    for(let i = 0; i < COL_REGEX_STRS.length; i++) {
        COL_REGEX_ARR.push(new RegExp(COL_REGEX_STRS[i]));
    }
    function containsColEndTag(text: string): { found: boolean, startPosition: number } {

        let found = false;
        let startPosition = -1;

        for(let i = 0; i< COL_REGEX_STRS.length; i++) {

            if(COL_REGEX_ARR[i].test(text)) {
                found = true;
                startPosition = text.search(COL_REGEX_STRS[i])
                break;
            }
        }

        return { found: found, startPosition: startPosition };    
    }

    const COL_SETTINGS_REGEX_STRS = ["```settings(\\s[\\s\\S]+)?",
                                     "```column-settings(\\s[\\s\\S]+)?",
                                     "```multi-column-settings(\\s[\\s\\S]+)?"];
    const COL_SETTINGS_REGEX_ARR: RegExp[] = [];
    for(let i = 0; i < COL_SETTINGS_REGEX_STRS.length; i++) {
        COL_SETTINGS_REGEX_ARR.push(new RegExp(COL_SETTINGS_REGEX_STRS[i]));
    }
    function containsColSettingsTag(text: string): { found: boolean, startPosition: number } {

        let found = false;
        let startPosition = -1;

        for(let i = 0; i< COL_SETTINGS_REGEX_STRS.length; i++) {

            if(COL_SETTINGS_REGEX_ARR[i].test(text)) {
                found = true;
                startPosition = text.search(COL_SETTINGS_REGEX_STRS[i])
                break;
            }
        }

        return { found: found, startPosition: startPosition };    
    }

    function parseColumnSettings(text: string): {text: string, settings: MultiColumnSettings} {

        // Set the minimum number of columnds to 2.
        let numberOfColumns = 2;
        let columnLayout: ColumnLayout = ColumnLayout.standard
        let borderDrawn: boolean = true;

        // Check if there is a settings block in the text.
        let columnSettingsSearch = containsColSettingsTag(text);
        if(columnSettingsSearch.found === true) {

            // If the user has defined settings, get the location of the block
            let startBlockIndex = columnSettingsSearch.startPosition;

            // If the user put the block in the middle of the text we dont
            // want to hide all text above the settings.
            let linesBeforeSettings = text.slice(0, startBlockIndex).split("\n");
            let linesIncludingSettings = text.slice(startBlockIndex).split("\n");

            // get each setting line and get the number of lines
            // the settings block takes up.
            let settingsText: string[] = []
            let lineIndex = 1;
            for(let i = 1; i < linesIncludingSettings.length; i++) {

                settingsText.push(linesIncludingSettings[i])

                lineIndex++;

                // When we hit the first ``` ending the settings block
                // we break the loop.
                if(linesIncludingSettings[i].contains("```")) {
                    break;
                }
            }

            // Now we have parsed out the settings data we want to remove the block
            // from the text so it isnt rendered to the preview window.
            let linesAfterSettings = linesIncludingSettings.slice(lineIndex + 1)
            text = linesBeforeSettings.concat(linesAfterSettings).reduce((prev, current) => {
                return prev + "\n" + current;
            }, "")

            for(let i = 0; i < settingsText.length; i++) {
                if(settingsText[i].toLowerCase().replace(/\s/g, "").contains("numberofcolumns:")) {
                    let userDefNumberOfCols = parseInt(settingsText[i].split(":")[1])

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

            for(let i = 0; i < settingsText.length; i++) {
                if(settingsText[i].toLowerCase().replace(/\s/g, "").contains("largestcolumn:")) {

                    let setting = settingsText[i].split(":")[1].trimStart().trimEnd().toLowerCase();
                    let userDefLayout: ColumnLayout = (<any>ColumnLayout)[setting]

                    if(userDefLayout !== undefined) {
                        columnLayout = userDefLayout;
                    }
                }
            }

            for(let i = 0; i < settingsText.length; i++) {
                if(settingsText[i].toLowerCase().replace(/\s/g, "").contains("border:")) {

                    let setting = settingsText[i].split(":")[1].trimStart().trimEnd().toLowerCase();
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
        }

        return { text, settings: { numberOfColumns, columnLayout, drawBorder: borderDrawn } }
    }

    /**
     * This function takes in a string for text to be placed into a div and
     * properly formats it to be used as a key for the div. 
     * 
     * @param text the string over which we want to format properly.
     * @returns the text passed with any of the necessary formatting finished.
     * 
     * TODO: Make sure there isn't some other type of text we need to 
     * handle here.
     */
    function formatDivText(text: string) {
            
        if(text.contains("```\n") && text.contains("\n```")) {
            text = text.replace("```\n", "").replace("\n```", "") + "\nCopy";
        }

        return text
    }

    function parseDivText(linesToHide: string[]): {keys: DivKey[], originals: string[]} {
        let keys: DivKey[] = []; // The key strings used in the map above.
        let originals: string[] = []; // Stores the original text without the markdown info removed.
        let currentDivText = "" // The current working text being created in the loop.
        let startIndex = 0;
        let endIndex = 0;

        /**
         * Closure to make pushing new keys to the array more clean. This
         * currently checks if the data we parsed out is a code block and 
         * properly formats the text accordingly. 
         */
        function pushKey() {
            
            originals.push(currentDivText);
            
            currentDivText = formatDivText(currentDivText)
            
            keys.push(createDivKey(currentDivText, startIndex, endIndex));
        }

        let index = 0;
        for(let i = 0; i < linesToHide.length; i++) {

            /**
             * If the line passed is empty and our current line is not empty 
             * we have completed a key. (Because of how obsidian handles its 
             * text in blocks separated by an empty line.) So we push the key
             * to the list and reset the accumulator.
             */ 
            if(linesToHide[i] === "" && currentDivText !== "") {
                
                endIndex = index - 1;
                
                pushKey()
                
                currentDivText = ""
                pushKey()

                startIndex = 0;
                endIndex = 0;
            }
            else if(linesToHide[i] === "") {

                currentDivText = ""
                pushKey()
            }
            else if(currentDivText != "") {
                // else if we have begun a new line we just append with a new line in between
                currentDivText = currentDivText + "\n" + linesToHide[i]
                index++;
            }
            else {
                // finally if the current text is empty just set the text to the line.
                currentDivText = linesToHide[i]
                startIndex = index;
                index++;
            }
        }
        // Push the last key if it isnt empty.
        if(currentDivText !== "") {
            let lines = currentDivText.split("\n").length;
            endIndex = index + lines;
            pushKey()
        }
        
        return { keys: keys, originals: originals };
    }

    function splitTextByColumn(originalText: string, numberOfRequestedColumns: number): string[] {

        let columns: string[] = []

        // If we want 2 columns we only want to search 1 time. Anything left over goes in the second column.
        let numColumnsToFind = 1;
        if(numberOfRequestedColumns >= 2) {
            numColumnsToFind = numberOfRequestedColumns - 1
        }

        let tempText = originalText;
        for(let i = 0; i < numColumnsToFind; i++) {  

            let columnEndSearch = containsColEndTag(tempText);
            if(columnEndSearch.found === true) {

                let startIndex = columnEndSearch.startPosition;

                let columnText = tempText.slice(0, startIndex);
                columns.push(columnText);

                tempText = tempText.slice(startIndex).split("\n").splice(1).reduce((prev, current) => {
                    return prev + "\n" + current;
                }, "");
            }
        }
        columns.push(tempText); // Push the remaining data for the last column


        return columns;
    }

    /**
     * This function is called to get all between the start of the passed data
     * and an end tag. Will return either the same array of strings or a new 
     * array with any lines after the first end tag filtered out.
     * 
     * @param stringsToFilter The array of strings over which we are to search. The function will look for the first instance of the end tag and give all lines from 0 to endTagIndex.
     * @param includeEndTag Should the end tag line be included. In some cases we want to return the array with the end tag line included in the result, other times it should be excluded. The default state is to exclude the end tag line.
     * @returns An array of strings from the first index of the passed array up until the first end tag found. (Also breaks on a different start tag so we don't recursively split the columns.)
     */
    function getEndBlockBelowLine(stringsToFilter: string[], includeEndTag: boolean = false): string[] {

        // Reduce the array down into a single string so that we can
        // easily RegEx over the string and find the indicies we're looking for.
        let linesBelowStr = stringsToFilter.reduce((prev, current) => {
            return prev + "\n"  + current;
        }, "");

        /*
         * First we want to check if there is an end tag in the reduced string.
         * If so we want to get the index of the end tag (possibly with the end
         * tag line included.)
         * 
         * Otherwise if there is no end tag we search for another start tag. If
         * another start tag exists we get that index so we don't recusivly 
         * include another multi column block within our block.
         */
        let endTagIndex = -1;
        let endTagSearchData = containsEndTag(linesBelowStr);
        let startTagSearchData = containsStartTag(linesBelowStr);
        if(endTagSearchData.found === true) {

            endTagIndex = endTagSearchData.startPosition

            if(includeEndTag) {
                endTagIndex = endTagIndex + "--- TEST-END".length; //TODO: Update to end tag when changed.
            }
        }
        else if(startTagSearchData.found === true) {

            endTagIndex = startTagSearchData.startPosition;
        }

        /*
         * If we found a tag we slice out the data from 0 to endTagIndex and then
         * split the data by newline to convert back into an array of strings.
         */
        if(endTagIndex !== -1) {
            stringsToFilter = linesBelowStr.slice(0, endTagIndex).split("\n")
        }
        
        return stringsToFilter
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
    function getStartBlockAboveLine(linesAboveArray: string[]): { startBlockKey: string, 
                                                         linesAboveArray: string[] } {

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
        let endTagSerachData = containsEndTag(linesAboveStr);
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
            endTagSerachData = containsEndTag(linesAboveStr);
        }

        /**
         * Now we have the set of lines after all other end tags. We now
         * need to check if there is still a start tag left in the data. If 
         * there is no start tag then we want to return an empty array and empty 
         * key.
         */ 
        let startBlockKey = "";
        let startTagSearchData = containsStartTag(linesAboveStr);
        if(startTagSearchData.found === false) {
            linesAboveArray = []
            return { startBlockKey, linesAboveArray }
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
    
                startBlockKey = linesAboveArray[0].split(":")[1]
    
                linesAboveArray = linesAboveArray.splice(1)
                linesAboveStr = linesAboveArray.reduce((prev, current) => {
                    return prev + "\n"  + current;
                }, "");

                startTagSearchData = containsStartTag(linesAboveStr);
            }
        }

        return { startBlockKey, linesAboveArray };
    }

    return { splitTextByColumn: splitTextByColumn, 
        getEndBlockBelowLine: getEndBlockBelowLine, 
        getStartBlockAboveLine: getStartBlockAboveLine,
        containsStartTag: containsStartTag,
        containsEndTag: containsEndTag,
        formatDivText: formatDivText,
        parseDivText: parseDivText,
        parseColumnSettings: parseColumnSettings }
}