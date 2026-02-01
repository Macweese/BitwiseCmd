import log from 'loglevel';

export const APP_VERSION = 12;

export type PersistedAppData = {
    uiTheme: string;
    version: number | null;
    debugMode: boolean | null;
    pageVisitsCount: number;
    donationClicked: boolean;
    settingsEmphasizeBytes: boolean;
    settingsAnnotateTypes: boolean;
    settingsDimExtraBits: boolean;
    settingsCenteredLayout?: boolean
    cookieDisclaimerHidden: boolean,
}

export type CommandResultView = {
    key: number,
    input: string,
    view: ViewFactory
};

export type AppStateAttribute = keyof AppState;
export type AppStateChangeHandler = (state: AppState, attribute : AppStateAttribute) => void;

type ViewFactory = () => JSX.Element;

export default class AppState {

    version: number = APP_VERSION;
    debugMode: boolean = false;
    uiTheme: string;
    changeHandlers: AppStateChangeHandler[] = [];
    commandResults: CommandResultView[] = [];
    persistedVersion: number;
    wasOldVersion: boolean;
    env: string;
    pageVisitsCount: number;
    donationClicked: boolean;
    showSettings: boolean = false;
    settingsEmphasizeBytes: boolean;
    settingsAnnotateTypes: boolean = false;
    settingsDimExtraBits: boolean = false;
    settingsCenteredLayout: boolean = true;
    cookieDisclaimerHidden: boolean = false;

    constructor(persistData: PersistedAppData, env: string) {

        this.env = env;

        this.uiTheme = normalizeTheme(persistData.uiTheme);
        this.settingsEmphasizeBytes = !!persistData.settingsEmphasizeBytes;
        this.persistedVersion = persistData.version || 0.1;
        this.wasOldVersion = persistData.version !== null && persistData.version !== undefined && this.version > this.persistedVersion;
        this.debugMode = persistData.debugMode === true;
        this.pageVisitsCount = persistData.pageVisitsCount || 0;
        this.donationClicked = persistData.donationClicked;
        this.settingsAnnotateTypes = !!persistData.settingsAnnotateTypes;
        this.settingsDimExtraBits = !!persistData.settingsDimExtraBits;
        this.cookieDisclaimerHidden = !!persistData.cookieDisclaimerHidden;
        this.settingsCenteredLayout = (persistData.settingsCenteredLayout === undefined) ? true : !!persistData.settingsCenteredLayout;
    }

    addCommandResult(input: string, view: ViewFactory) {
        const key = generateKey();
        this.commandResults.unshift({ key, input, view });
        log.debug(`command result added: ${input}`);
        this.triggerChanged('commandResults');
    }

    clearCommandResults() {
        this.commandResults = [];
        this.triggerChanged('commandResults');
    }

    removeResult(index: number) {
        if (index < 0 || index >= this.commandResults.length)
            return;

        this.commandResults.splice(index, 1);
        this.triggerChanged('commandResults');
    }

    toggleEmphasizeBytes(value?: boolean) {
        this.settingsEmphasizeBytes = value !== null && value !== undefined ? value : !this.settingsEmphasizeBytes;
        this.triggerChanged('settingsEmphasizeBytes');
    }

    onChange(handler: AppStateChangeHandler) {
        this.changeHandlers.push(handler);
    }

    triggerChanged(attribute: AppStateAttribute) {
        this.changeHandlers.forEach(h => h(this, attribute));
    }

    setUiTheme(theme: string) {
        
        const normalized = normalizeTheme(theme);

        if(this.uiTheme === normalized) 
            return;

        this.uiTheme = normalized;
        this.triggerChanged('uiTheme');
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        this.triggerChanged('debugMode');
    }

    toggleShowSettings() {
        this.showSettings = !this.showSettings;
        this.triggerChanged('showSettings');
    }

    toggleAnnotateTypes(value?: boolean) {
        this.settingsAnnotateTypes = value !== null && value !== undefined ? value : !this.settingsAnnotateTypes;
        this.triggerChanged('settingsAnnotateTypes');
    }

    toggleDimExtraBits() {
        this.settingsDimExtraBits = !this.settingsDimExtraBits;
        this.triggerChanged('settingsDimExtraBits');
    }

    toggleCenteredLayout(value?: boolean) {
        this.settingsCenteredLayout = value !== null && value !== undefined ? value : !this.settingsCenteredLayout;
        this.triggerChanged('settingsCenteredLayout');
    }

    registerVisit() {
        this.pageVisitsCount++;
        this.triggerChanged('pageVisitsCount');
    }

    onDonationClicked(): boolean {
        if (this.donationClicked === true) return false;

        this.donationClicked = true;
        this.triggerChanged('donationClicked');
        return true;
    }

    setCookieDisclaimerHidden(value: boolean) {
        this.cookieDisclaimerHidden = value;
        this.triggerChanged('cookieDisclaimerHidden');
    }

    getPersistData(): PersistedAppData {
        return {
            settingsEmphasizeBytes: this.settingsEmphasizeBytes,
            uiTheme: this.uiTheme,
            version: this.version,
            debugMode: this.debugMode,
            pageVisitsCount: this.pageVisitsCount,
            donationClicked: this.donationClicked,
            settingsAnnotateTypes: this.settingsAnnotateTypes,
            settingsDimExtraBits: this.settingsDimExtraBits,
            settingsCenteredLayout: this.settingsCenteredLayout,
            cookieDisclaimerHidden: this.cookieDisclaimerHidden,
        }
    }
};

function generateKey(): number {
    return Math.ceil(Math.random() * 10000000) ^ Date.now(); // Because why the hell not...
}

function normalizeTheme(theme: string): string {
    if (theme === 'iron') return 'graphite';
    return theme;
}
