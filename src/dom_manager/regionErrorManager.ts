import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from "src/utilities/cssDefinitions";

export class RegionErrorManager {

    errorParentElement: HTMLElement;
    errorMessages: string[];
    constructor(errorRegionParent: HTMLElement, initialErrorMessages: string[] = []) {

        this.errorParentElement = errorRegionParent.createDiv({
            cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv} ${MultiColumnStyleCSS.RegionErrorMessage}`,
        });
        this.errorMessages = initialErrorMessages;

        this.updateErrorView()
    }

    public addErrorMessage(errorString: string) {

        this.errorMessages.push(errorString);
        this.updateErrorView()
    }

    private updateErrorView() {

        if(this.errorParentElement === null) {
            return;
        }

        this.errorParentElement.removeClass(MultiColumnLayoutCSS.ErrorRegionPadding);
        this.errorParentElement.removeClass(MultiColumnStyleCSS.ColumnBorder);

        if(this.errorMessages.length === 0) {
            return;
        }
        
        let children = this.errorParentElement.childNodes;
        children.forEach(child => {
            if(child !== null && child.parentElement === this.errorParentElement) {
                this.errorParentElement.removeChild(child);
            }
        });

        this.errorParentElement.addClass(MultiColumnStyleCSS.ColumnBorder);

        if(this.errorMessages.length === 1) {
            this.errorParentElement.addClass(MultiColumnLayoutCSS.ErrorRegionPadding);
            this.renderSingleErrorMessage()
            return
        }

        let listEl = this.errorParentElement.createEl("ul")
        for(let i = 0; i < this.errorMessages.length; i++) {

            listEl.createEl("li", {
                text: this.errorMessages[i]
            })
        }
    }

    private renderSingleErrorMessage() {
        this.errorParentElement.createSpan({
            text: this.errorMessages[0]
        })
    }
}