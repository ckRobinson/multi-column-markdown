import { App, Plugin, MarkdownRenderChild, MarkdownRenderer } from 'obsidian';

export default class MyPlugin extends Plugin {
	// settings: SplitColumnMarkdownSettings;

    // TODO: Set these up to be customizable in settings?
    // TODO: Set up optional start and end with shorter tag?
    // TODO: Update parser to check toLowerCase on text?
    START_REGEX_STR = `=== start-split-column:[a-zA-Z0-9]*(\\s[\\s\\S]+)?`
    END_REGEX_STR = `=== end-split-column(\\s[\\s\\S]+)?`
    COL_REGEX_STR = "=== column-end ===";
    COL_SETTINGS_REGEX_STR = "```column-settings(\\s[\\s\\S]+)?";

    splitColumnParser: splitColumnParser = undefined;

	async onload() {

        this.splitColumnParser = createSplitColumnParser(this.START_REGEX_STR, this.END_REGEX_STR, this.COL_REGEX_STR, this.COL_SETTINGS_REGEX_STR);
        this.enableMarkdownProcessor();
	}

    enableMarkdownProcessor() {
        /**
         * Value type structure rather than a reference type class used to
         * keep track of the parent divs within the DOM.
         */
        type splitColumnParent = {
            key: string,
            el: HTMLElement,
            sourcePath: string,
            childRemoved: (divMapID: string) => void,
            rendererUpdated: () => void
        }

        /**
         * This function acts as a constructor for the splitColumnParent type above.
         * It captures all of the passed data as well as defines the nessecary 
         * functions to be captured as closures before returning a new object.
         * 
         * @param key the key for the splitColumnParent within the document map.
         * @param el the htmlelement within the DOM. Used to update the dom when needed.
         * @param sourcePath the path of the file we're in, used for linking to other pages. (I think.)
         * 
         * =====
         * 
         * All other parameters below are not currently used, They are a work in progress
         * for updating the DOM when a child element is deleted without the renderer updating.
         * 
         * @param lineStart 
         * @param renderErrorRegion 
         * @param app 
         * @param splitColumnParser 
         * @param hideColumnDivs 
         * @param setUpColumnMarkdown 
         * @param parseDivText 
         * 
         * @returns a new splitColumnParent structure.
         */
        function createSplitColContainer(key: string, el: HTMLElement, lineStart: number, sourcePath: string, renderErrorRegion: HTMLDivElement, app: App, splitColumnParser: splitColumnParser,
            hideColumnDivs: (linesToHide: string[], divMap: Map<string, {text: string, el: HTMLElement}>, parseDivText: (lines: string[]) => {keys: divKey[], originals: string[]}, indexOffset?: number) => void,
            setUpColumnMarkdown: (parentElement: HTMLElement, textFromStart: string, sourcePath: string, splitColumnParser: splitColumnParser, settings: splitColumnSettings) => void,
            parseDivText: (lines: string[]) => {keys: divKey[], originals: string[]}): splitColumnParent {

            /**
             * When one of our split column blocks is updated within the DOM we
             * call this function. It resets the error message over the
             * block because the renderer will be refreshed at that point.
             */
            function rendererUpdated() {
                renderErrorRegion.innerText = "";
            }

            /**
             * This function is called when a child div is removed from the DOM
             * but the renderer is not updated. Something like cutting out a block
             * of text will make this occur. Here we ideally want to refresh the
             * preview DOM to match the changes. However for right now we display
             * an error to the user that the preview renderer does not match
             * the expected output. This is really only an issue when the user
             * has an editor and preview leaf open.
             * 
             * ======
             * 
             * TODO: Idea: Rather than attempting to refresh the entire text
             * cache on update. We just want to update the required portion
             * of the cache that contains the updated text. Something like
             * slicing out the old text from the cache and rebuilding from 
             * the newly updated DOM. Will require storing more info about
             * the column's children in a struct or class but seems do-able.
             * 
             * @param divMapID This is the ID of the item being removed from the 
             * DOM. The ID is created when the child is initially rendered and 
             * used here to retrieve their data so we can know what has changed 
             * within the DOM.
             */
            function childRemoved(divMapID: string) {

                renderErrorRegion.innerText = "Encountered error rendering split column markdown. Refresh the preview window or make another change to the file."
            }

            return {key: key, el: el, sourcePath:sourcePath, childRemoved: childRemoved, rendererUpdated: rendererUpdated }
        }


        const columnContainerMap: Map<string, splitColumnParent> = new Map();
        const divMap: Map<string, {text: string, el: HTMLElement}> = new Map();

        // Used to determine if a div was updated in the last draw call or not. 
        // if we reach the elementUnloaded callback below and redererUpdated is
        // false then we know we have to handle the re-rendering of the preview
        // window ourselves.
        let renderUpdated = false;
        function elementUnloaded(divMapID: string, onUnload?: ()=>void) {
            if(renderUpdated === false) {
                if(onUnload) {
                    onUnload()
                }
                // console.log("Nothing updated, updating in callback.")
                divMap.delete(divMapID);
            }
            else {
                divMap.delete(divMapID);
            }
            renderUpdated = false
        }

        this.registerMarkdownPostProcessor(async (el, ctx) => {

            // Get the info for our current context and then check
            // if the entire text contains a start tag. If there is
            // no start tag in the document we can just return and
            // ignore the rest of the parsing.
            let info = ctx.getSectionInfo(el);
            let elementMarkdownRenderer = null;
            let divMapID = ""

            const sourcePath =
            typeof ctx == "string"
                ? ctx
                : ctx?.sourcePath ??
                    this.app.workspace.getActiveFile()?.path ??
                    "";    

            // Whenever there is an update to the document window we
            // want to capture the div being rendered so we can use it ourselves
            // this currently is mostly used to render an error when the div is
            // removed but not updated. Working on re-rendering the data to the
            // screen if the data has been updated.
            if(info){

                let index = 0;
                let allTextLines = info.text.split("\n");
                for(let i = 0; i < info.lineStart; i++) {

                    if(allTextLines[i] !== "") {
                        index++;
                    }
                }
                let startLine = index;
                let endLine = startLine + ((info.lineEnd) - info.lineStart);

                let text = info.text.split("\n").slice(info.lineStart, info.lineEnd + 1).reduce((prev, curr) => {
                    return prev + "\n" + curr
                }, "")
    

                text = this.splitColumnParser.formatDivText(text);
                if(text.startsWith("\n")) {
                    text = text.slice(1, text.length);
                }
    
                divMapID = startLine + text + endLine;
                divMap.set(divMapID, {text: text, el: el });
                elementMarkdownRenderer = new MarkdownRenderChild(el);
                elementMarkdownRenderer.onunload = () => {
                    elementUnloaded(divMapID);
                };
                ctx.addChild(elementMarkdownRenderer);

                // We want to check here if there is a start tag in the documnet
                // and if not we can immediatly exit the function.
                if(this.splitColumnParser.containsStartTag(info.text) === false) {
                    return;
                }
            }
            else {
                return;
            }

            // Check if the line currently passed to processor contains the 
            // start regex that we want. If so we need to store a reference
            // to the element and the context to be used later.
            if(this.splitColumnParser.containsStartTag(el.textContent) === true) {

                // If our regex matches we can split the data by - to 
                // get the column identifier. We use this to store in
                // our map to know what div to store our markdown in
                // when later the data is updated within the block.
                let key = el.textContent.split(":")[1]

                // remove the text from the container so it does not
                // appear in the render and set the ID.
                // Also set the proper CSS classes here.
                el.id = `TwoColumnContainer-${key}`
                el.children[0].detach();
                el.classList.add("splitColumnContainer")

                let renderErrorRegion = el.createDiv({
                    cls: `splitColumnErrorMessage`,
                });
                let renderColumnRegion = el.createDiv({
                    cls: `RenderColRegion`
                })

                columnContainerMap.set(key, createSplitColContainer(key, renderColumnRegion, info.lineStart, sourcePath, renderErrorRegion, this.app, this.splitColumnParser, this.hideColumnDivs, this.setUpColumnMarkdown, this.splitColumnParser.parseDivText));

                // Take the entire document and get the data starting from our start tag.
                let linesBelowArray = info.text.split("\n").splice(info.lineStart + 1);

                // Now pass to a parser to find our end tag, another start tag (no recursion), or the end of the file.
                // We want it to include the end tag so we can hide any divs below us if needed.
                let linesBelowArrayIncEnd = this.splitColumnParser.getEndBlockBelowLine(linesBelowArray, true);
                this.hideColumnDivs(linesBelowArrayIncEnd, divMap, this.splitColumnParser.parseDivText, info.lineStart + 1);

                // Now slice off the end tag so we have an array of just the text to be displayed to the screen.
                linesBelowArray = linesBelowArray.slice(0, linesBelowArray.length - 1);
                linesBelowArray = this.splitColumnParser.getEndBlockBelowLine(linesBelowArray);

                // Reduce the text back to a single string.
                let textFromStart = linesBelowArray.reduce((prev, current) => {
                    return prev + "\n"  + current;
                }, "");

                // Parse out a settings block if one exists.
                let settingsData = this.splitColumnParser.parseColumnSettings(textFromStart);
                textFromStart = settingsData.text;

                // Pass all necessary data to the renderer.
                this.setUpColumnMarkdown(renderColumnRegion, textFromStart, sourcePath, this.splitColumnParser, settingsData.settings);

                renderUpdated = true;
                return;
            }

            // If our current line is an end tag we want to set the data to
            // everything above us in the current block.
            if(this.splitColumnParser.containsEndTag(el.textContent) === true) {

                let initialLinesAboveArray = info.text.split("\n").splice(0, info.lineStart);
                let { startBlockKey, linesAboveArray } = this.splitColumnParser.getStartBlockAboveLine(initialLinesAboveArray);

                // Attempt to get parent from the map, if it doesnt exist s
                // something went wrong so we want to return immediatly.
                let parent: splitColumnParent = null;
                if(columnContainerMap.has(startBlockKey)) {
                    parent = columnContainerMap.get(startBlockKey);
                }
                else {
                    return;
                }
                
                elementMarkdownRenderer.onunload = () => {
                    elementUnloaded(divMapID, ()=>{
                        parent.childRemoved(divMapID);
                    });
                };

                this.hideColumnDivs(linesAboveArray, divMap, this.splitColumnParser.parseDivText);

                // Concat and filter down all of the lines we want to display.
                let textFromStart = linesAboveArray.reduce((prev, current) => {
                    return prev + "\n"  + current;
                }, "");

                el.children[0].detach()

                let settingsData = this.splitColumnParser.parseColumnSettings(textFromStart);
                textFromStart = settingsData.text;

                this.setUpColumnMarkdown(parent.el, textFromStart, sourcePath, this.splitColumnParser, settingsData.settings);

                renderUpdated = true;
                parent.rendererUpdated();

                return;
            }

            // else if the line we are parsing does not contain a start tag
            // but there is at least one start tag on the page we want to 
            // then check if the line we are parsing is within a column
            // block.
            //
            // Take the entire document text and split it by new lines.
            // Then we get the set of lines above our start line.
            // Then we reduce back down to a single string of all lines above.
            let initialLinesAboveArray = info.text.split("\n").splice(0, info.lineStart);
            let { startBlockKey, linesAboveArray } = this.splitColumnParser.getStartBlockAboveLine(initialLinesAboveArray);
            
            if(startBlockKey === "") {
                // We are not within a split column block so we just return here.
                return;
            }

            // Attempt to get parent from the map, if it doesnt exist
            // something went wrong so we want to return immediatly.
            let parent: splitColumnParent = null;
            if(columnContainerMap.has(startBlockKey)) {
                parent = columnContainerMap.get(startBlockKey);
            }
            else {
                return;
            }
            elementMarkdownRenderer.onunload = () => {
                elementUnloaded(divMapID, ()=>{
                    parent.childRemoved(divMapID)
                });
            };

            let linesBelowArray = info.text.split("\n").splice(info.lineStart);
            linesBelowArray = this.splitColumnParser.getEndBlockBelowLine(linesBelowArray);

            // Concat and filter down all of the lines we want to display.
            let textFromStart = linesAboveArray.concat(linesBelowArray).reduce((prev, current) => {
                return prev + "\n"  + current;
            }, "");

            el.children[0].detach()

            let settingsData = this.splitColumnParser.parseColumnSettings(textFromStart);
            textFromStart = settingsData.text;

            this.setUpColumnMarkdown(parent.el, textFromStart, sourcePath, this.splitColumnParser, settingsData.settings);

            renderUpdated = true;
            parent.rendererUpdated();
            // TODO: Find a way to remove the element from the DOM? Minor "bug" but would like to fix.
            return;
        });
    }

    /**
     * We want to get a list of the text contained within each "sibling"
     * div in the DOM. However there is something about how obsidian
     * works with the divs that make this more difficult to achieve
     * than one would expect. This function is a work around that problem.
     * 
     * Above we set up a callback that creates a map of all of the divs 
     * displayed on the dom. When this function is called we are passed
     * a long text string that contains the text we want to hide from the DOM
     * this text must be parsed to find the proper keys.
     * @param linesToHide 
     * @param divMap 
     */
    hideColumnDivs(linesToHide: string[], divMap: Map<string, {text: string, el: HTMLElement}>, parseDivText: (linesToHide: string[]) => {keys: divKey[], originals: string[]}, indexOffset: number = 0) {

        let { keys } = parseDivText(linesToHide);

        // Now we have a list of the keys to remove from the DOM.
        // and if the key is in the map we set the element's text to empty string.
        // TODO: Should we reset all of the other items in the dom to active? 
        // probably would cause some bugs with enabling data from other areas
        // but currently there is a bug with stuff remaining removed after
        // being hidden in this way.
        for(let i = 0; i < keys.length; i++) {
            let key = keys[i].getKeyWithOffset(indexOffset)
            if(divMap.has(key)) {
                divMap.get(key).el.textContent = ""
            }
        }
    }

    setUpColumnMarkdown(parentElement: HTMLElement, textFromStart: string, sourcePath: string,
        splitColumnParser: splitColumnParser, settings: splitColumnSettings) {

        let splitColumnParent = createDiv({
            cls: `splitColumnParent rowC`,
        });

        let columnContentDivs = [];
        if(settings.numberOfColumns === 2) {

            switch(settings.columnLayout) {
                case(ColumnLayout.standard):
                case(ColumnLayout.middle):
                case(ColumnLayout.center):
                case(ColumnLayout.third):
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent twoEqualColumns_Left`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent twoEqualColumns_Right`
                    }));
                    break;
    
                case(ColumnLayout.left):
                case(ColumnLayout.first):
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent twoColumnsHeavyLeft_Left`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent twoColumnsHeavyLeft_Right`
                    }));
                    break;
    
                case(ColumnLayout.right):
                case(ColumnLayout.second):
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent twoColumnsHeavyRight_Left`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent twoColumnsHeavyRight_Right`
                    }));
                    break;
            }
        }
        else if(settings.numberOfColumns === 3) {

            switch(settings.columnLayout) {
                case(ColumnLayout.standard):
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threeEqualColumns_Left`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threeEqualColumns_Middle`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threeEqualColumns_Right`
                    }));
                    break;

                case(ColumnLayout.left):
                case(ColumnLayout.first):
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyLeft_Left`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyLeft_Middle`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyLeft_Right`
                    }));
                    break;

                case(ColumnLayout.middle):
                case(ColumnLayout.center):
                case(ColumnLayout.second):
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyMiddle_Left`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyMiddle_Middle`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyMiddle_Right`
                    }));
                    break;

                case(ColumnLayout.right):
                case(ColumnLayout.third):
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyRight_Left`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyRight_Middle`
                    }));
                    columnContentDivs.push(splitColumnParent.createDiv({
                        cls: `columnContent threColumnsHeavyRight_Right`
                    }));
                    break;
            }
        }

        // Create markdown renderer to parse the passed markdown
        // between the tags.
        let markdownRenderChild = new MarkdownRenderChild(
            splitColumnParent
        );

        // Remove every other child from the parent so 
        // we dont end up with multiple sets of data. This should
        // really only need to loop once for i = 0 but loop just
        // in case.
        for(let i = 0; i < parentElement.children.length; i++) {
            parentElement.children[i].detach();
        }        
        parentElement.appendChild(markdownRenderChild.containerEl);

        let columnText = splitColumnParser.splitTextByColumn(textFromStart, settings.numberOfColumns);
        // And then render the parsed markdown into the divs.
        for(let i = 0; i < columnContentDivs.length; i++) {
            MarkdownRenderer.renderMarkdown(
                columnText[i],
                columnContentDivs[i],
                sourcePath,
                markdownRenderChild
            );
        }
    }
}

type divKey = {
    keyText: string,
    startIndex: number,
    endIndex: number, 
    getKeyWithOffset: (offset: number) => string
}
function createDivKey(keyText: string, startIndex: number, endIndex: number, ): divKey {
    
    function getKeyWithOffset(offset: number): string {
        return (startIndex + offset) + keyText + (endIndex + offset)
    }

    return {keyText: keyText, startIndex: startIndex, endIndex: endIndex, getKeyWithOffset: getKeyWithOffset}
}

enum ColumnLayout { 
    standard,
    left,
    first,
    center,
    middle,
    second,
    right,
    third
};

type splitColumnSettings = {
    numberOfColumns: number,
    columnLayout: ColumnLayout
}

type splitColumnParser = {
    containsStartTag: (text: string) => boolean,
    containsEndTag: (text: string) => boolean,
    formatDivText: (text: string) => string,
    parseColumnSettings: (text: string) => {text: string, settings: splitColumnSettings},
    parseDivText: (linesToHide: string[]) => {keys: divKey[], originals: string[]},
    splitTextByColumn: (originalText: string, numberOfRequestedColumns: number) => string[],
    getEndBlockBelowLine: (stringsToFilter: string[], includeEndTag?: boolean) => string[],
    getStartBlockAboveLine: (linesAboveArray: string[]) => { startBlockKey: string, linesAboveArray: string[] }
}
function createSplitColumnParser(startRegExString: string, 
    endRegExString: string, 
    columnEndRegExString: string,
    splitColumnRegExString: string): splitColumnParser {
    
    const START_REGEX_STR = startRegExString
    const START_REGEX = new RegExp(START_REGEX_STR);

    const END_REGEX_STR = endRegExString
    const END_REGEX = new RegExp(END_REGEX_STR);

    const COL_REGEX_STR = columnEndRegExString;
    const COL_REGEX = new RegExp(COL_REGEX_STR);

    const COL_SETTINGS_REGEX_STR = splitColumnRegExString;
    const COL_SETTINGS_REGEX = new RegExp(COL_SETTINGS_REGEX_STR);
    
    function containsStartTag(text: string): boolean {
        
        return START_REGEX.test(text);
    }

    function containsEndTag(text: string): boolean {
        
        return END_REGEX.test(text);
    }

    function parseColumnSettings(text: string): {text: string, settings: splitColumnSettings} {

        // Set the minimum number of columnds to 2.
        let numberOfColumns = 2;
        let columnLayout: ColumnLayout = ColumnLayout.standard

        // Check if there is a settings block in the text.
        if(COL_SETTINGS_REGEX.test(text)) {

            // If the user has defined settings, get the location of the block
            let startBlockIndex = text.search(COL_SETTINGS_REGEX_STR);

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
        }

        return { text, settings: { numberOfColumns, columnLayout } }
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

    function parseDivText(linesToHide: string[]): {keys: divKey[], originals: string[]} {
        let keys: divKey[] = []; // The key strings used in the map above.
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

            if(COL_REGEX.test(tempText)) {
                let startIndex = tempText.search(COL_REGEX_STR);
                let columnText = tempText.slice(0, startIndex);
                columns.push(columnText);

                tempText = tempText.slice(startIndex + COL_REGEX_STR.length);
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
         * include another split column block within our block.
         */
        let endTagIndex = -1;
        if(END_REGEX.test(linesBelowStr) === true) {

            endTagIndex = linesBelowStr.search(END_REGEX_STR) 

            if(includeEndTag) {
                endTagIndex = endTagIndex + "--- TEST-END".length; //TODO: Update to end tag when changed.
            }
        }
        else if(START_REGEX.test(linesBelowStr) === true) {

            endTagIndex = linesBelowStr.search(START_REGEX_STR);
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
        while(END_REGEX.test(linesAboveStr) === true) {

            // Get the index of where the first regex match in the
            // string is. then we slice from 0 to index off of the string
            // split it by newline, cut off the first line (which actually
            // contains the regex) then reduce back down to a single string.
            //
            // TODO: This could be simplified if we just slice the text after
            // the end tag instead of the begining.
            let indexOfRegex = linesAboveStr.search(END_REGEX_STR);
            linesAboveArray = linesAboveStr.slice(indexOfRegex).split("\n").splice(1)
            linesAboveStr = linesAboveArray.reduce((prev, current) => {
                return prev + "\n"  + current;
            }, "");
        }

        /**
         * Now we have the set of lines after all other end tags. We now
         * need to check if there is still a start tag left in the data. If 
         * there is no start tag then we want to return an empty array and empty 
         * key.
         */ 
        let startBlockKey = "";
        if(START_REGEX.test(linesAboveStr) === false) {
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
             while(START_REGEX.test(linesAboveStr) === true) {

                // Get the index of where the first regex match in the
                // string is. then we slice from 0 to index off of the string
                // split it by newline, cut off the first line (which actually
                // contains the regex) then reduce back down to a single string.
                //
                // TODO: This could be simplified if we just slice the text after
                // the end tag instead of the begining.
                let startIndex = linesAboveStr.search(START_REGEX_STR);

                linesAboveArray = linesAboveStr.slice(startIndex).split("\n")
    
                startBlockKey = linesAboveArray[0].split(":")[1]
    
                linesAboveArray = linesAboveArray.splice(1)
                linesAboveStr = linesAboveArray.reduce((prev, current) => {
                    return prev + "\n"  + current;
                }, "");
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
