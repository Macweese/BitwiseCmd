import appStateStore from './appStateStore';
import analyticsTracking from './analyticsTracking';
import AppState from './AppState';

beforeEach(() => localStorage.clear());

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
