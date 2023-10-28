import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from "src/utilities/cssDefinitions";

export class RegionErrorManager {

    errorParentElement: HTMLElement;
    errorMessages: string[];
    constructor(rootElement: HTMLElement, initialErrorMessages: string[] = []) {
        
        this.errorMessages = initialErrorMessages;
        this.setRegionRootElement(rootElement);
    }

    public addErrorMessage(errorString: string) {

        this.errorMessages.push(errorString);
        this.updateErrorView()
    }

    public setRegionRootElement(rootElement: HTMLElement) {
        this.errorParentElement = rootElement.createDiv({
            cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv} ${MultiColumnStyleCSS.RegionErrorMessage}`,
        });
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