import is from '../core/is';
import log from 'loglevel';

export type CommandInput = {
    input: string;
    options: CommandOptions
}

export type CommandOptions = {
    doNotTrack: boolean;
    // The command comes from the link that opened the page, not from the user
    fromLink?: boolean;
}

export type HandlerOptions = {
    // A link can run the command. Only a command that cannot change the settings,
    // the saved data or the analytics state can have this option.
    runsFromLink?: boolean;
}

type HandleFunction = (input: CommandInput) => void;
type InputErrorHandler = (input:string, error: Error) => void;

const DEFAULT_COMMAND_OPTIONS : CommandOptions = {
    doNotTrack: false
};

export interface ICommandHandler extends HandlerOptions {
    canHandle (input:string) : boolean;
    handle: HandleFunction;
}

export class CmdShell {
    debugMode: boolean;
    handlers: ICommandHandler[];
    errorHandler: InputErrorHandler | null; 
    constructor() {
        this.handlers = [];
        this.debugMode = false;
        this.errorHandler = null;
    };

    execute (rawInput: string, ops?: CommandOptions ) {

        log.debug(`Executing command: ${rawInput}`);

        const resolvedOps = ops ?? Object.assign({}, DEFAULT_COMMAND_OPTIONS);

        const input = rawInput.trim().toLowerCase();
        const handler = this.findHandler(input);

        // Somebody else can make a link. Thus a link runs only the commands that cannot change
        // the settings of the user, for example #incognito:off or #dark.
        if(handler !== null && resolvedOps.fromLink === true && handler.runsFromLink !== true) {
            this.handleError(input, new Error(`A link cannot run the command "${input}", because it can change your settings. To run it, type it.`));
            return;
        }

        if(handler !== null) {
            // if(this.debugMode) {
            //     this.invokeHandler(input, handler, ops);
            //     return
            // }

            try {
                this.invokeHandler(input, handler, resolvedOps);
            } catch (e) {
                 this.handleError(input, e as Error);
            }
        }
        else {
            log.debug(`Handled is not found for command: ${rawInput}`)
            this.handleError(input, new Error("Unsupported expression: " + input.trim()));
        }
    };

    onError(h: InputErrorHandler) {
        this.errorHandler = h;
    }
   
    command (cmd : string | object, handler? : any, options? : HandlerOptions) {
        const h = this.createHandler(cmd, handler, options);
        if(h === null){
            console.warn('unexpected set of arguments: ', JSON.stringify(arguments));
            return;
        }

        if(!is.aFunction(h.canHandle)) {
            console.warn('handler is missing "canHandle" function. registration denied.');
            return;
        }

        if(!is.aFunction(h.handle)) {
            console.warn('handler is missing "handle" function. registration denied.');
            return;
        }

        this.handlers.push(h);
    };

    createHandler (cmd : string | object, handler : HandleFunction, options? : HandlerOptions) : ICommandHandler | null {
        if(is.plainObject(cmd)) {
            return cmd as ICommandHandler;
        }

        if(is.string(cmd)) {
            return { canHandle: function (input) { return input === cmd; }, handle: handler, ...options };
        }

        return null;
    }

    findHandler (input: string) : ICommandHandler | null {
        return this.handlers.find(h => h.canHandle(input)) ?? null;
    };

    invokeHandler (input : string, handler : ICommandHandler, options: CommandOptions) {

        const cmdResult = handler.handle({ input: input, options });
        if(cmdResult !== null && cmdResult !== undefined) {
            log.debug(cmdResult);
        }
    };

    handleError (input: string, err: Error) {

        if(this.debugMode)
            console.error(input, err);

        if(this.errorHandler !== null)
            this.errorHandler(input, err);
    }
}

const cmdShell = new CmdShell();

export default cmdShell;