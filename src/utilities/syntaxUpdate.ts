export type SyntaxResult = {
    fileCount: number;
    regionStartCount: number;
    columnBreakCount: number
    columnEndCount: number;
    updatedFileContent: string;
    fileWasUpdated: boolean;
}

export function updateAllSyntax(originalFileContent: string): SyntaxResult {

    let fileCount = 0
    let regionStartCount = 0;
    let columnBreakCount = 0;
    let columnEndCount = 0;

    let fileUpdated = false;
    let { updatedFileContent, numRegionsUpdated } = updateColumnCodeblockStartSyntax(originalFileContent);
    if(numRegionsUpdated > 0) {
        fileCount++;
        fileUpdated = true;
        regionStartCount += numRegionsUpdated
    }

    let colStart = updateColumnStartSyntax(updatedFileContent)
    if(colStart.numRegionsUpdated) {
        if(fileUpdated === false) {
            fileUpdated = true;
            fileCount++;
        }
        updatedFileContent = colStart.updatedFileContent
        regionStartCount += colStart.numRegionsUpdated
    }

    let colBreak = updateColumnBreakSyntax(updatedFileContent)
    if(colBreak.numRegionsUpdated) {
        if(fileUpdated === false) {
            fileUpdated = true;
            fileCount++;
        }
        updatedFileContent = colBreak.updatedFileContent
        columnBreakCount += colBreak.numRegionsUpdated
    }

    let colEnd = updateColumnEndSyntax(updatedFileContent)
    if(colEnd.numRegionsUpdated) {
        if(fileUpdated === false) {
            fileUpdated = true;
            fileCount++;
        }
        updatedFileContent = colEnd.updatedFileContent
        columnEndCount += colEnd.numRegionsUpdated;   
    }

    return {
        fileCount: fileCount,
        regionStartCount: regionStartCount,
        columnBreakCount: columnBreakCount,
        columnEndCount: columnEndCount,
        updatedFileContent: updatedFileContent,
        fileWasUpdated: updatedFileContent !== originalFileContent
    }
}

const OLD_COL_END_SYNTAX_REGEX = /=== *(end-multi-column|multi-column-end)/g
function updateColumnEndSyntax(originalFileContent: string): { updatedFileContent: string,
                                                                 numRegionsUpdated: number } {
    let matches = Array.from(originalFileContent.matchAll(OLD_COL_END_SYNTAX_REGEX))

    let updatedFileContent = originalFileContent;
    let offset = 0;
    
    for(let match of matches) {    
        let startIndex = match.index + offset
        let matchLength = match[0].length
        let endIndex = startIndex + matchLength;

        let columnEndSyntax = match[1]        
        let replacementText = `--- ${columnEndSyntax}`
        offset += replacementText.length - matchLength

        updatedFileContent = updatedFileContent.slice(0, startIndex) + replacementText + updatedFileContent.slice(endIndex)
        console.groupCollapsed()
        console.log("Original File:\n\n", originalFileContent)
        console.log("Updated File:\n\n", updatedFileContent)
        console.groupEnd()      
    }
    return {
        updatedFileContent: updatedFileContent,
        numRegionsUpdated: matches.length
    }                                           
}

const OLD_COL_BREAK_SYNTAX_REGEX = /===\s*?(column-end|end-column|column-break|break-column)\s*?===\s*?/g
function updateColumnBreakSyntax(originalFileContent: string): { updatedFileContent: string,
                                                                 numRegionsUpdated: number } {
    let matches = Array.from(originalFileContent.matchAll(OLD_COL_BREAK_SYNTAX_REGEX))

    let updatedFileContent = originalFileContent;
    let offset = 0;
    
    for(let match of matches) {    
        let startIndex = match.index + offset
        let matchLength = match[0].length
        let endIndex = startIndex + matchLength;

        let columnBreakSyntax = match[1]        
        let replacementText = `--- ${columnBreakSyntax} ---`
        offset += replacementText.length - matchLength

        updatedFileContent = updatedFileContent.slice(0, startIndex) + replacementText + updatedFileContent.slice(endIndex)
        console.groupCollapsed()
        console.log("Original File:\n\n", originalFileContent)
        console.log("Updated File:\n\n", updatedFileContent)
        console.groupEnd()      
    }
    return {
        updatedFileContent: updatedFileContent,
        numRegionsUpdated: matches.length
    }                                           
}

const OLD_COL_START_SYNTAX_REGEX = /=== *(start-multi-column|multi-column-start)/g
function updateColumnStartSyntax(originalFileContent: string): { updatedFileContent: string,
                                                                 numRegionsUpdated: number } {
    let matches = Array.from(originalFileContent.matchAll(OLD_COL_START_SYNTAX_REGEX))

    let updatedFileContent = originalFileContent;
    let offset = 0;
    
    for(let match of matches) {    
        let startIndex = match.index + offset
        let matchLength = match[0].length
        let endIndex = startIndex + matchLength;

        let columnStartSyntax = match[1]        
        let replacementText = `--- ${columnStartSyntax}`
        offset += replacementText.length - matchLength

        updatedFileContent = updatedFileContent.slice(0, startIndex) + replacementText + updatedFileContent.slice(endIndex)
        console.groupCollapsed()
        console.log("Original File:\n\n", originalFileContent)
        console.log("Updated File:\n\n", updatedFileContent)
        console.groupEnd()      
    }
    return {
        updatedFileContent: updatedFileContent,
        numRegionsUpdated: matches.length
    }                                           
}

const OLD_CODEBLOCK_COL_START_SYNTAX_REGEX = /```(start-multi-column|multi-column-start).*?```/sg;
function updateColumnCodeblockStartSyntax(originalFileContent: string): { updatedFileContent: string,
                                                                 numRegionsUpdated: number } {
    let matches = Array.from(originalFileContent.matchAll(OLD_CODEBLOCK_COL_START_SYNTAX_REGEX))

    let updatedFileContent = originalFileContent;
    let offset = 0;
    
    for(let match of matches) {

        let startIndex = match.index + offset
        let matchLength = match[0].length
        let endIndex = startIndex + matchLength;

        let originalSettingsText = match[0]
        let settingsText = originalSettingsText
        let columnStartSyntax = match[1]
        let columnStartLine = `--- ${columnStartSyntax}`

        
        let idResult = /ID:(.*)/i.exec(originalSettingsText)
        if(idResult !== null) {
            let id = idResult[1].trim()
            columnStartLine = `${columnStartLine}: ${id}`

            let startIndex = idResult.index
            let endIndex = startIndex + idResult[0].length

            settingsText = originalSettingsText.slice(0, startIndex)
            settingsText += originalSettingsText.slice(endIndex + 1)
        }
        settingsText = settingsText.replace(columnStartSyntax, "column-settings")
        
        let replacementText = `${columnStartLine}\n${settingsText}`

        offset += replacementText.length - matchLength

        updatedFileContent = updatedFileContent.slice(0, startIndex) + replacementText + updatedFileContent.slice(endIndex)
        console.groupCollapsed()
        console.log("Original File:\n\n", originalFileContent)
        console.log("Updated File:\n\n", updatedFileContent)
        console.groupEnd()
    }

    return {
        updatedFileContent: updatedFileContent,
        numRegionsUpdated: matches.length
    }
}