import { App, ButtonComponent, Modal, Platform, PluginSettingTab, Setting } from "obsidian";
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

        this.containerEl.createEl("h5", { attr: {"style": "color: var(--text-error); margin-bottom: 5px;"}, text: "DANGER ZONE" });
        this.containerEl.createEl("hr", { attr: {"style": "margin-top: 5px;"} })
        const dangerZoneContainerEl = this.containerEl.createDiv();

        let docFrag = new DocumentFragment()
        docFrag.createDiv({}, div  => {
            div.createEl("h5", {}, span => {
                span.setAttr("style", "color: var(--text-error); margin-bottom: 0px; margin-top: 3px;")
                span.innerText = "WARNING:"
            })
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);")
                span.innerText = "This action modifies all relavent notes and may lead to corrupted text."
            })
            div.createEl("br")
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-error);")
                span.innerText = "No guarentee is given. Please make sure to back your vault up first."
            })
            div.createEl("br")
            div.createSpan({}, span => {
                span.innerText = "This may take a while for large vaults."
            })
        })
        let modalDescriptionEl = createDiv({}, div => {
            div.createSpan({text: "This action may corrupt vault data."})
            div.createEl("br")
            div.createSpan({text: "Please confirm you have backed up your vault."})
        })
        new Setting(dangerZoneContainerEl)
            .setName("Update ALL depreciated Multi-Column syntax.")
            .setDesc(docFrag)
            .addButton((b) =>
                b.setButtonText("Update Syntax").onClick(() => {
                    const modal = ConfirmModal.confirmModalWithElement(this.app, modalDescriptionEl, {primary: "Confirm", secondary: "Cancel"});
                    modal.onClose = () => {
                        if(modal.confirmed === false) {
                            return
                        }

                        //ToDo: Call fn.
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