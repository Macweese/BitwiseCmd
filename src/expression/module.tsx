import React from 'react';
import AppState from '../shell/AppState';
import { CmdShell, CommandInput } from '../shell/cmd';
import BitwiseResultView from './components/BitwiseResultView';
import {parser} from './expression';

const expressionAppModule = {
    setup: function(appState: AppState, cmd: CmdShell) {
        
          // Bitwise Expressions
          cmd.command({
            runsFromLink: true,
            canHandle: (input:string) => parser.canParse(input),
            handle: function(c: CommandInput) {
                var expr = parser.parse(c.input);
                appState.addCommandResult(c.input, () => <BitwiseResultView expression={expr!} annotateTypes={appState.settingsAnnotateTypes} bytePadding={appState.bytePadding} />);
            }
        });
    }
}

export default expressionAppModule;