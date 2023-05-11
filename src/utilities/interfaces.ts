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