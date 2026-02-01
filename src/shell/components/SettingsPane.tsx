import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './SettingsPane.css';
import { faToggleOff, faToggleOn } from '@fortawesome/free-solid-svg-icons';
import AppState from '../AppState';

type SettingsPaneProps = {
    appState : AppState
}

function SettingsPane(props : SettingsPaneProps) {

    const {appState} = props;    

    return <div id="settings" className='settings-container'>
        <div className="inner solid-border">
            <h3>Settings</h3>
            <div className='setting'>
                <button type="button" onClick={() => appState.toggleEmphasizeBytes()}>
                    <FontAwesomeIcon size='xl' icon={appState.settingsEmphasizeBytes ? faToggleOn : faToggleOff} /> Emphasize Bytes
                </button>
                <p className='description'>
                    {appState.settingsEmphasizeBytes
                        ? "Binary strings are padded with extra bits to have a length that is multiple of 8." 
                        : "Binary strings are not padded with extra bits."} 
                </p>
            </div>
            <div className='setting'>
                <button type="button" onClick={() => appState.toggleDimExtraBits()}>
                    <FontAwesomeIcon size='xl' icon={appState.settingsDimExtraBits ? faToggleOn : faToggleOff} /> Dim Padding Bits
                </button>
                <p className='description'>
                    {appState.settingsDimExtraBits
                        ? "Extra bits, used for padding to align numbers of different sizes, are dimmed." 
                        : "Extra bits used for padding are not dimmed."} 
                </p>
            </div>
            <div className='setting'>
                <button type="button" onClick={() => appState.toggleAnnotateTypes()}>
                    <FontAwesomeIcon size='xl' icon={appState.settingsAnnotateTypes ? faToggleOn : faToggleOff} /> Annotate Data Types
                </button>
                <p className='description'>
                    {appState.settingsAnnotateTypes
                        ? "Integers are displayed as they are stored in memory. Bit size is shown." 
                        : "Information about the size of integers is hidden."} 
                </p>
            </div>
            <div className='setting'>
                <button type="button" onClick={() => appState.toggleCenteredLayout()}>
                    <FontAwesomeIcon size='xl' icon={appState.settingsCenteredLayout ? faToggleOn : faToggleOff} /> Centered Layout
                </button>
                <p className='description'>
                    {appState.settingsCenteredLayout
                        ? "Content is centered with wide side margins on large screens."
                        : "Content stretches to full width as before."}
                </p>
            </div>
        </div>
    </div>
}

export default SettingsPane;
