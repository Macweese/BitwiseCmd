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

describe('the limit of the history', () => {
    function stateWithLimit(limit: number, ...inputs: string[]) {
        const state = new AppState(appStateStore.getPersistedData(), 'test');
        state.maxCommandResults = limit;
        inputs.forEach(input => state.addCommandResult(input, view));
        return state;
    }

    it('is 500 results', () => {
        expect(new AppState(appStateStore.getPersistedData(), 'test').maxCommandResults).toBe(500);
    });

    it('removes the oldest result when a new result is added', () => {
        const state = stateWithLimit(3, 'a', 'b', 'c');
        expect(state.olderResultsRemoved).toBe(false);

        state.addCommandResult('d', view);

        expect(inputs(state)).toEqual(['d', 'c', 'b']);
        expect(state.olderResultsRemoved).toBe(true);
    });

    it('keeps the keys of the results that stay', () => {
        const state = stateWithLimit(2, 'a', 'b');
        const keyOfB = state.commandResults[0].key;

        state.addCommandResult('c', view);

        expect(state.commandResults[1].key).toBe(keyOfB);
    });

    it('starts again after clear', () => {
        const state = stateWithLimit(2, 'a', 'b', 'c');

        state.clearCommandResults();
        state.addCommandResult('d', view);

        expect(inputs(state)).toEqual(['d']);
        expect(state.olderResultsRemoved).toBe(false);
    });

    it('applies with the default limit', () => {
        const state = new AppState(appStateStore.getPersistedData(), 'test');
        for (let i = 0; i < 501; i++) state.addCommandResult(String(i), view);

        expect(state.commandResults).toHaveLength(500);
        expect(state.commandResults[0].input).toBe('500');
        expect(state.commandResults[499].input).toBe('1');
    });
});
