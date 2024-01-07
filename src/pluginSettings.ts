export interface MCM_Settings {
    renderOnMobile: boolean;
    autoLayoutBalanceIterations: number;
    useLivePreviewCache: boolean;
    alignTablesToContentAlignment: boolean;
    renderInlineElErrors: boolean;
}
export const DEFAULT_SETTINGS: MCM_Settings = {
    renderOnMobile: true,
    autoLayoutBalanceIterations: 5,
    useLivePreviewCache: false,
    alignTablesToContentAlignment: true,
    renderInlineElErrors: true
};

export class MCM_SettingsManager {

    private static local: MCM_SettingsManager | null = null;
    public static get shared(): MCM_SettingsManager {
        if(MCM_SettingsManager.local === null) {
            MCM_SettingsManager.local = new MCM_SettingsManager()
        }
        return MCM_SettingsManager.local;
    }

    private _settings: MCM_Settings = DEFAULT_SETTINGS;
    public get settings(): MCM_Settings { return this._settings }
    public set settings(newVal: MCM_Settings) {
        this.updateTimestamp()
        this._settings = newVal
    }

    private _lastUpdateTimestamp: number
    public get lastUpdateTimestamp(): number { return this._lastUpdateTimestamp }
    private updateTimestamp() {
        this._lastUpdateTimestamp = Date.now()
    }

    public get renderOnMobile(): boolean { return this._settings.renderOnMobile }
    public get autoLayoutBalanceIterations(): number { return this._settings.autoLayoutBalanceIterations }
    public get useLivePreviewCache(): boolean { return this._settings.useLivePreviewCache }
    public get alignTablesToContentAlignment(): boolean { return this._settings.alignTablesToContentAlignment }
    public get renderInlineElErrors(): boolean { return this._settings.renderInlineElErrors }

    public set renderOnMobile(newVal: boolean) {
        this.updateTimestamp()
        this._settings.renderOnMobile = newVal
    }
    public set autoLayoutBalanceIterations(newVal: number) {
        this.updateTimestamp()
        this._settings.autoLayoutBalanceIterations = newVal
    }
    public set useLivePreviewCache(newVal: boolean) {
        this.updateTimestamp()
        this._settings.useLivePreviewCache = newVal
    }
    public set alignTablesToContentAlignment(newVal: boolean) {
        this.updateTimestamp()
        this._settings.alignTablesToContentAlignment = newVal
    }
    public set renderInlineElErrors(newVal: boolean) {
        this.updateTimestamp()
        this._settings.renderInlineElErrors = newVal
    }
}