export class HTMLSizing {
    private sizeWidth: number = 0;
    private widthSet: boolean = false;
    private sizeUnits: string = "px";
    private constructor(value: number, units: string) {
        this.sizeWidth = value;
        this.sizeUnits = units;
    }
    public setWidth(value: number): HTMLSizing {
        this.widthSet = true;
        return new HTMLSizing(value, this.sizeUnits);
    }
    public setUnits(units: string): HTMLSizing {
        return new HTMLSizing(this.sizeWidth, units);
    }
    public toString(): string {
        return `${this.sizeWidth}${this.sizeUnits}`;
    }

    public static create(): HTMLSizing {
        return new HTMLSizing(0, "px");
    }
}
