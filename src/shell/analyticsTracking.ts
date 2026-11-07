// The analytics opt-out lives in its own localStorage key, because public/analytics.js
// has to read it before the application (and its persisted state) is loaded.
const KEY = 'analyticsTracking';
const LEGACY_KEY = 'TrackAnalytics'; // name used before version 12

const analyticsTracking = {
    isEnabled(): boolean {
        const value = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
        return value !== 'false';
    },

    setEnabled(enabled: boolean) {
        localStorage.setItem(KEY, String(enabled));
        localStorage.removeItem(LEGACY_KEY);

        // Stop sending events right away; enabling takes effect on the next load, when analytics.js runs again
        if (!enabled)
            (window as any).bitwiseCmdAnalyticsHandler = () => false;
    }
};

export default analyticsTracking;
