import { App, ButtonComponent, Platform, PluginSettingTab, Setting } from "obsidian";
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

        this.containerEl.createEl("hr")
        this.containerEl.createEl("h4", { text: "DANGER ZONE" });
        const dangerZoneContainerEl = this.containerEl.createDiv();

        let docFrag = new DocumentFragment()
        docFrag.createDiv({}, div  => {
            div.createEl("h5", {}, span => {
                span.setAttr("style", "color: var(--text-accent); margin-bottom: 0px; margin-top: 3px;")
                span.innerText = "WARNING:"
            })
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-accent);")
                span.innerText = "This action modifies all relavent note files and may lead to corrupt file text."
            })
            div.createEl("br")
            div.createSpan({}, span => {
                span.setAttr("style", "color: var(--text-accent);")
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
                })
            );
    }
}
    }
}