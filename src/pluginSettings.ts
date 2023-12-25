export interface MCM_Settings {
    renderOnMobile: boolean;
    autoLayoutBalanceIterations: number;
    useLivePreviewCache: boolean
}
export const DEFAULT_SETTINGS: MCM_Settings = {
    renderOnMobile: true,
    autoLayoutBalanceIterations: 5,
    useLivePreviewCache: false
};

export class MCM_SettingsManager {

    private static local: MCM_SettingsManager | null = null;
    public static get shared(): MCM_SettingsManager {
        if(MCM_SettingsManager.local === null) {
            MCM_SettingsManager.local = new MCM_SettingsManager()
        }
        return MCM_SettingsManager.local;
    }

    public settings: MCM_Settings = DEFAULT_SETTINGS;
}