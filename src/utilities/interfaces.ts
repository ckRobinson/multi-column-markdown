/**
 * File: /src/utilities/interfaces.ts                                          *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2023 Cameron Robinson                                         *
 */

export class HTMLSizing {
    private _sizeValue: number = 0;
    public get sizeValue(): number {
        return this._sizeValue;
    }
    public set sizeValue(value: number) {
        this._sizeValue = value;
    }
    private widthSet: boolean = false;
    private sizeUnits: string = "px";
    private constructor(value: number, units: string) {
        this.sizeValue = value;
        this.sizeUnits = units;
    }
    public setWidth(value: number): HTMLSizing {
        this.widthSet = true;
        return new HTMLSizing(value, this.sizeUnits);
    }
    public setUnits(units: string): HTMLSizing {
        return new HTMLSizing(this.sizeValue, units);
    }
    public toString(): string {
        return `${this.sizeValue}${this.sizeUnits}`;
    }

    public static create(): HTMLSizing {
        return new HTMLSizing(0, "px");
    }
}

const ALL_MOUSE_STATES = [
    "up",
    "down", 
] as const;
type MouseStateTuple = typeof ALL_MOUSE_STATES;
export type MouseState = MouseStateTuple[number];
export let mouseState: MouseState = "up"; 
addEventListener("mousedown", () => {
	mouseState = "down"
})
addEventListener("mouseup", () => {
	mouseState = "up"
})

export interface StartTagRegexMatch {
    found: boolean;
    startPosition: number;
    endPosition: number;
    matchLength: number;
    regionType: RegionType;
}
export function defaultStartRegionData(): StartTagRegexMatch {

    return {
        found: false,
        startPosition: -1,
        endPosition: -1,
        matchLength: 0,
        regionType: "CODEBLOCK"
    }
}

const ALL_REGION_TYPES= [
    "CODEBLOCK",
    "DEPRECIATED", 
    "PADOC"
] as const;
type RegionTypeTuple = typeof ALL_REGION_TYPES;
export type RegionType = RegionTypeTuple[number];