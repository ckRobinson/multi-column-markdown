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

    public static parseToSizing(sizingText: string): HTMLSizing | null {

        let unitData = HTMLSizing.getLengthUnit(sizingText);
        if(unitData.isValid === true) {

            let units: string = unitData.unitStr
            let sizeText: string = sizingText.replace(units, "").trim();
            let size: number = parseInt(sizeText);
            if(isNaN(size)) {
                return null;
            }

            return HTMLSizing.create().setWidth(size).setUnits(units);
        }
        return null;
    }

    public static  getLengthUnit(lengthStr: string): { isValid: boolean, unitStr: string } {

        let lastChar = lengthStr.slice(lengthStr.length - 1);
        let lastTwoChars = lengthStr.slice(lengthStr.length - 2);
    
        let unitStr = ""
        let isValid = false;
        if(lastChar === "%") {
            unitStr = lastChar;
            isValid = true;
        }
        else if(lastTwoChars === "cm" ||
                lastTwoChars === "mm" ||
                lastTwoChars === "in" ||
                lastTwoChars === "px" ||
                lastTwoChars === "pt" ||
                lastTwoChars === "pc" ||
                lastTwoChars === "em" ||
                lastTwoChars === "ex" ||
                lastTwoChars === "ch" ||
                lastTwoChars === "vw" ||
                lastTwoChars === "vh" ) {
            unitStr = lastTwoChars;
            isValid = true;
        }
    
        return { isValid: isValid, unitStr: unitStr }
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