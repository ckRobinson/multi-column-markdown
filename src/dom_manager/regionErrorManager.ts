import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from "src/utilities/cssDefinitions";

export class RegionErrorManager {

    //TODO: Add warnings

    errorParentElement: HTMLElement;
    contentEl: HTMLElement;
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
        this.contentEl = this.errorParentElement.createDiv()
        this.updateErrorView()
    }

    public updateErrorView() {

        this.resetErrorView()
        this.appendContentToEl()
    }

    private renderSingleErrorMessage() {
        this.contentEl.createSpan({
            text: this.errorMessages[0]
        })
    }

    private appendContentToEl() {
        if(this.errorMessages.length === 1) {
            this.contentEl.addClass(MultiColumnLayoutCSS.ErrorRegionPadding);
            this.renderSingleErrorMessage()
            return
        }

        let listEl = this.contentEl.createEl("ul")
        for(let i = 0; i < this.errorMessages.length; i++) {

            listEl.createEl("li", {
                text: this.errorMessages[i]
            })
        }
    }

    private resetErrorView() {
        if(this.contentEl === null) {
            return;
        }

        this.contentEl.removeClass(MultiColumnLayoutCSS.ErrorRegionPadding);
        this.contentEl.removeClass(MultiColumnStyleCSS.ColumnBorder);

        if(this.errorMessages.length === 0) {
            return;
        }
        
        let children = this.contentEl.childNodes;
        children.forEach(child => {
            if(child !== null && child.parentElement === this.contentEl) {
                this.contentEl.removeChild(child);
            }
        });

        this.contentEl.addClass(MultiColumnStyleCSS.ColumnBorder);
    }
}