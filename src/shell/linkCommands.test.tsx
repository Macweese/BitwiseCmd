import AppState from './AppState';
import appStateStore from './appStateStore';
import { CmdShell } from './cmd';
import shellModule from './module';
import expressionAppModule from '../expression/module';
import networkingAppModule from '../networking/module';
import { getStartupCommands } from './startup';

// The application with its real commands, and the inputs and error messages of its results
function start() {
    const appState = new AppState(appStateStore.getPersistedData(), 'prod');
    const cmd = new CmdShell();
    shellModule.setup(appState, cmd);
    networkingAppModule.setup(appState, cmd);
    expressionAppModule.setup(appState, cmd);

    const results = () => appState.commandResults.map(r => {
        const view = r.view() as { props: { errorMessage?: string } };
        return view.props.errorMessage === undefined ? r.input : `${r.input}: ${view.props.errorMessage}`;
    });

    return { appState, cmd, results };
}

beforeEach(() => localStorage.clear());

describe('commands from a link', () => {
    it.each([
        ['dark', (s: AppState) => s.uiTheme],
        ['bladerunner-easter', (s: AppState) => s.uiTheme],
        ['em', (s: AppState) => s.settingsEmphasizeBytes],
        ['em:on', (s: AppState) => s.settingsEmphasizeBytes],
        ['annotate:on', (s: AppState) => s.settingsAnnotateTypes],
        ['-annotate:on', (s: AppState) => s.settingsAnnotateTypes],
        ['incognito:off', (s: AppState) => s.analyticsTracking],
        ['incognito', (s: AppState) => s.analyticsTracking],
        ['-debug', (s: AppState) => s.debugMode],
        ['donate', (s: AppState) => s.donationClicked],
    ])('do not run %s, which changes a setting or the saved data', (command, setting) => {
        const { appState, cmd, results } = start();
        const before = setting(appState);

        cmd.execute(command, { doNotTrack: true, fromLink: true });

        expect(setting(appState)).toBe(before);
        expect(results()).toEqual([`${command}: Error: A link cannot run the command "${command}", because it can change your settings. To run it, type it.`]);
    });

    it('does not turn analytics on again for a user who turned it off', () => {
        const { appState, cmd } = start();
        cmd.execute('incognito:on');
        expect(appState.analyticsTracking).toBe(false);

        cmd.execute('incognito:off', { doNotTrack: true, fromLink: true });
        cmd.execute('incognito', { doNotTrack: true, fromLink: true });

        expect(appState.analyticsTracking).toBe(false);
        expect(localStorage.getItem('analyticsTracking')).toBe('false');
    });

    it('run expressions, network inputs and the commands that only show information', () => {
        const { cmd, results } = start();
        const inputs = ['1 | 2', '5 6', '192.168.0.1/24', 'vpc 10.0.0.0/16', 'help', 'about', 'whatsnew', 'tip', 'max', 'min', 'guid'];

        inputs.forEach(c => cmd.execute(c, { doNotTrack: true, fromLink: true }));

        // The newest result is the first one
        expect(results().reverse()).toEqual(inputs);
    });

    it('can turn analytics off, as the analytics script does before the page loads', () => {
        ['-notrack', '-incognito', 'incognito:on'].forEach(command => {
            const { appState, cmd } = start();

            cmd.execute(command, { doNotTrack: true, fromLink: true });

            expect(appState.analyticsTracking).toBe(false);
            localStorage.clear();
        });
    });

    it('run all commands when the user types them', () => {
        const { appState, cmd } = start();

        cmd.execute('dark');
        cmd.execute('em:on');

        expect(appState.uiTheme).toBe('dark');
        expect(appState.settingsEmphasizeBytes).toBe(true);
    });
});

describe('startup commands', () => {
    afterEach(() => { window.location.hash = ''; });

    it('come from the link when the address has a hash', () => {
        window.location.hash = '#dark||1|2';
        const appState = new AppState(appStateStore.getPersistedData(), 'test');

        expect(getStartupCommands(appState)).toEqual({ commands: ['dark', '1|2'], fromLink: true });
    });

    it('are the default commands of the application without a hash', () => {
        window.location.hash = '';
        const appState = new AppState(appStateStore.getPersistedData(), 'test');

        expect(getStartupCommands(appState).fromLink).toBe(false);
    });

    it('are the default commands of the application for the hash #empty', () => {
        window.location.hash = '#empty';
        const appState = new AppState(appStateStore.getPersistedData(), 'test');

        expect(getStartupCommands(appState).fromLink).toBe(false);
    });
});
