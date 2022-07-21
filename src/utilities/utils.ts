/*
 * Filename: multi-column-markdown/src/utilities/utils.ts
 * Created Date: Tuesday, January 30th 2022, 4:02:19 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */


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