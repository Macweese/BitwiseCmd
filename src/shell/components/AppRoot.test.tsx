import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AppState from '../AppState';
import appStateStore from '../appStateStore';
import AppRoot from './AppRoot';

beforeEach(() => localStorage.clear());

function start() {
    const appState = new AppState(appStateStore.getPersistedData(), 'test');
    render(<AppRoot appState={appState} />);
    return appState;
}

// Adds a result. Returns the function that makes its view, to count how many times it is rendered.
function addResult(appState: AppState, text: string) {
    const view = jest.fn(() => <p>{text}</p>);
    act(() => appState.addCommandResult(text, view));
    return view;
}

const resultTexts = () => screen.getAllByText(/^result /).filter(e => e.tagName === 'P').map(e => e.textContent);

describe('list of results', () => {
    it('shows the newest result first', () => {
        const appState = start();

        addResult(appState, 'result 1');
        addResult(appState, 'result 2');

        expect(resultTexts()).toEqual(['result 2', 'result 1']);
    });

    it('does not render the other results again when a result is added', () => {
        const appState = start();

        const first = addResult(appState, 'result 1');
        const second = addResult(appState, 'result 2');
        addResult(appState, 'result 3');

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('does not render the other results again when a result is removed', () => {
        const appState = start();

        const first = addResult(appState, 'result 1');
        addResult(appState, 'result 2');
        const third = addResult(appState, 'result 3');
        act(() => appState.removeResult(1));

        expect(resultTexts()).toEqual(['result 3', 'result 1']);
        expect(first).toHaveBeenCalledTimes(1);
        expect(third).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['emphasize bytes', (s: AppState) => s.toggleEmphasizeBytes()],
        ['annotate types', (s: AppState) => s.toggleAnnotateTypes()],
        ['dim extra bits', (s: AppState) => s.toggleDimExtraBits()],
    ])('renders the results again when the setting "%s" changes', (_name, change) => {
        const appState = start();

        const first = addResult(appState, 'result 1');
        const second = addResult(appState, 'result 2');
        act(() => change(appState));

        expect(first).toHaveBeenCalledTimes(2);
        expect(second).toHaveBeenCalledTimes(2);
    });

    it.each([
        ['the theme', (s: AppState) => s.setUiTheme('light')],
        ['the settings pane', (s: AppState) => s.toggleShowSettings()],
        ['the layout', (s: AppState) => s.toggleCenteredLayout()],
    ])('does not render the results again when %s changes', (_name, change) => {
        const appState = start();

        const first = addResult(appState, 'result 1');
        act(() => change(appState));

        expect(first).toHaveBeenCalledTimes(1);
    });

    it('removes the result of the button that the user clicks', () => {
        const appState = start();

        addResult(appState, 'result 1');
        addResult(appState, 'result 2');
        addResult(appState, 'result 3');
        fireEvent.click(screen.getAllByTitle("Remove this result")[2]);

        expect(resultTexts()).toEqual(['result 3', 'result 2']);
    });

    it('removes the correct result after a newer result changed the positions', () => {
        const appState = start();

        addResult(appState, 'result 1');
        addResult(appState, 'result 2');
        addResult(appState, 'result 3');
        fireEvent.click(screen.getAllByTitle("Remove this result")[1]);
        addResult(appState, 'result 4');
        fireEvent.click(screen.getAllByTitle("Remove this result")[2]);

        expect(resultTexts()).toEqual(['result 4', 'result 3']);
    });
});
