import { PluginSettingTab } from "obsidian";

export default class MultiColumnSettingsView extends PluginSettingTab {
    display() {
        this.containerEl.empty();
        this.containerEl.createEl("h2", { text: "Multi-Column Markdown - Settings" });
    }
}