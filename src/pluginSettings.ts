export interface MCM_Settings {
    renderOnMobile: boolean;
    autoLayoutBalanceIterations: number;
}
export const DEFAULT_SETTINGS: MCM_Settings = {
    renderOnMobile: true,
    autoLayoutBalanceIterations: 5
};