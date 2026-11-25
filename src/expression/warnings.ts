import { Integer } from '../core/Integer';
import { NumberBase } from '../core/formatter';
import { UINT32_MAX_VALUE } from '../core/const';

// A warning of a result row. It tells the user that the calculator did an operation
// that the same expression can do differently in a program, because the languages
// are different there. The statements about C, C++, Java, Rust and Go agree with tests
// with gcc, javac, rustc and go. The statements about C# agree with its specification.
export type WarningKind =
    'literal'       // a number without a suffix that is too large for 32 bits
    | 'conversion'  // an operand converted to the type of the other one
    | 'overflow'    // an arithmetic result that wrapped around
    | 'promotion'   // a result that fits an int but not the narrow type of its operands
    | 'shift';      // a shift count that is negative or not smaller than the width

export interface OperandWarning {
    kind: WarningKind;
    title: string;
    text: string;
    // The positions in the text of the values that the tooltip shows with emphasis: [start, end)
    values: [number, number][];
}

type Value = { value: string };
type Message = Pick<OperandWarning, 'text' | 'values'>;

// A number that the tooltip shows with emphasis, and that the user can select and copy
const value = (v: bigint) : Value => ({ value: v.toString() });

// Makes the text of a warning from a template, and records the position of each value in it.
// A part of the template can be a message. Its values keep their emphasis.
function message(strings: TemplateStringsArray, ...parts: (string | bigint | Value | Message)[]) : Message {
    let text = strings[0];
    const values: [number, number][] = [];

    parts.forEach((part, i) => {
        if(typeof part === 'object' && 'value' in part) {
            values.push([text.length, text.length + part.value.length]);
            text += part.value;
        }
        else if(typeof part === 'object') {
            part.values.forEach(([start, end]) => values.push([text.length + start, text.length + end]));
            text += part.text;
        }
        else
            text += part;

        text += strings[i + 1];
    });

    return { text, values };
}

type IntegerType = { maxBitSize: number, signed: boolean };

const typeName = (t: IntegerType) => `${t.maxBitSize === 8 ? 'an' : 'a'} ${t.maxBitSize}-bit ${t.signed ? 'signed' : 'unsigned'} integer`;

function fits(value: bigint, type: IntegerType) : boolean {
    const bits = BigInt(type.signed ? type.maxBitSize - 1 : type.maxBitSize);
    const limit = BigInt(1) << bits;

    return type.signed ? value >= -limit && value < limit : value >= 0 && value < limit;
}

const wrap = (value: bigint, type: IntegerType) : bigint =>
    type.signed ? BigInt.asIntN(type.maxBitSize, value) : BigInt.asUintN(type.maxBitSize, value);

// A number without a suffix gets the smallest type that can contain its value, as in C.
// Other languages reject such a number, or read the same digits as a 32-bit number.
export function literalWarning(literal: string, number: Integer, base: NumberBase) : OperandWarning | null {

    const typedByValue = number.maxBitSize === 64 && number.signed && !/l$/i.test(literal);
    if(!typedByValue) return null;

    const negative = number.value < 0;
    const fitsUnsigned32 = number.abs().value <= BigInt(UINT32_MAX_VALUE);
    let other = message`Java does not accept it without the L suffix.`;

    if(base === 'dec' && !negative && fitsUnsigned32)
        other = message`Java does not accept it without the L suffix, and C# reads it as an unsigned 32-bit integer.`;

    if(base !== 'dec' && fitsUnsigned32)
        other = negative
            ? message`Java, C and C++ read its digits as a 32-bit number and negate that, which gives a different value.`
            : message`In Java the same digits are the 32-bit integer ${value(BigInt.asIntN(32, number.value))}; in C, C++ and C# they are an unsigned 32-bit integer.`;

    return {
        kind: 'literal',
        title: "64-bit number",
        ...message`This number does not fit a 32-bit signed integer, so it is a 64-bit one here. ${other}`
    };
}

export function conversionWarning(before: Integer, after: Integer) : OperandWarning {

    if(before.value === after.value)
        return {
            kind: 'conversion',
            title: "Converted",
            text: `This number was ${typeName(before)}. It was converted to ${typeName(after)} to match the other operand; its value is the same. `
                + "Most C-family languages do this silently; Rust and Go want the conversion written out.",
            values: []
        };

    // Only a negative number changes its value. The unsigned target type cannot contain it.
    const signExtended = BigInt.asUintN(after.maxBitSize, before.value);

    const other = after.value === signExtended
        ? message`, as in C and C++.`
        : message`: its ${before.maxBitSize.toString()} bits are kept and the rest is filled with zeros. C and C++ extend the sign instead, which gives ${value(signExtended)}.`;

    return {
        kind: 'conversion',
        title: "Converted, value changed",
        ...message`As ${typeName(before)} this number is ${value(before.value)}. Converted to ${typeName(after)} to match the other operand, it is ${value(after.value)}${other}`
    };
}

// The warnings for the result of `left operator right`. The two operands already have
// the type of the operation. `narrowType` is the 8-bit or 16-bit type that the user
// typed for the two operands, if they had the same type and were promoted.
export function binaryWarnings(left: Integer, operator: string, right: Integer, result: Integer, narrowType: IntegerType | null) : OperandWarning[] {

    const warnings: OperandWarning[] = [];
    const a = left.value;
    const b = right.value;

    if(/<|>/.test(operator)) {
        const width = BigInt(left.maxBitSize);

        if(b < 0 || b >= width) {
            const reduced = ((b % width) + width) % width;

            const fault = b < 0 ? "negative" : `not smaller than the width of the shifted number (${width} bits)`;
            const go = b < 0 ? "Go panics" : "Go shifts every bit out";

            warnings.push({
                kind: 'shift',
                title: "Shift count out of range",
                ...message`The shift count ${value(b)} is ${fault}. It is reduced modulo ${width} to ${value(reduced)}, as in Java and C#. In C and C++ this is undefined behaviour, ${go}, and Rust panics in debug builds.`
            });
        }
    }
    else {
        const exact = operator === '+' ? a + b : operator === '-' ? a - b : operator === '*' ? a * b : operator === '/' ? a / b : result.value;

        if(exact !== result.value)
            warnings.push(overflowWarning(exact, result, operator === '/' ? 'division' : 'arithmetic'));
    }

    if(narrowType !== null && !warnings.some(w => w.kind === 'overflow') && !fits(result.value, narrowType))
        warnings.push(promotionWarning(result, narrowType, /<|>/.test(operator) ? "operand" : "operands"));

    return warnings;
}

// The warnings for the result of a unary operator on `operand`
export function unaryWarnings(operator: string, operand: Integer, result: Integer, narrowType: IntegerType | null) : OperandWarning[] {

    if(operator === '-' && -operand.value !== result.value)
        return [overflowWarning(-operand.value, result, 'negation')];

    if(narrowType !== null && !fits(result.value, narrowType))
        return [promotionWarning(result, narrowType, "operand")];

    return [];
}

function overflowWarning(exact: bigint, result: Integer, operation: 'arithmetic' | 'division' | 'negation') : OperandWarning {

    let languages: string;

    if(operation === 'division')
        languages = "as in Java and Go. In C and C++ this division is undefined behaviour (it traps on x86), Rust panics and C# throws an exception.";
    else if(result.signed)
        languages = "as in Java, C# and Go. In C and C++ signed overflow is undefined behaviour, and Rust panics in debug builds.";
    else if(operation === 'negation')
        languages = "as in C, C++ and Go. C# gives a signed 64-bit result or rejects the negation, and Rust rejects it.";
    else
        languages = "as in C, C++, C# and Go. Rust panics in debug builds.";

    return {
        kind: 'overflow',
        title: "Overflow",
        ...message`The exact result, ${value(exact)}, does not fit ${typeName(result)}. It wrapped around to ${value(result.value)}, ${languages}`
    };
}

function promotionWarning(result: Integer, narrowType: IntegerType, operands: string) : OperandWarning {
    return {
        kind: 'promotion',
        title: "Does not fit the type of its " + operands,
        ...message`This result does not fit ${typeName(narrowType)}, the type of its ${operands}. C, C++, C# and Java compute it on 32-bit integers, as shown here; stored back into ${typeName(narrowType)} it would be ${value(wrap(result.value, narrowType))}. Rust and Go compute in ${narrowType.maxBitSize.toString()} bits.`
    };
}
