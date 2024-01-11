/*
 * Filename: multi-column-markdown/src/utilities/utils.ts
 * Created Date: Tuesday, January 30th 2022, 4:02:19 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */

import { WorkspaceLeaf } from "obsidian";

export function getUID(length: number = 10): string {

    if(length > 10) {
        length = 10;
    }
    let UID = Math.random().toString(36).substring(2);
    UID = UID.slice(0, length);
    
    return UID;
}

/**
 * BFS on the child nodes of the passed element searching for the first instance of the
 * node type passed. Returning the element found or null if none found.
 * 
 * @param root 
 * @param nodeTypeName
 * @returns 
 */
export function searchChildrenForNodeType(root: HTMLElement, nodeTypeName: string): HTMLElement | null {

    nodeTypeName = nodeTypeName.toLowerCase();
    let queue: HTMLElement[] = [root]
    while(queue.length > 0){
        for(let i = 0; i < queue.length; i++) {
            
            let node = queue.shift()

            let nodeName = node.nodeName.toLowerCase()
            if(nodeName === nodeTypeName) {
                return node as HTMLElement;
            }

            for(let i = 0; i < node.children.length; i++) {
                queue.push(node.children[i] as HTMLElement)
            }
        }
    }

    return null;
}

export function searchChildrenForNodesOfType(root: HTMLElement, nodeTypeName: string, parentClass: string): HTMLElement[] | null {
    let elFound = searchChildrenForNodeType(root, nodeTypeName)
    if(elFound !== null) {

        let currentParent = elFound.parentElement;
        while(currentParent !== null) {
            if(currentParent.hasClass(parentClass)) {
                break;
            }
            currentParent = currentParent.parentElement
        }
        if(currentParent === null) {
            return null
        }

        let canvases: HTMLElement[] = [];
        for(let child of Array.from(currentParent.children)) {
            
            let canvas = searchChildrenForNodeType(child as HTMLElement, nodeTypeName)
            if(canvas !== null) {
                canvases.push(canvas)
            }
        }
        if(canvases.length > 0) {
            return canvases
        }
    }
    return null;
}

export function getFileSourceMode(sourcePath: string): string {

    let fileLeaf = getFileLeaf(sourcePath);
    if(fileLeaf === null) {
        return "";
    }
    return fileLeaf.getViewState().state.mode;
}
export function getLeafSourceMode(fileLeaf: WorkspaceLeaf): string {

    return fileLeaf.getViewState().state.mode;
}

export function fileStillInView(sourcePath: string):boolean {

    let fileLeaf = getFileLeaf(sourcePath);
    if(fileLeaf === null) {
        return false;
    }
    return true;
}

export function getFileLeaf(sourcePath: string): WorkspaceLeaf | null {

    let markdownLeaves = app.workspace.getLeavesOfType("markdown");
    if(markdownLeaves.length === 0) {
        return null;
    }

    for(let i = 0; i < markdownLeaves.length; i++) {

        if(markdownLeaves[i].getViewState().state.file === sourcePath) {
            return markdownLeaves[i];
        }
    }

    return null;
}