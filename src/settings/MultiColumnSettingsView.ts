import { App, Platform, PluginSettingTab, Setting } from "obsidian";
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
    }
}