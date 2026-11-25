import React from 'react';
import AppState from '../shell/AppState';
import { CmdShell, CommandInput, CommandOptions } from '../shell/cmd';
import ErrorResultView from '../shell/components/ErrorResultView';
import IpAddressView from './components/IpAddressView';
import ipAddressParser, {ParsingError, ParsedIpObject, ParsingResult} from './ip-parser';
import { IpAddress, IpAddressWithSubnetMask, SubnetCommand, VpcCommand } from "./models";
import log from 'loglevel';
import SubnetView from './components/SubnetView';
import { createSubnetMaskIp } from './subnet-utils';
import {sendAnalyticsEvent} from '../shell/analytics';
import VpcView from './components/VpcView';

const networkingAppModule = {
    setup: function(appState: AppState, cmd: CmdShell) {
        
        // canHandle parses the input, and handle uses that result. Thus the input is parsed once.
        let parsed: { input: string, result: ParsingResult } | null = null;

        // Add Ip Address commands
        cmd.command({
            runsFromLink: true,
            canHandle: (input:string) => {
                parsed = { input, result: ipAddressParser.parse(input) };
                return parsed.result !== null && parsed.result !== undefined;
            },
            handle: function(c: CommandInput) {
                const result = parsed !== null && parsed.input === c.input ? parsed.result : ipAddressParser.parse(c.input);
                parsed = null;

                if(result === null || result === undefined)
                    return;

                if(result instanceof ParsingError) {
                    appState.addCommandResult(c.input, () => <ErrorResultView errorMessage={(result as ParsingError).errorMessage} />);
                    return;
                }

                if(result instanceof SubnetCommand) {
                    appState.addCommandResult(c.input, () => <SubnetView subnet={result as SubnetCommand} />);
                    trackCommand('SubnetCommand', c.options);
                    return;
                }

                if(result instanceof VpcCommand) {
                    appState.addCommandResult(c.input, () => <VpcView vpc={result as VpcCommand} />);
                    trackCommand('VpcCommand', c.options);
                    return;
                }

                const ipAddresses : IpAddress[] = [];
                
                (result as ParsedIpObject[]).forEach(r => {
                    if(r instanceof IpAddressWithSubnetMask)
                    {
                        ipAddresses.push(r.ipAddress);
                        ipAddresses.push(createSubnetMaskIp(r));
                    }
                    else if(r instanceof IpAddress) {
                        ipAddresses.push(r);
                    }                    
                });

                trackCommand("IpAddressesInput", c.options);
            
                appState.addCommandResult(c.input, () => <IpAddressView ipAddresses={ipAddresses} />);
            }
        });

        log.debug();
    }
}

function trackCommand(action: string, ops: CommandOptions) {
    if(ops.doNotTrack !== true) {
        sendAnalyticsEvent({
            eventCategory: "NetworkingCommand",
            eventAction: action
        });
    }
}

export default networkingAppModule;