import { App, ButtonComponent, Modal, Notice, Platform, PluginSettingTab, Setting } from "obsidian";
import MultiColumnMarkdown from "src/main";

export default class MultiColumnSettingsView extends PluginSettingTab {

    constructor(app: App, public plugin: MultiColumnMarkdown) {
        super(app, plugin);
    }
    
    display() {
        this.containerEl.empty();
        this.containerEl.createEl("h2", { text: "Multi-Column Markdown - Settings" });

        const settingsContainerEl = this.containerEl.createDiv();

        if(Platform.isMobile === true) {
            new Setting(settingsContainerEl)
                .setName("Render Column Regions")
                .setDesc("Toggle to show/hide column regions on mobile devices.")
                .addToggle((t) =>
                    t.setValue(this.plugin.settings.renderOnMobile).onChange((v) => {
                        this.plugin.settings.renderOnMobile = v
                        this.plugin.saveSettings()
                    }
                ));
        }

        this.containerEl.createEl("h5", { attr: {"style": "color: var(--text-error); margin-bottom: 0px;"}, text: "DANGER ZONE" });
        this.containerEl.createEl("hr", { attr: {"style": "margin-top: 1px; margin-bottom: 0.75em;"} })
        const dangerZoneContainerEl = this.containerEl.createDiv();

        this.buildUpdateDepreciated(dangerZoneContainerEl);
        this.buildFixMissingIDs(dangerZoneContainerEl);
    }

    private buildUpdateDepreciated(dangerZoneContainerEl: HTMLDivElement) {

        let docFrag = new DocumentFragment();
        docFrag.createDiv({}, div => {
            div.createEl("h6", {}, span => {
                span.setAttr("style", "color: var(--text-error); margin-bottom: 0px; margin-top: 3px;");
                span.innerText = "WARNING:";
            });
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "This action modifies all relavent notes and may lead to corrupted text.";
            });
            div.createEl("br");
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "No guarentee is given. Please make sure to back your vault up first.";
            });
            div.createEl("br");
            div.createSpan({}, span => {
                span.innerText = "This may take a while for large vaults.";
            });
        });
        let modalDescriptionEl = createDiv({}, div => {
            div.createSpan({ text: "This action may corrupt vault data." });
            div.createEl("br");
            div.createSpan({ text: "Please confirm you have backed up your vault." });
        });
        new Setting(dangerZoneContainerEl)
            .setName("Update ALL depreciated Multi-Column syntax.")
            .setDesc(docFrag)
            .addButton((b) => b.setButtonText("Update Syntax").onClick(() => {
                const modal = ConfirmModal.confirmModalWithElement(this.app, modalDescriptionEl, { primary: "Confirm", secondary: "Cancel" });
                modal.onClose = () => {
                    if (modal.confirmed === false) {
                        return;
                    }

                    updateFileSyntax();
                };
                modal.open();
            })
            );
    }

    private buildFixMissingIDs(dangerZoneContainerEl: HTMLDivElement) {
        
        let docFrag = new DocumentFragment();
        docFrag.createDiv({}, div => {
            div.createSpan({}, span => {
                span.innerText = "This will only modify regions without an already defined ID.";
            });
            div.createEl("h6", {}, span => {
                span.setAttr("style", "color: var(--text-error); margin-bottom: 0px; margin-top: 3px;");
                span.innerText = "WARNING:";
            });
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "This action modifies all relavent notes and may lead to corrupted text.";
            });
            div.createEl("br");
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "No guarentee is given. Please make sure to back your vault up first.";
            });
            div.createEl("br");
            div.createSpan({}, span => {
                span.innerText = "This may take a while for large vaults.";
            });
        });
        let modalDescriptionEl = createDiv({}, div => {
            div.createSpan({ text: "This action may corrupt vault data." });
            div.createEl("br");
            div.createSpan({ text: "Please confirm you have backed up your vault." });
        });
        new Setting(dangerZoneContainerEl)
            .setName("Add random IDs to all Multi-Column regions.")
            .setDesc(docFrag)
            .addButton((b) => b.setButtonText("Add IDs").onClick(() => {
                const modal = ConfirmModal.confirmModalWithElement(this.app, modalDescriptionEl, { primary: "Confirm", secondary: "Cancel" });
                modal.onClose = () => {
                    if (modal.confirmed === false) {
                        return;
                    }

                    findAndReplaceMissingIDs();
                };
                modal.open();
            })
            );
    }
}

export class ConfirmModal extends Modal {

    static confirmModalWithText(app: App,
                                text: string,
                                buttons: { primary: string; secondary: string }): ConfirmModal {

        return new ConfirmModal(app, createSpan({text: text}), buttons)
    }

    static confirmModalWithElement(app: App,
                                   descriptionEl: HTMLElement,
                                   buttons: { primary: string; secondary: string }): ConfirmModal {
        return new ConfirmModal(app, descriptionEl, buttons)
    }

    public descriptionEl: HTMLElement
    public buttons: { primary: string; secondary: string }
    private constructor(app: App, 
                        descriptionEl: HTMLElement,
                        buttons: { primary: string; secondary: string }) {
        super(app);
        this.descriptionEl = descriptionEl;
        this.buttons = buttons;
    }
    confirmed: boolean = false;
    async display() {
        this.contentEl.empty();
        this.contentEl.appendChild(this.descriptionEl)

        const buttonEl = this.contentEl.createDiv();
        new ButtonComponent(buttonEl)
            .setButtonText(this.buttons.primary)
            .setCta()
            .onClick(() => {
                this.confirmed = true;
                this.close();
            });
        new ButtonComponent(buttonEl)
            .setButtonText(this.buttons.secondary)
            .onClick(() => {
                this.close();
            });
    }
    onOpen() {
        this.display();
    }
}

async function findAndReplaceMissingIDs() {
    
}

const OLD_COL_START_SYNTAX_REGEX = /```(start-multi-column|multi-column-start).*?```/sg;
async function updateFileSyntax() {
    
    let fileCount = 0
    let regionCount = 0
    for(let mdFile of app.vault.getMarkdownFiles()) {
        let originalFileContent = await app.vault.read(mdFile);

        let { updatedFileContent, numRegionsUpdated } = updateColumnStartSyntax(originalFileContent);
        if(numRegionsUpdated > 0) {
            fileCount++;
            regionCount += numRegionsUpdated
        }

        // TODO: Add in final file modification when done testing.
        // app.vault.modify(mdFile, updatedFileContent)
    }

    console.log(`Total files needing update: ${fileCount}`)
    new Notice(`Finished updating ${regionCount} column regions across ${fileCount} files.`)
}

function updateColumnStartSyntax(originalFileContent: string): { updatedFileContent: string,
                                                                 numRegionsUpdated: number } {
    let matches = Array.from(originalFileContent.matchAll(OLD_COL_START_SYNTAX_REGEX))

    let updatedFileContent = originalFileContent;
    let offset = 0;
    
    for(let match of matches) {

        let startIndex = match.index + offset
        let matchLength = match[0].length
        let endIndex = startIndex + matchLength;

        let originalSettingsText = match[0]
        let settingsText = originalSettingsText
        let columnStartSyntax = match[1]
        let columnStartLine = `--- ${columnStartSyntax}`

        
        let idResult = /ID:(.*)/i.exec(originalSettingsText)
        if(idResult !== null) {
            let id = idResult[1].trim()
            columnStartLine = `${columnStartLine}: ${id}`

            let startIndex = idResult.index
            let endIndex = startIndex + idResult[0].length

            settingsText = originalSettingsText.slice(0, startIndex)
            settingsText += originalSettingsText.slice(endIndex + 1)
        }
        settingsText = settingsText.replace(columnStartSyntax, "column-settings")
        
        let replacementText = `${columnStartLine}\n${settingsText}`

        offset += replacementText.length - originalSettingsText.length

        updatedFileContent = updatedFileContent.slice(0, startIndex) + replacementText + updatedFileContent.slice(endIndex)
        console.groupCollapsed()
        console.log("Original File:\n\n", originalFileContent)
        console.log("Updated File:\n\n", updatedFileContent)
        console.groupEnd()
    }

    return {
        updatedFileContent: updatedFileContent,
        numRegionsUpdated: matches.length
    }
}