import Operand from './Operand';
import Operator from './Operator'
import ListOfNumbers from './ListOfNumbers';
import BitwiseOperation from './BitwiseOperation';
import { Expression, ExpressionElement } from './expression-interfaces';
import { numberParser } from './numberParser';
import { PrattParser } from './PrattParser';

export { default as Operand } from './Operand';
export { default as Operator } from './Operator';
export { default as ListOfNumbers } from './ListOfNumbers';
export { default as BitwiseOperation } from './BitwiseOperation';

interface IExpressionParserFactory {
    canCreate: (input: string) => boolean;
    create: (input: string) => Expression;
};

class ExpressionParser {
    factories: IExpressionParserFactory[];
    
    constructor() {
        this.factories = [];
    };

    canParse (input: string) : boolean {
        var trimmed = input.replace(/^\s+|\s+$/, '');
        var i = this.factories.length-1;
        for(;i>=0;i--) {
            if(this.factories[i].canCreate(trimmed)){
                return true;
            }
        }
        return false;
    };

    parse (input: string) : Expression | null {
        var trimmed = input.replace(/^\s+|\s+$/, '');
        var i = 0, l = this.factories.length, factory;

        for(;i<l;i++) {

            factory = this.factories[i];

            if(factory.canCreate(trimmed)){
                return factory.create(trimmed);
            }
        }

        return null;
    };

    addFactory (factory: IExpressionParserFactory) {
        this.factories.push(factory);
    }
}

class ListOfNumbersExpressionFactory implements IExpressionParserFactory
{
    canCreate (input: string): boolean {
        if(input.length === 0) return false;

        return input.split(' ')
            .filter(p => p.length > 0)
            .map(p => numberParser.caseParse(p))
            .filter(n => n === false)
            .length === 0;
    };

    create (input : string) : Expression {
        
        const numbers = input.split(' ')
            .filter(p => p.length > 0)
            .map(m => parseScalarValue(m));

        return new ListOfNumbers(input, numbers);
    }
}

class BitwiseOperationExpressionFactory implements IExpressionParserFactory {
    fullRegex: RegExp;

    constructor() {
        // Updated regex to include parentheses
        this.fullRegex = /^[-,~,<,>,&,^|,*,%,\/,\(,\),-,b,x,l,s,u,a-f,0-9,+\s]+$/i;
    }

    canCreate(input: string): boolean {
        this.fullRegex.lastIndex = 0;
        return this.fullRegex.test(this.normalizeString(input));
    };

    create(input: string): Expression {
        const normalizedString = this.normalizeString(input);

        try {
            // Try to use the Pratt parser (supports precedence and parentheses)
            const prattParser = new PrattParser(normalizedString);
            const { finalResult, steps } = prattParser.parse();

            // Convert steps to ExpressionElement format for compatibility
            const children = this.stepsToChildren(steps, finalResult);

            return new BitwiseOperation(normalizedString, children, steps);
        } catch (error) {
            // If Pratt parser fails, this will bubble up the error
            throw error;
        }
    };

    private stepsToChildren(steps: any[], finalResult: Operand): ExpressionElement[] {
        const children: ExpressionElement[] = [];

        if (steps.length === 0) {
            return [finalResult];
        }

        // Add first operand
        children.push(steps[0].leftOperand);

        // Add each operation
        for (const step of steps) {
            children.push(new Operator(step.rightOperand, step.operator));
        }

        return children;
    }

    normalizeString (input : string): string {
        return input.replace(/\s+/g,'');
    };
}

function parseScalarValue(input : string) : Operand {
    const n = numberParser.parse(input);
    var sv = new Operand(n.value, n.base);
    if(sv.value.maxBitSize !== n.value.maxBitSize) throw new Error("Gotcha!");
    return sv;
}

var parser = new ExpressionParser();
parser.addFactory(new ListOfNumbersExpressionFactory());
parser.addFactory(new BitwiseOperationExpressionFactory());

export {parser};
