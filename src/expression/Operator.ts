import calc from '../core/calc';
import { Integer } from '../core/Integer';
import Operand from './Operand';
import { ExpressionElement } from './expression-interfaces';
import { binaryWarnings, conversionWarning } from './warnings';

export default class Operator implements ExpressionElement {
    operand: ExpressionElement;
    operator: string;
    isOperator: boolean;
    isShiftExpression: boolean;
    isNotExpression: boolean;

    constructor(operand : ExpressionElement, operator : string) {

        this.operand = operand;
        this.operator = operator;
        this.isOperator = true;
        this.isShiftExpression = this.operator.indexOf('<') >= 0 || this.operator.indexOf('>')>= 0;
        this.isNotExpression = this.operator === '~';
    }
        
    evaluate(operand?: Operand) : Operand {
        
        if (operand instanceof Operator)
            throw new Error('Operand must be scalar value.');
        
        if( this.operator !== "~" && (operand === undefined || operand === null))
            throw new Error("Operand is required.");

        var evaluatedOperand = this.operand.evaluate();

        return this.operator === "~"
            ? applyNotOperator(this.operand.getUnderlyingOperand())
            : applyOperator(operand!, this.operator, evaluatedOperand);
    }

    getUnderlyingOperand() : Operand {
        return this.operand.getUnderlyingOperand();
    }

    toString(): string {
        return this.operator + this.operand.toString();
    }
}

// Integer promotion, as in C, C++, C# and Java. An operand that is narrower than int
// goes into an operation as a 32-bit signed int. Thus operations on bytes and shorts
// do not wrap at 8 or 16 bits. All 8-bit and 16-bit values fit, signed or unsigned.
export function promote(operand: Operand) : Operand {
    const n = operand.value;

    return n.maxBitSize < 32
        ? operand.setValue(new Integer(n.value, 32, true)).setLabel("promoted")
        : operand;
}

function applyNotOperator(operand: Operand) : Operand {
    return new Operand(calc.not(promote(operand).value), operand.base);
}

function applyOperator(op1 : Operand, operator: string, op2 : Operand) : Operand {
    
    const isShift = /<|>/.test(operator);
    const narrowType = commonNarrowType(op1.value, isShift ? null : op2.value);

    if(isShift)
    {
        // The result of a shift has the type of its (promoted) left operand
        promote(op1);
    }
    else
    {
        // Promote two narrow operands. For a narrow operand next to a 32-bit or 64-bit
        // operand, equalizeSize converts the narrow operand to the type of the other operand.
        if(op1.value.maxBitSize < 32 && op2.value.maxBitSize < 32)
        {
            promote(op1);
            promote(op2);
        }

        if(op1.value.maxBitSize === op2.value.maxBitSize && op1.value.signed !== op2.value.signed)
            throw new Error("Operator `" + operator + "` cannot be applied to signed and unsigned operands of the same " + op2.value.maxBitSize + "-bit size.");

        equalizeSize(op1, op2);
    }

    const result = calc.operation(op1.value, operator, op2.value);

    return new Operand(result, op2.base)
        .addWarnings(...binaryWarnings(op1.value, operator, op2.value, result, narrowType));
}

// The type that the user typed for the operands, if it is narrower than int and the
// same for all operands. A reader can expect the result to have this type.
function commonNarrowType(n1: Integer, n2: Integer | null) : Integer | null {

    if(n1.maxBitSize >= 32) return null;
    if(n2 !== null && (n2.maxBitSize !== n1.maxBitSize || n2.signed !== n1.signed)) return null;

    return n1;
}

function equalizeSize(op1: Operand, op2: Operand) {
    
    const n1 = op1.value;
    const n2 = op2.value;

    if(n1.maxBitSize === n2.maxBitSize)
    {
        if(n1.signed === n2.signed) return;

        // Example int and unsigned int. Promote both to 64 bit
        op1.setValue(n1.resize(n1.maxBitSize*2).toSigned()).setLabel("converted");
        op2.setValue(n2.resize(n2.maxBitSize*2).toSigned()).setLabel("converted");
        return;
    }
    
    if(n1.maxBitSize > n2.maxBitSize) 
        convert(op2, n1);
    else 
        convert(op1, n2);
}

function convert(operand: Operand, type: Integer) {
    const before = operand.value;
    const after = before.convertTo(type);

    operand.setValue(after).setLabel("converted").addWarnings(conversionWarning(before, after));
}