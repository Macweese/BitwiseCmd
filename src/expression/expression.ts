import Operand from './Operand';
import ListOfNumbers from './ListOfNumbers';
import BitwiseOperation from './BitwiseOperation';
import { Expression } from './expression-interfaces';
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
        var trimmed = input.trim();
        var i = this.factories.length-1;
        for(;i>=0;i--) {
            if(this.factories[i].canCreate(trimmed)){
                return true;
            }
        }
        return false;
    };

    parse (input: string) : Expression | null {
        var trimmed = input.trim();
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
    // Operators, parentheses, digits of all three bases, type suffixes and whitespace
    fullRegex = /^[-~<>&^|*%\/()bxlsua-f0-9+\s]+$/i;

    canCreate(input: string): boolean {
        return this.fullRegex.test(input);
    };

    create(input: string): Expression {
        return new BitwiseOperation(input, new PrattParser(input).parse());
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
