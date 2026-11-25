import { parser } from './expression';
import BitwiseOperation from './BitwiseOperation';
import ListOfNumbers from './ListOfNumbers';
import calc from '../core/calc';
import { Integer } from '../core/Integer';
import { OperandWarning } from './warnings';

// The kinds of the warnings on the operands, in the sequence of the input, and on the result
function warnings(input: string) {
    const expr = parser.parse(input) as BitwiseOperation;
    const result = expr.evaluate();

    return {
        operands: Array.from(expr.tree.allOperands.values()).map(n => n.operand!.warnings.map(w => w.kind)),
        result: result.warnings.map(w => w.kind),
    };
}

const resultWarning = (input: string) => (parser.parse(input) as BitwiseOperation).evaluate().warnings[0];
const operandWarning = (input: string, index: number) => {
    const expr = parser.parse(input) as BitwiseOperation;
    expr.evaluate();
    return Array.from(expr.tree.allOperands.values())[index].operand!.warnings[0];
};

describe('warnings', () => {
    it.each([
        '1 + 2', '7 / 2', '-7 % 3', '1 << 31', '-1 >>> 31', '~5', '-(5)', '0xffu + 1u',
        '-2147483648 + 0', '-2147483648 % -1', '~(-2147483648)', '2147483648l + 1l',
        '1b + 1b', '10b & 15b | ~3b', '-128b + 127b', '255ub & 15ub',
    ])('has nothing to say about %s', (input) => {
        expect(warnings(input)).toEqual({ operands: warnings(input).operands.map(() => []), result: [] });
    });

    it.each([
        '2147483647 + 1', '-2147483648 - 1', '65536 * 65536', '-(-2147483648)', '-2147483648 / -1',
        '9223372036854775807l + 1l', '4294967295u + 1u', '0u - 1u', '-(1u)', '65535us * 65535us',
    ])('reports the overflow of %s', (input) => {
        expect(warnings(input).result).toEqual(['overflow']);
    });

    it('says how the languages treat an overflow', () => {
        expect(resultWarning('2147483647 + 1').text).toBe(
            "The exact result, 2147483648, does not fit a 32-bit signed integer. It wrapped around to -2147483648, as in Java, C# and Go. "
            + "In C and C++ signed overflow is undefined behaviour, and Rust panics in debug builds.");
        expect(resultWarning('-2147483648 / -1').text).toContain("Rust panics and C# throws an exception");
        expect(resultWarning('4294967295u + 1u').text).toContain("as in C, C++, C# and Go. Rust panics in debug builds.");
        expect(resultWarning('-(1u)').text).toContain("It wrapped around to 4294967295, as in C, C++ and Go.");
    });

    it('reports a number that is 64 bits wide because of its value', () => {
        expect(warnings('-(2147483648)')).toEqual({ operands: [['literal']], result: [] });
        expect(warnings('0xFFFFFFFF >> 1').operands).toEqual([['literal'], []]);
        expect(warnings('1 << 4294967296').operands).toEqual([[], ['literal']]);
        expect(warnings('4294967296u + 1ul').operands).toEqual([[], []]);

        expect(operandWarning('-(2147483648)', 0).text).toContain("Java does not accept it without the L suffix, and C# reads it as an unsigned 32-bit integer.");
        expect(operandWarning('-(4294967296)', 0).text).toContain("Java does not accept it without the L suffix.");
        expect(operandWarning('0xFFFFFFFF >> 1', 0).text).toContain("In Java the same digits are the 32-bit integer -1; in C, C++ and C# they are an unsigned 32-bit integer.");
        expect(operandWarning('0b10000000000000000000000000000000 >> 1', 0).text).toContain("the 32-bit integer -2147483648");
        expect(operandWarning('-0xFFFFFFFF + 0', 0).text).toContain("Java, C and C++ read its digits as a 32-bit number and negate that");
    });

    it('does not warn about a number that is only listed', () => {
        const list = parser.parse('2147483648 0xFFFFFFFF') as ListOfNumbers;
        expect(list.children.map(c => c.warnings)).toEqual([[], []]);
    });

    it('reports an operand that was converted to the type of the other one', () => {
        expect(warnings('1b + 2')).toEqual({ operands: [['conversion'], []], result: [] });
        expect(warnings('2 + 1b')).toEqual({ operands: [[], ['conversion']], result: [] });
        expect(warnings('1 + 2l').operands).toEqual([['conversion'], []]);
        expect(warnings('1us + 2ul').operands).toEqual([['conversion'], []]);

        expect(operandWarning('1b + 2', 0)).toMatchObject({
            kind: 'conversion',
            title: "Converted",
            text: "This number was an 8-bit signed integer. It was converted to a 32-bit signed integer to match the other operand; its value is the same. "
                + "Most C-family languages do this silently; Rust and Go want the conversion written out.",
        });
    });

    it('says so when a conversion changed the value', () => {
        expect(operandWarning('-1 + 1ul', 0)).toMatchObject({
            kind: 'conversion',
            title: "Converted, value changed",
            text: "As a 32-bit signed integer this number is -1. Converted to a 64-bit unsigned integer to match the other operand, it is 4294967295: "
                + "its 32 bits are kept and the rest is filled with zeros. C and C++ extend the sign instead, which gives 18446744073709551615.",
        });
        expect(operandWarning('-1b & 4294967295u', 0).text).toContain("it is 255: its 8 bits are kept");
        expect(operandWarning('-1b & 4294967295u', 0).text).toContain("which gives 4294967295.");
    });

    it('reports a result that the type of its promoted operands could not hold', () => {
        expect(warnings('127b + 1b')).toEqual({ operands: [[], []], result: ['promotion'] });
        expect(warnings('~0ub')).toEqual({ operands: [[]], result: ['promotion'] });
        expect(warnings('-(-128b)').result).toEqual(['promotion']);
        expect(warnings('1b << 8').result).toEqual(['promotion']);
        expect(warnings('0ub - 1ub').result).toEqual(['promotion']);
        expect(warnings('32767s * 2s').result).toEqual(['promotion']);

        // Operands of two different narrow types have no common type for the comparison
        expect(warnings('255ub + 1b').result).toEqual([]);
        expect(warnings('127b + 1s').result).toEqual([]);

        expect(resultWarning('127b + 1b')).toMatchObject({
            kind: 'promotion',
            title: "Does not fit the type of its operands",
            text: "This result does not fit an 8-bit signed integer, the type of its operands. C, C++, C# and Java compute it on 32-bit integers, as shown here; "
                + "stored back into an 8-bit signed integer it would be -128. Rust and Go compute in 8 bits.",
        });
        expect(resultWarning('~0ub').text).toContain("stored back into an 8-bit unsigned integer it would be 255");
        expect(resultWarning('1b << 8').title).toBe("Does not fit the type of its operand");
    });

    it('reports a shift count that is negative or not smaller than the width', () => {
        expect(warnings('1 << 32').result).toEqual(['shift']);
        expect(warnings('1 << -1').result).toEqual(['shift']);
        expect(warnings('-1 >> 33').result).toEqual(['shift']);
        expect(warnings('-1 >>> 32').result).toEqual(['shift']);
        expect(warnings('1l << 64').result).toEqual(['shift']);
        expect(warnings('1l << 63').result).toEqual([]);
        expect(warnings('1b << 31').result).toEqual(['promotion']);     // the width of the promoted operand counts
        expect(warnings('1b << 40').result).toEqual(['shift', 'promotion']);

        expect(resultWarning('1 << 33').text).toBe(
            "The shift count 33 is not smaller than the width of the shifted number (32 bits). It is reduced modulo 32 to 1, as in Java and C#. "
            + "In C and C++ this is undefined behaviour, Go shifts every bit out, and Rust panics in debug builds.");
        expect(resultWarning('1 << -1').text).toBe(
            "The shift count -1 is negative. It is reduced modulo 32 to 31, as in Java and C#. "
            + "In C and C++ this is undefined behaviour, Go panics, and Rust panics in debug builds.");
    });

    it('warns about every step of a longer expression', () => {
        expect(warnings('(2147483647 + 1) * 2 + 1l')).toEqual({ operands: [[], [], [], []], result: [] });

        const expr = parser.parse('(2147483647 + 1) * 2') as BitwiseOperation;
        expect(expr.evaluate().warnings.map(w => w.kind)).toEqual(['overflow']);
        expect(expr.tree.root.leftChild!.evaluate().warnings.map(w => w.kind)).toEqual(['overflow']);
    });

    it('forgets the warnings of an operand whose bits were changed, and recomputes those of the result', () => {
        const expr = parser.parse('2147483647 + 1l') as BitwiseOperation;
        expect(warnings('2147483647 + 1')).toEqual({ operands: [[], []], result: ['overflow'] });
        expr.evaluate();

        const [left, right] = Array.from(expr.tree.allOperands.values()).map(n => n.operand!);
        expect(left.warnings.map(w => w.kind)).toEqual(['conversion']);

        expr.tree.updateOperand(left.id, calc.flipBit(left.value, 63));
        expect(left.warnings).toEqual([]);
        expect(right.warnings).toEqual([]);
        expect(expr.evaluate().warnings).toEqual([]);

        expr.tree.updateOperand(left.id, Integer.long('9223372036854775807'));
        expect(expr.evaluate().warnings.map(w => w.kind)).toEqual(['overflow']);
    });
});

describe('negative unsigned numbers', () => {
    const listWarnings = (input: string) => (parser.parse(input) as ListOfNumbers).children.map(n => n.warnings.map(w => w.kind));

    it.each(['-127ub', '-1u', '-1ul', '-255ub', '-32768us'])('reports %s alone, as a list of one number', (input) => {
        expect(listWarnings(input)).toEqual([['literal']]);
    });

    it('reports only the negative unsigned numbers of a list', () => {
        expect(listWarnings('5 -1u 2147483648 -3')).toEqual([[], ['literal'], [], []]);
    });

    it('reports a negative unsigned operand of an expression', () => {
        expect(warnings('-127ub << -31b').operands[0]).toEqual(['literal']);
        expect(warnings('-1u & 0xffu').operands).toEqual([['literal'], []]);
    });

    it('does not report a negation of an unsigned number in parentheses, which has its own warnings', () => {
        expect(warnings('-(1u)').operands).toEqual([[]]);
    });

    it.each(['-0ub', '127ub', '-127b', '-1'])('has nothing to say about %s', (input) => {
        expect(listWarnings(input)).toEqual([[]]);
    });

    it('gives the value that the user typed, the value of the bits and the languages', () => {
        const warning = (parser.parse('-127ub') as ListOfNumbers).children[0].warnings[0];

        expect(warning.title).toBe("Negative unsigned number");
        expect(warning.text).toBe("An unsigned type cannot contain -127. The number has the bits of -127, and as an 8-bit unsigned integer these bits are 129. "
            + "C and C++ give the same value when they convert -127 to this type. C#, Go and Rust reject a negative value for an unsigned type, and Java has no unsigned types.");
        expect(warning.values.map(([start, end]) => warning.text.substring(start, end))).toEqual(['-127', '-127', '129', '-127']);
    });
});

describe('values of a warning', () => {
    // The parts of the text that the tooltip shows with emphasis
    const values = (w: OperandWarning) => w.values.map(([start, end]) => w.text.substring(start, end));

    it('are the exact result and the wrapped result of an overflow', () => {
        expect(values(resultWarning('2147483647 + 1'))).toEqual(['2147483648', '-2147483648']);
        expect(values(resultWarning('-(1u)'))).toEqual(['-1', '4294967295']);
    });

    it('are the values before and after a conversion, and the value in C', () => {
        expect(values(operandWarning('-1 + 1ul', 0))).toEqual(['-1', '4294967295', '18446744073709551615']);
        expect(values(operandWarning('-1b & 4294967295u', 0))).toEqual(['-1', '255', '4294967295']);
        expect(values(operandWarning('1b + 2', 0))).toEqual([]);
    });

    it('is the result in the type of the operands for a promotion', () => {
        expect(values(resultWarning('127b + 1b'))).toEqual(['-128']);
    });

    it('are the shift count and the count after the reduction', () => {
        expect(values(resultWarning('1 << 33'))).toEqual(['33', '1']);
        expect(values(resultWarning('1 << -1'))).toEqual(['-1', '31']);
    });

    it('is the value that Java reads from the same digits', () => {
        expect(values(operandWarning('0xFFFFFFFF >> 1', 0))).toEqual(['-1']);
        expect(values(operandWarning('-(2147483648)', 0))).toEqual([]);
    });

    it('have the position of the value, not of an equal number in the text', () => {
        const warning = resultWarning('1 << 32');

        expect(warning.text).toContain("The shift count 32 is not smaller than the width of the shifted number (32 bits). It is reduced modulo 32 to 0");
        expect(warning.values).toEqual([[16, 18], [warning.text.indexOf('to 0') + 3, warning.text.indexOf('to 0') + 4]]);
    });
});
