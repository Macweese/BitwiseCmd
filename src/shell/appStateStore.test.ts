import appStateStore from './appStateStore';
import analyticsTracking from './analyticsTracking';
import AppState from './AppState';

beforeEach(() => localStorage.clear());
// react-scripts resets the mocks before each test, but it does not restore the spied functions
afterEach(() => jest.restoreAllMocks());

describe('appStateStore', () => {
    it('returns the defaults when nothing is stored', () => {
        expect(appStateStore.getPersistedData().uiTheme).toBe('dark');
    });

    it('migrates the setting names used before version 12', () => {
        localStorage.setItem('AppState', JSON.stringify({
            version: 11,
            uiTheme: 'light',
            emphasizeBytes: true,
            annotateTypes: true,
            dimExtrBits: true,
            centeredLayout: false,
            pageVisistsCount: 7,
        }));

        const data = appStateStore.getPersistedData();
        expect(data.settingsEmphasizeBytes).toBe(true);
        expect(data.settingsAnnotateTypes).toBe(true);
        expect(data.settingsDimExtraBits).toBe(true);
        expect(data.settingsCenteredLayout).toBe(false);
        expect(data.pageVisitsCount).toBe(7);
        expect(data.uiTheme).toBe('light');
        expect(data).not.toHaveProperty('emphasizeBytes');
    });

    it('round-trips the state of the app', () => {
        const state = new AppState(appStateStore.getPersistedData(), 'test');
        state.toggleEmphasizeBytes(true);
        appStateStore.persistData(state);

        expect(appStateStore.getPersistedData().settingsEmphasizeBytes).toBe(true);
    });
});

describe('saving the state', () => {
    function watchedState() {
        const state = new AppState(appStateStore.getPersistedData(), 'test');
        appStateStore.watch(state);
        return state;
    }

    it('writes only when the saved data changes', () => {
        const state = watchedState();
        const setItem = jest.spyOn(Storage.prototype, 'setItem');

        state.addCommandResult('1', () => null as unknown as JSX.Element);
        expect(setItem).toHaveBeenCalledTimes(1);

        state.addCommandResult('2', () => null as unknown as JSX.Element);
        state.toggleShowSettings();
        expect(setItem).toHaveBeenCalledTimes(1);

        state.setUiTheme('light');
        expect(setItem).toHaveBeenCalledTimes(2);
        expect(JSON.parse(localStorage.getItem('AppState')!).uiTheme).toBe('light');
    });

    it('writes the data again if something else changed the stored value', () => {
        const state = watchedState();
        state.setUiTheme('light');

        localStorage.removeItem('AppState');
        state.addCommandResult('1', () => null as unknown as JSX.Element);

        expect(JSON.parse(localStorage.getItem('AppState')!).uiTheme).toBe('light');
    });
});

describe('analytics tracking', () => {
    it('is enabled unless opted out', () => {
        expect(analyticsTracking.isEnabled()).toBe(true);
        expect(new AppState(appStateStore.getPersistedData(), 'test').analyticsTracking).toBe(true);
    });

    it('honours an opt-out stored under the name used before version 12', () => {
        localStorage.setItem('TrackAnalytics', 'false');
        expect(analyticsTracking.isEnabled()).toBe(false);
    });

    it('is toggled through the app state and persisted on its own', () => {
        const state = new AppState(appStateStore.getPersistedData(), 'test');

        state.toggleAnalyticsTracking(false);
        expect(state.analyticsTracking).toBe(false);
        expect(localStorage.getItem('analyticsTracking')).toBe('false');
        expect(new AppState(appStateStore.getPersistedData(), 'test').analyticsTracking).toBe(false);

        state.toggleAnalyticsTracking();
        expect(state.analyticsTracking).toBe(true);
        expect(localStorage.getItem('analyticsTracking')).toBe('true');
    });
});
