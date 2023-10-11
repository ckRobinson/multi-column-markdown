/**
 * File: /src/utilities/interfaces.ts                                          *
 * Author: Cameron Robinson                                                    *
 *                                                                             *
 * Copyright (c) 2023 Cameron Robinson                                         *
 */
import { pixels } from '@pacote/pixels'

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

    convertToPX(parentElement: HTMLElement) {
        if(this.sizeUnits === "px") {
            return this;
        }

        switch(this.sizeUnits) {
            case "cm":
            case "mm":
            case "in":
            case "pt":
            case "pc":
                let absUnitsResult = pixels(`${this.toString()}`);
                return new HTMLSizing(absUnitsResult, "px");
            case "vw":
            case "vh":
                return handleViewportSizing();
            case "em":
                return getFontSizeFromEl();
            case "ch":
                let ch = createEl("p", {
                    "attr": { "style": "width: 1ch;" }
                })
                return getSizeFromStyleWidth(ch);

            case "ex":
                let ex = createEl("p", {
                    "attr": { "style": "width: 1ex;" }
                })
                return getSizeFromStyleWidth(ex);
        }

        function getSizeFromStyleWidth(el: HTMLParagraphElement) {

            const DEFAULT_SIZE = 16;
            if(parentElement === null ||
                parentElement === undefined) {
                 
                 return new HTMLSizing(this.sizeValue * DEFAULT_SIZE, "px");
             }

            parentElement.appendChild(el);
            let exToPxResult = this.sizeValue * el.clientWidth;
            if(el.clientWidth === 0) {
                exToPxResult = this.sizeValue * DEFAULT_SIZE;
            } 

            parentElement.removeChild(el);
            return new HTMLSizing(exToPxResult, "px");
        }

        function getFontSizeFromEl() {

            const DEFAULT_SIZE = 16;
            let fontSize = DEFAULT_SIZE;
            let emToPxResult = fontSize * this.sizeValue;

            if(parentElement === null ||
               parentElement === undefined) {
                
                return new HTMLSizing(emToPxResult, "px");
            }

            let sizing = HTMLSizing.parseToSizing(parentElement.getCssPropertyValue("font-size"));
            if (sizing !== null) {
                fontSize = sizing.sizeValue;
                emToPxResult = fontSize * this.sizeValue;
            }

            return new HTMLSizing(emToPxResult, "px");
        }

        function handleViewportSizing() {

            let scale = this.sizeValue / 100;
            if(parentElement === null || parentElement === undefined) {
                console.warn("Found undefined root element. Using default client size. Result may not appear as intended.");
                let defaultSizing = scale * 1200;
                return new HTMLSizing(defaultSizing, "px");
            }

            let viewWidth = parentElement.clientWidth;
            let viewHeight = parentElement.clientHeight;
            switch(this.sizeUnits) {
                case "vw":
                    let wToPxResult = scale * viewWidth;
                    return new HTMLSizing(wToPxResult, "px");
                case "vh":
                case "%":
                    let hToPxResult = scale * viewHeight;
                    return new HTMLSizing(hToPxResult, "px");

            }
        }
    }

    public static create(): HTMLSizing {
        return new HTMLSizing(0, "px");
    }

    public static parseToSizing(sizingText: string): HTMLSizing | null {

        if(sizingText === "") {
            return null;
        }

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
    "ORIGINAL", 
    "PADOC"
] as const;
type RegionTypeTuple = typeof ALL_REGION_TYPES;
export type RegionType = RegionTypeTuple[number];