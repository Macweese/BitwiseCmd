import AppState, { APP_VERSION, PersistedAppData } from "./AppState";

const storeKey = 'AppState';

const DEFAULT_DATA : PersistedAppData = {
    version: APP_VERSION,
    debugMode: false,

    cookieDisclaimerHidden: false,
    uiTheme: 'dark',

    settingsAnnotateTypes: false,
    settingsCenteredLayout: true,
    settingsDimExtraBits: false,
    settingsEmphasizeBytes: false,

    pageVisitsCount: 0,
    donationClicked: false,
}

const appStateStore = {
    getPersistedData() : PersistedAppData {
        var json = window.localStorage.getItem(storeKey);
        if(!json) {
            return DEFAULT_DATA;
        }

        try {
            return migrate(JSON.parse(json));
        }
        catch(ex) {
            console.error('Failed to parse AppState json. Json Value: \n' + json, ex);
            return DEFAULT_DATA;
        }
    },

    watch (appState: AppState) {
        appState.onChange(() => this.persistData(appState));
    },

    persistData(appState: AppState) {
        localStorage.setItem(storeKey, JSON.stringify(appState.getPersistData()));
    }
};

// Settings persisted before version 12 used different key names
const RENAMED_KEYS: { [oldKey: string]: keyof PersistedAppData } = {
    emphasizeBytes: 'settingsEmphasizeBytes',
    annotateTypes: 'settingsAnnotateTypes',
    dimExtrBits: 'settingsDimExtraBits',
    centeredLayout: 'settingsCenteredLayout',
    pageVisistsCount: 'pageVisitsCount',
};

function migrate(data: any): PersistedAppData {
    for (const oldKey of Object.keys(RENAMED_KEYS)) {
        if (oldKey in data) {
            const newKey = RENAMED_KEYS[oldKey];
            if (!(newKey in data))
                data[newKey] = data[oldKey];
            delete data[oldKey];
        }
    }

    return data as PersistedAppData;
}

export default appStateStore;
