
export class RegionErrorManager {

    errorParentElement: HTMLElement;
    errorMessages: string[];
    constructor(errorParentElement: HTMLElement, initialErrorMessages: string[] = []) {

        this.errorParentElement = errorParentElement;
        this.errorMessages = initialErrorMessages;

        this.updateErrorView()
    }

    public addErrorMessage(errorString: string) {

        this.errorMessages.push(errorString);
        this.updateErrorView()
    }

    private updateErrorView() {
        if(this.errorMessages.length === 0) {
            return;
        }
        console.log("Rendering errors.", this.errorParentElement, this.errorParentElement.parentElement)
        let children = this.errorParentElement.childNodes;
        children.forEach(child => {
            if(child !== null && child.parentElement === this.errorParentElement) {
                this.errorParentElement.removeChild(child);
            }
        });

        for(let i = 0; i < this.errorMessages.length; i++) {
            this.errorParentElement.createSpan({
                text: this.errorMessages[i]
            })

            if(i < this.errorMessages.length - 1) {
                this.errorParentElement.createEl("br")
            }
        }
    }
}