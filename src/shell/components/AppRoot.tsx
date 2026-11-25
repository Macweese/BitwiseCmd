import React from 'react';
import InputBox from './InputBox';
import DisplayResultView from './DisplayResultView';
import AppState, { CommandResultView } from '../AppState';
import cmd from '../cmd';
import DebugIndicators from './DebugIndicators';
import hash from '../../core/hash';
import TopLinks from './TopLinks';
import SettingsPane from './SettingsPane';
import CommandLink from '../../core/components/CommandLink';
import { faGear, faPersonRunning } from '../../core/components/icons';
import CookieDisclaimerFooter from './CookieDisclaimerFooter';
import bladerunner from '../Bladerunner';


type ResultItemProps = {
    result: CommandResultView,
    appState: AppState,
    // The display settings that change the content of a view. They are props, and thus a change
    // renders the result again. The other display settings are classes on the root element.
    annotateTypes: boolean,
    bytePadding: boolean
};

// One result of the list. It is rendered again only when one of these display settings changes,
// and not when a different result is added or removed.
const ResultItem = React.memo(function ResultItem({ result, appState }: ResultItemProps) {
    return <DisplayResultView resultKey={result.key} input={result.input} inputHash={hash.encodeHash(result.input)} appState={appState}>
        {result.view()}
    </DisplayResultView>;
});

type AppRootProps = {
    appState: AppState,    
};

type AppRootState = {
    uiTheme: string,
    settingsEmphasizeBytes: boolean,
    commandResults: CommandResultView[],
    settingsCenteredLayout: boolean
}

export default class AppRoot extends React.Component<AppRootProps, AppRootState> {
    
    componentWillMount() {
        this.refresh();
        this.props.appState.onChange(() => this.refresh());
    }

    refresh() {
        this.setState(this.props.appState);
    }
    
    getIndicator(value : boolean) {
        return value ? 'on' : 'off';
    }

    getResultViews() : JSX.Element[] {
        const appState = this.props.appState;

        return this.state.commandResults.map(r =>
            <ResultItem key={r.key} result={r} appState={appState}
                annotateTypes={appState.settingsAnnotateTypes}
                bytePadding={appState.bytePadding} />);
    }

    componentDidMount(): void {
        bladerunner.start(this.props.appState);
    }

    render() {

        const enableNewUi = this.props.appState.env !== 'prod' || true;
        const newUi = enableNewUi ? 'new-ui' : '';
        const settingsCss = "settings-button" + (this.props.appState.showSettings ? '' : ' soft');

        const layoutClass = this.state.settingsCenteredLayout ? 'layout-centered' : 'layout-stretched';
        // The stylesheet applies these two settings. Thus a change does not render the results again.
        const displayClasses = (this.props.appState.settingsEmphasizeBytes ? ' emphasize-bytes' : '')
            + (this.props.appState.settingsDimExtraBits ? ' dim-extra-bits' : '');

        return <div className={`app-root ${this.state.uiTheme} ${newUi} ${layoutClass}${displayClasses}`}>
                    <div className="header-pane">
                        <DebugIndicators appState={this.props.appState} />
                        <div className="header">
                            <h1 onClick={() => bladerunner.toggleLights()}>
                                Bitwise<span className="header-cmd">Cmd</span>
                            </h1>
                        <TopLinks />
                        </div>

                        <div className="expressionInput-container">
                            <div className="input-wrapper">
                                <InputBox onCommandEntered={(input) => cmd.execute(input)} />
                            </div>
                            <span className={settingsCss}>
                                <CommandLink text="" command='settings' icon={faGear} />
                            </span>

                        </div>
                    </div>
                    <div className="content-pane">
                        {this.props.appState.showSettings ? <SettingsPane appState={this.props.appState} /> : null}
                            <div id="output">
                            {this.getResultViews()}
                            </div>
                    </div>
                    <CookieDisclaimerFooter appState={this.props.appState} />
                    <div className="bladerunner-easter-egg">
                        <CommandLink text="" command='bladerunner-easter' icon={faPersonRunning} />
                    </div>
                </div>;
    }
}


