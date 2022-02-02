/*
 * Filename: multi-column-markdown/src/utilities/utils.ts
 * Created Date: Tuesday, January 30th 2022, 4:02:19 pm
 * Author: Cameron Robinson
 * 
 * Copyright (c) 2022 Cameron Robinson
 */


export function getUID(): string {
    return Math.random().toString(36).substring(2);
}