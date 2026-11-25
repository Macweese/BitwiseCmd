import AppState from '../shell/AppState';
import appStateStore from '../shell/appStateStore';
import { CmdShell } from '../shell/cmd';
import ipAddressParser from './ip-parser';
import networkingAppModule from './module';

beforeEach(() => localStorage.clear());
// react-scripts resets the mocks before each test, but it does not restore the spied functions
afterEach(() => jest.restoreAllMocks());

it('parses each IP address input once', () => {
    const appState = new AppState(appStateStore.getPersistedData(), 'test');
    const cmd = new CmdShell();
    networkingAppModule.setup(appState, cmd);
    const parse = jest.spyOn(ipAddressParser, 'parse');

    cmd.execute('192.168.0.1/24', { doNotTrack: true });
    expect(parse).toHaveBeenCalledTimes(1);

    cmd.execute('192.168.0.1/24', { doNotTrack: true });
    expect(parse).toHaveBeenCalledTimes(2);

    expect(appState.commandResults.map(r => r.input)).toEqual(['192.168.0.1/24', '192.168.0.1/24']);
});
