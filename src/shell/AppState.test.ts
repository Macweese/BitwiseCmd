import AppState from './AppState';
import appStateStore from './appStateStore';

beforeEach(() => localStorage.clear());

const view = () => null as unknown as JSX.Element;

function stateWithResults(...inputs: string[]) {
    const state = new AppState(appStateStore.getPersistedData(), 'test');
    inputs.forEach(input => state.addCommandResult(input, view));
    return state;
}

const inputs = (state: AppState) => state.commandResults.map(r => r.input);

describe('removeResultByKey', () => {
    it('removes the result that has the key', () => {
        const state = stateWithResults('a', 'b', 'c');
        const key = state.commandResults.find(r => r.input === 'b')!.key;

        state.removeResultByKey(key);

        expect(inputs(state)).toEqual(['c', 'a']);
    });

    it('tells the listeners about the change', () => {
        const state = stateWithResults('a');
        const listener = jest.fn();
        state.onChange(listener);

        state.removeResultByKey(state.commandResults[0].key);

        expect(listener).toHaveBeenCalledWith(state, 'commandResults');
    });

    it('does nothing for a key that no result has', () => {
        const state = stateWithResults('a', 'b');
        const listener = jest.fn();
        state.onChange(listener);

        state.removeResultByKey(-1);

        expect(inputs(state)).toEqual(['b', 'a']);
        expect(listener).not.toHaveBeenCalled();
    });
});
