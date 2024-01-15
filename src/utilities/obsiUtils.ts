import { Workspace, WorkspaceLeaf } from "obsidian";

export function getLeafFromFilePath(workspace: Workspace, filePath: string): WorkspaceLeaf | null {

    function checkState(state: any) {

        if(state["type"] === undefined ||
           state["type"] !== "markdown") {
            return false;
        }

        if(state["state"] === undefined) {
            return false
        }

        if(state["state"]["file"] === undefined) {
            return false;
        }

        let stateFilePath = state["state"]["file"];
        return stateFilePath === filePath;
    }

    if(workspace === null) {
        return null;
    }

    let entries = Object.entries(workspace.getLayout());
    let items = Array.from(entries).map((val) => {
        return val[1]
    })
    while(items.length > 0) {

        let entryObj = items.shift() as any;
        if(entryObj["id"] !== undefined && entryObj["type"] !== undefined) {

            if(entryObj["type"] === "split" ||
               entryObj["type"] === "tabs" ) {
                items = items.concat(entryObj['children']);
                continue;
            }

            if(entryObj["type"] === "leaf" && 
               entryObj["id"] !== undefined &&
               entryObj["state"] !== undefined) {

                let id = entryObj["id"];
                let state = entryObj["state"];
                console.log(state)

                let valid = checkState(state);
                if(valid) {
                    return workspace.getLeafById(id);
                }
            }
        }
    }
    return null;
}

export function getPreviewLeafFromFilePath(workspace: Workspace, filePath: string): WorkspaceLeaf | null {

    function checkState(state: any) {

        if(state["type"] === undefined ||
           state["type"] !== "markdown") {
            return false;
        }

        if(state["state"] === undefined) {
            return false
        }

        if(state["state"]["file"] === undefined) {
            return false;
        }

        let stateFilePath = state["state"]["file"];
        return stateFilePath === filePath;
    }

    let entries = Object.entries(workspace.getLayout());
    let items = Array.from(entries).map((val) => {
        return val[1]
    })
    while(items.length > 0) {

        let entryObj = items.shift() as any;
        if(entryObj["id"] !== undefined && entryObj["type"] !== undefined) {

            if(entryObj["type"] === "split" ||
               entryObj["type"] === "tabs" ) {
                items = items.concat(entryObj['children']);
                continue;
            }

            if(entryObj["type"] === "leaf" && 
               entryObj["id"] !== undefined &&
               entryObj["state"] !== undefined) {

                let id = entryObj["id"];
                let state = entryObj["state"];

                let isPreview = false;
                if(state["state"] !== undefined &&
                    state["state"]["mode"] !== undefined) {
                    let mode = state["state"]["mode"]
                    isPreview = mode === "preview"
                    
                }

                let validFilePath = checkState(state);
                if(validFilePath && isPreview) {
                    return workspace.getLeafById(id);
                }
            }
        }
    }
    return null;
}