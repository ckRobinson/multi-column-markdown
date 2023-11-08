import { MultiColumnLayoutCSS, MultiColumnStyleCSS } from "src/utilities/cssDefinitions";

export class RegionErrorManager {

    //TODO: Add warnings

    errorParentElement: HTMLElement;
    contentEl: HTMLElement;
    titleRegion: HTMLElement;

    errorMessages: string[] = [];
    warningMessages: string[] = [];

    private get totalNumMessages(): number {
        return this.errorMessages.length + this.warningMessages.length
    }

    constructor(rootElement: HTMLElement, initialErrorMessages: string[] = []) {
        
        this.errorMessages = initialErrorMessages;
        this.setRegionRootElement(rootElement);
    }

    public addErrorMessage(errorString: string) {

        this.errorMessages.push(errorString);
        this.updateErrorView()
    }

    public addWarningMessage(warningString: string) {
        this.warningMessages.push(warningString);
        this.updateErrorView()
    }

    public setRegionRootElement(rootElement: HTMLElement) {
        rootElement.addClass(MultiColumnStyleCSS.ColumnBorder)

        this.errorParentElement = rootElement.createDiv({
            cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv}`,
        });
        this.titleRegion = this.errorParentElement.createDiv({
            cls: `${MultiColumnLayoutCSS.ErrorRegionPadding} mcm-error-heading` //TODO: move to const.
        })
        this.contentEl = this.errorParentElement.createDiv({
            cls: `${MultiColumnStyleCSS.RegionErrorMessage} mcm-message-region`
        })
        this.updateErrorView()
    }

    private setupErrorHeader() {
        if(this.errorMessages.length > 0) {
            let text = "Error"
            if(this.errorMessages.length > 1) {
                text = text + "s"
            }
            text = text + " in region"

            this.titleRegion.createSpan({
                attr: {"style": "color: var(--text-error); padding: 5px;"},
                text: "\u2A02"
            })
            this.titleRegion.createSpan({
                text: `${this.errorMessages.length} ${text}`
            })
        }

        if(this.errorMessages.length > 0 && this.warningMessages.length > 0) {
            this.titleRegion.createSpan({
                text: ` and `
            })
        }

        if(this.warningMessages.length > 0) {

            let text = "Warning"
            if(this.warningMessages.length > 1) {
                text = text + "s"
            }
            text = text + " in region"

            this.titleRegion.createSpan({
                attr: {"style": "color: var(--color-yellow); padding: 5px;"},
                text: "\u26A0"
            })
            this.titleRegion.createSpan({
                text: `${this.warningMessages.length} ${text}`
            })
        }
        
        let regionOpened = false;
        this.titleRegion.addEventListener("click", (ev) => {
            this.titleRegion.classList.toggle("mcm-error-heading-open");
            regionOpened = !regionOpened
            if(regionOpened) {
                this.contentEl.style.maxHeight = this.contentEl.scrollHeight + "px";
            } else {
                this.contentEl.style.maxHeight = null;
            }
        })
    }

    public updateErrorView() {

        this.resetErrorView()

        if(this.totalNumMessages === 0) {
            return;
        }

        this.setupErrorHeader()
        this.appendContentToEl()
    }

    private renderSingleErrorMessage() {
        this.contentEl.createEl("p", {
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
        if(this.errorMessages.length === 0) {
            return;
        }
        
        let children = this.contentEl.childNodes;
        children.forEach(child => {
            if(child !== null && child.parentElement === this.contentEl) {
                this.contentEl.removeChild(child);
            }
        });

        this.titleRegion.childNodes.forEach(child => {
            child.detach()
        })
    }
}