import { App, ButtonComponent, Modal, Notice, Platform, PluginSettingTab, Setting } from "obsidian";
import MultiColumnMarkdown from "src/main";
import * as multiColumnParser from '../utilities/textParser';
import { getUID } from "src/utilities/utils";
import { updateAllSyntax } from "src/utilities/syntaxUpdate";
import { MCM_SettingsManager } from "src/pluginSettings";

export default class MultiColumnSettingsView extends PluginSettingTab {

    constructor(app: App, public plugin: MultiColumnMarkdown) {
        super(app, plugin);
    }
    
    display() {
        this.containerEl.empty();
        this.containerEl.createEl("h2", { text: "Multi-Column Markdown - Settings" });

        const settingsContainerEl = this.containerEl.createDiv();

        new Setting(settingsContainerEl)
            .setName("Number of auto-layout balance iterations")
            .setDesc("The maximum number of times auto-layout will try to balance elements between all of the columns. Setting this too high may cause Obsidian to slow down during loading and refreshing of Auto-Layout columns.")
            .addSlider((slider) => {
                slider.setLimits(1, 15, 2)
                slider.setValue(MCM_SettingsManager.shared.autoLayoutBalanceIterations)
                slider.setDynamicTooltip()
                slider.onChange((val) => {
                    MCM_SettingsManager.shared.autoLayoutBalanceIterations = val;
                    this.plugin.saveSettings()
                })
            })

        new Setting(settingsContainerEl)
        .setName("Align tables with text alignment by default")
        .setDesc(this.buildTableAlignDocFrag())
        .addToggle((t) =>
            t.setValue(MCM_SettingsManager.shared.alignTablesToContentAlignment)
            .onChange((v) => {
                MCM_SettingsManager.shared.alignTablesToContentAlignment = v
                this.plugin.saveSettings()
            })
        )

        new Setting(settingsContainerEl)
        .setName("Use Live Preview render cache")
        .setDesc(this.buildRenderCacheDocFrag())
        .addToggle((t) =>
            t.setValue(MCM_SettingsManager.shared.useLivePreviewCache)
            .onChange((v) => {
                MCM_SettingsManager.shared.useLivePreviewCache = v
                this.plugin.saveSettings()
            })
        )

        if(Platform.isMobile === true) {
            new Setting(settingsContainerEl)
                .setName("Render column regions on mobile devices")
                .addToggle((t) =>
                    t.setValue(MCM_SettingsManager.shared.renderOnMobile).onChange((v) => {
                        MCM_SettingsManager.shared.renderOnMobile = v
                        this.plugin.saveSettings()
                    })
                );
        }

        this.containerEl.createEl("h5", { attr: {"style": "color: var(--text-error); margin-bottom: 0px;"}, text: "DANGER ZONE" });
        this.containerEl.createEl("hr", { attr: {"style": "margin-top: 1px; margin-bottom: 0.75em;"} })
        const dangerZoneContainerEl = this.containerEl.createDiv();

        this.buildUpdateDepricated(dangerZoneContainerEl);
        this.buildFixMissingIDs(dangerZoneContainerEl);

        this.containerEl.createEl("br")

        let { bgColor, fontColor, coffeeColor } = getDonateButtonColors(this.containerEl);
        new Setting(this.containerEl)
        .setName("Donate")
        .setDesc(`If you like this Plugin, please consider providing a one time donation to support it's development.`)
        .addButton((b) => {
            b.buttonEl.setAttr("style", "background-color: transparent; height: 30pt; padding: 0px;")
            const div = b.buttonEl.createDiv({attr: {"style": "width: 100%; height: 100%"}});
            div.createEl("a", {
                href: "https://www.buymeacoffee.com/ckrobinson"
            }).createEl("img", {
                attr: {
                    style: "width: 100%; height: 100%",
                    src: `https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=ckrobinson&button_colour=${bgColor}&font_colour=${fontColor}&font_family=Cookie&outline_colour=000000&coffee_colour=${coffeeColor}`
                }
            })
        })
    }

    private buildRenderCacheDocFrag(): DocumentFragment {
        let docFrag = new DocumentFragment();
        docFrag.createDiv({}, div => {
            div.createSpan({}, span => {
                span.innerText = "Caches rendered content in Live Preview to reduce render cycles and element flashing on note interaction.";
            });
            div.createEl("br");
            div.createEl("br");
            div.createSpan({}, span => {
                span.innerText = "Only uses cache when a file Live Preview tab is open. If both reading view and Live Preview are opened this feature is disabled.";
            });
            div.createEl("br");
            div.createEl("br");
            div.createEl("h5", {}, span => {
                span.setAttr("style", "color: var(--text-error); margin-bottom: 0px; margin-top: 3px;");
                span.innerText = "EXPERIMENTAL:";
            });
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "This feature is experimental only and has intermittently caused notes to erase column content during development. A fix has been implemented \
                but due to the potential data loss you must opt-in to using this feature. If content is erased you can use Undo to restore the file data. \
                Please make backups and disable if you experience any data loss.";
            });


        })
        return docFrag;
    }

    private buildTableAlignDocFrag(): DocumentFragment {
        let docFrag = new DocumentFragment();
        docFrag.createDiv({}, div => {
            div.createSpan({}, span => {
                span.innerText = "Sets the defalut behavior when determining whether to align table to text alignment.";
            });
            div.createEl("br");
            div.createEl("ul").createEl("li", { text: "This value is overwritten when defining the column setting: 'Align Tables to Text Alignment: true/false'" })
        })
        return docFrag;
    }

    private buildUpdateDepricated(dangerZoneContainerEl: HTMLDivElement) {

        let docFrag = new DocumentFragment();
        docFrag.createDiv({}, div => {
            div.createSpan({}, span => {
                span.innerText = "This may take a while for large vaults, you can continue to use Obsidian but application may slow down during process.";
            });
            div.createEl("br");
            div.createEl("br");
            div.createEl("h5", {}, span => {
                span.setAttr("style", "color: var(--text-error); margin-bottom: 0px; margin-top: 3px;");
                span.innerText = "WARNING:";
            });
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "This action modifies any note file with depricated syntax and could lead to corrupted file text.";
            });
            div.createEl("br");
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "No guarentee is given. Please make sure to back your vault up first.";
            });
        });
        let modalDescriptionEl = createDiv({}, div => {
            div.createSpan({ text: "This action may corrupt vault data." });
            div.createEl("br");
            div.createSpan({ text: "Please confirm you have backed up your vault." });
        });
        new Setting(dangerZoneContainerEl)
            .setName("Update ALL depricated Multi-Column syntax.")
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
                span.innerText = "This will only modify column regions without a pre-defined ID, and which use the up to date core syntax. Will not modify depricated syntax or fenced-divs.";
            });
            div.createEl("br");
            div.createEl("br");
            div.createSpan({}, span => {
                span.innerText = "This may take a while for large vaults, you can continue to use Obsidian but application may slow down during process.";
            });
            div.createEl("br");
            div.createEl("br");
            div.createEl("h5", {}, span => {
                span.setAttr("style", "color: var(--text-error); margin-bottom: 0px; margin-top: 3px;");
                span.innerText = "WARNING:";
            });
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "This action modifies any note file missing column IDs and could lead to corrupted file text.";
            });
            div.createEl("br");
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);");
                span.innerText = "No guarentee is given. Please make sure to back your vault up first.";
            });
        });
        let modalDescriptionEl = createDiv({}, div => {
            div.createSpan({ text: "This action may corrupt vault data." });
            div.createEl("br");
            div.createSpan({ text: "Please confirm you have backed up your vault." });
        });
        new Setting(dangerZoneContainerEl)
            .setName("Append IDs to all Multi-Column regions in vault.")
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

    function searchFileForMissingID(docText: string): { updatedFileContent: string,
                                                        numRegionsUpdated: number } {
        let lines = docText.split("\n");

        /**
         * Loop through all of the lines checking if the line is a 
         * start tag and if so is it missing an ID.
         */
        let linesWithoutIDs = 0
        for(let i = 0; i < lines.length; i++) {

            let data = multiColumnParser.isStartTagWithID(lines[i]);
            if(data.isStartTag === true && data.hasKey === false) {

                let originalText = lines[i]
                let text = originalText;
                text = text.trimEnd();
                if(text.charAt(text.length - 1) === ":") {
                    text = text.slice(0, text.length-1);
                }
                text = `${text}: ID_${getUID(4)}`;

                lines[i] = text;
                linesWithoutIDs++;
            }
        }                    

        if(linesWithoutIDs === 0) {
            return {
                updatedFileContent: docText,
                numRegionsUpdated: 0
            };
        }

        let newFileContent = lines.join("\n");
        return {
            updatedFileContent: newFileContent,
            numRegionsUpdated: linesWithoutIDs
        };
    }

    let count = 0;
    let fileCount = 0;
    for(let mdFile of app.vault.getMarkdownFiles()) {
        let originalFileContent = await app.vault.read(mdFile);

        let result = searchFileForMissingID(originalFileContent);
        if(result.numRegionsUpdated > 0) {
            count += result.numRegionsUpdated;
            fileCount++;

            let updatedFileContent = result.updatedFileContent;
            if(updatedFileContent !== originalFileContent) {
                app.vault.modify(mdFile, updatedFileContent);
            }
            else {
                console.log("No changes, not updating file.");
            }
        }
    }
    new Notice(`Finished updating:\n${count} region IDs, across ${fileCount} files.`)
}

async function updateFileSyntax() {
    
    let fileCount = 0
    let regionStartCount = 0;
    let columnBreakCount = 0;
    let columnEndCount = 0;
    for(let mdFile of app.vault.getMarkdownFiles()) {
        let originalFileContent = await app.vault.read(mdFile);
        let result = updateAllSyntax(originalFileContent);

        fileCount += result.fileCount;
        regionStartCount += result.regionStartCount;
        columnBreakCount += result.columnBreakCount;
        columnEndCount += result.columnEndCount;
        let updatedFileContent = result.updatedFileContent;

        // TODO: Add in final file modification when done testing.
        if(result.fileWasUpdated) {
            app.vault.modify(mdFile, updatedFileContent)
        }
        else {
            // console.debug("No changes, not updating file.")
        }
    }

    new Notice(`Finished updating:\n${regionStartCount} start syntaxes,\n${columnBreakCount} column breaks, and\n${columnEndCount} column end tags,\nacross ${fileCount} files.`)
}

function getDonateButtonColors(containerEl: HTMLElement) {
    let computedStyle = getComputedStyle(containerEl);
    let fontColor = computedStyle.getPropertyValue('--text-normal');
    let bgColor = computedStyle.getPropertyValue('--accent');
    let coffeeColor = "ffffff";
    if (isValidHexColor(fontColor) &&
        isValidHexColor(bgColor)) {
        fontColor = fontColor.slice(1);
        bgColor = bgColor.slice(1);
        coffeeColor = fontColor;
    }
    else {
        fontColor = "000000";
        bgColor = "FFDD00";
        coffeeColor = "ffffff";
    }
    return { bgColor, fontColor, coffeeColor };
}

function isValidHexColor(possibleColor: string): boolean {
    
    let firstChar = possibleColor[0]
    if(firstChar !== "#") {
        return false
    }

    if(possibleColor.length !== 7) {
        return false
    }

    return /^#[0-9A-F]{6}$/i.test(possibleColor)
}