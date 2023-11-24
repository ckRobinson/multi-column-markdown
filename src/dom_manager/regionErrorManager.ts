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

        this.errorParentElement = rootElement.createDiv({
            cls: `${MultiColumnLayoutCSS.RegionErrorContainerDiv}`,
        });
        this.titleRegion = this.errorParentElement.createDiv({
            cls: `${MultiColumnLayoutCSS.ErrorRegionPadding}`
        })
        this.contentEl = this.errorParentElement.createDiv({
            cls: `${MultiColumnLayoutCSS.ErrorRegionPadding} mcm-message-region`
        })
        this.updateErrorView()
    }

    private setupErrorHeader() {
        if(this.errorMessages.length > 0) {
            let text = "Error"
            if(this.errorMessages.length > 1) {
                text = text + "s"
            }

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

            this.titleRegion.createSpan({
                attr: {"style": "color: var(--color-yellow); padding: 5px;"},
                text: "\u26A0"
            })
            this.titleRegion.createSpan({
                text: `${this.warningMessages.length} ${text}`
            })
        }
        this.titleRegion.createSpan({
            text: ` in region`
        })

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
        this.titleRegion.addClass(`mcm-error-heading`) //TODO: move to const.
        this.errorParentElement.classList.add(MultiColumnStyleCSS.ColumnBorder)
        this.setupErrorHeader()
        this.appendContentToEl()
    }


    private appendContentToEl() {

        for(let i = 0; i < this.errorMessages.length; i++) {

            let p = this.contentEl.createEl("p")
            p.innerHTML = `<span class="mcm-error-icon">\u2A02</span>${this.errorMessages[0]}`
        }

        for(let i = 0; i < this.warningMessages.length; i++) {

            let p = this.contentEl.createEl("p")
            p.innerHTML = `<span class="mcm-warning-icon">\u26A0</span>${this.warningMessages[0]}`
        }
    }

    private resetErrorView() {

        this.errorParentElement.classList.remove(MultiColumnStyleCSS.ColumnBorder)
        this.titleRegion.removeClass(`mcm-error-heading`) //TODO: move to const.

        while(this.titleRegion.children.length > 0) {
            this.titleRegion.childNodes.forEach(child => {
                this.titleRegion.removeChild(child)
            })
        }

        if(this.contentEl === null) {
            return;
        }

        let children = this.contentEl?.childNodes;
        children.forEach(child => {
            if(child !== null && child.parentElement === this.contentEl) {
                this.contentEl.removeChild(child);
            }
        });
    }
}