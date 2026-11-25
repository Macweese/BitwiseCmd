import { parser } from './expression';
import BitwiseOperation from './BitwiseOperation';
import ListOfNumbers from './ListOfNumbers';
import calc from '../core/calc';

// Integer promotion: an operand that is narrower than int goes into an operation as a
// 32-bit signed int. The expected values are the results of C, C++, C# and Java for
// operands of the same types (int8_t, uint8_t, int16_t and uint16_t in C).
function evaluate(input: string): string {
    const v = (parser.parse(input) as BitwiseOperation).evaluate().value;
    return `${v.value} ${v.signed ? 'int' : 'uint'}${v.maxBitSize}`;
}

describe('integer promotion', () => {
    it.each([
        ['127b + 1b', '128 int32'],
        ['-128b - 1b', '-129 int32'],
        ['16b * 16b', '256 int32'],
        ['-128b / -1b', '128 int32'],
        ['-128b % -1b', '0 int32'],
        ['32767s + 1s', '32768 int32'],
        ['-32768s * 2s', '-65536 int32'],
        ['100b % 7s', '2 int32'],
        ['127b & 0x0f0fs', '15 int32'],
        ['-1b ^ -1s', '0 int32'],
    ])('arithmetic on bytes and shorts does not wrap at 8 or 16 bits: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it.each([
        ['255ub + 1ub', '256 int32'],
        ['0ub - 1ub', '-1 int32'],
        ['200ub * 2ub', '400 int32'],
        ['65535us + 1us', '65536 int32'],
        ['1us - 2us', '-1 int32'],
        ['0xd512us | 0x4125us', '54583 int32'],
        ['65535us * 65535us', '-131071 int32'], // the product does not fit an int and wraps there
    ])('unsigned bytes and shorts become signed ints: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it.each([
        ['255ub + 1b', '256 int32'],
        ['-1b + 255ub', '254 int32'],
        ['-1s & 0xffub', '255 int32'],
        ['65535us + -1s', '65534 int32'],
        ['-128b | 0x8000us', '-128 int32'],
    ])('signed and unsigned narrow operands can be mixed: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it.each([
        ['~5b', '-6 int32'],
        ['~0ub', '-1 int32'],
        ['~0us', '-1 int32'],
        ['~(-1s)', '0 int32'],
        ['-(-128b)', '128 int32'],
        ['-(-32768s)', '32768 int32'],
        ['-(5ub)', '-5 int32'],
        ['~-128b', '127 int32'],
    ])('unary operators promote their operand: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it.each([
        ['1b << 7', '128 int32'],
        ['1b << 8', '256 int32'],
        ['1b << 31', '-2147483648 int32'],
        ['1b << 32', '1 int32'],
        ['1s << 20', '1048576 int32'],
        ['-1b >> 4', '-1 int32'],
        ['-1b >>> 4', '268435455 int32'],
        ['-128b >>> 28', '15 int32'],
        ['255ub >> 1', '127 int32'],
        ['0x8000us >> 15', '1 int32'],
        ['0x8000us << 16', '-2147483648 int32'],
    ])('a shift promotes its left operand, so the count is reduced modulo 32: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it.each([
        ['1 << 8b', '256 int32'],
        ['1l << 40ub', '1099511627776 int64'],
        ['0x80000000u >> 31s', '1 uint32'],
    ])('the type of a shift does not depend on its right operand: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it.each([
        ['127b + 1', '128 int32'],
        ['255ub + 1', '256 int32'],
        ['-1s * 2', '-2 int32'],
        ['1b + 1u', '2 uint32'],
        ['255ub + 1u', '256 uint32'],
        ['-1s + 1l', '0 int64'],
        ['255ub + 1ul', '256 uint64'],
    ])('a narrow operand next to a 32- or 64-bit one takes the type of that one: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it.each([
        ['127b + 1b + 1b', '129 int32'],
        ['(127b + 1b) * 2s', '256 int32'],
        ['~1b & 0xffub', '254 int32'],
        ['(1ub << 8) + 1l', '257 int64'],
        ['1b << 1b << 8b', '512 int32'],
    ])('the result of a promoted operation is an int: %s', (input, expected) => {
        expect(evaluate(input)).toBe(expected);
    });

    it('a promoted result is signed, so it does not combine with a 32-bit unsigned operand, like any other int', () => {
        expect(() => evaluate('1 + 1u')).toThrow("signed and unsigned operands of the same 32-bit size");
        expect(() => evaluate('(255ub + 1ub) + 1u')).toThrow("signed and unsigned operands of the same 32-bit size");
    });

    it('leaves numbers that take part in no operation as they were typed', () => {
        const list = parser.parse('-5b 200ub 3s 65535us') as ListOfNumbers;
        expect(list.children.map(c => `${c.value.value} ${c.value.signed ? 'int' : 'uint'}${c.value.maxBitSize}`))
            .toEqual(['-5 int8', '200 uint8', '3 int16', '65535 uint16']);
        expect(list.children.map(c => c.label)).toEqual(['', '', '', '']);

        const lone = parser.parse('(5b)') as BitwiseOperation;
        expect(evaluate('(5b)')).toBe('5 int8');
        expect(lone.evaluate().label).toBe('');
    });

    it('labels the operands it promoted', () => {
        const labels = (input: string) => {
            const expr = parser.parse(input) as BitwiseOperation;
            expr.evaluate();
            return Array.from(expr.tree.allOperands.values()).map(n => n.operand!.label);
        };

        expect(labels('127b + 1b')).toEqual(['promoted', 'promoted']);
        expect(labels('~5b')).toEqual(['promoted']);
        expect(labels('-(5ub)')).toEqual(['promoted']);
        expect(labels('1b << 8b')).toEqual(['promoted', '']);   // the count keeps its type
        expect(labels('127b + 1')).toEqual(['converted', '']);
        expect(labels('1 + 2')).toEqual(['', '']);
    });

    it('keeps a promoted operand an int when one of its bits is flipped', () => {
        const expr = parser.parse('1ub | 65ub') as BitwiseOperation;
        expect(expr.evaluate().value.num()).toBe(65);

        // Bit 0 of the 32 bits on display is the sign bit of the promoted operand
        const operand = Array.from(expr.tree.allOperands.values())[0].operand!;
        expect(operand.value.maxBitSize).toBe(32);
        expr.tree.updateOperand(operand.id, calc.flipBit(operand.value, 0));

        const result = expr.evaluate().value;
        expect(result.num()).toBe(-2147483583);
        expect(result.maxBitSize).toBe(32);
        expect(result.signed).toBe(true);
    });

    it('promotes an operand that was changed before the expression was evaluated', () => {
        const expr = parser.parse('1ub | 65ub') as BitwiseOperation;
        const operand = Array.from(expr.tree.allOperands.values())[0].operand!;

        // The most significant bit of the byte that the user typed: 1ub -> 129ub
        expr.tree.updateOperand(operand.id, calc.flipBit(operand.value, 0));

        const result = expr.evaluate().value;
        expect(result.num()).toBe(193);
        expect(result.maxBitSize).toBe(32);
        expect(result.signed).toBe(true);
    });
});
