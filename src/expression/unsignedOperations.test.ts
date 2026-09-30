import { parser } from './expression';
import BitwiseOperation from './BitwiseOperation';

// Issue #3: operations on unsigned operands must return unsigned results
// (previously results with the sign-position bit set were interpreted as
// negative signed values, throwing "Value X cannot be negative if the type
// is unsigned"). Applies to all operators, not just OR.
function evalLast(input: string) {
    const expr = parser.parse(input) as BitwiseOperation;
    return expr.tree!.root.evaluate().value;
}

const cases: Array<[string, number|string, boolean]> = [
    ['0xd512us | 0x4125us', 0xd537, false],
    ['129ub | 65ub', 193, false],
    ['128ub | 1ub', 129, false],
    ['0xd512us & 0xf125us', 0xd100, false],
    ['0xff00us ^ 0x00ffus', 0xffff, false],
    ['200ub ^ 100ub', 172, false],
    ['200ub & 250ub', 200, false],
    ['~0ub', 255, false],
    ['~0us', 65535, false],
    ['~1u', 4294967294, false],
    ['1ub << 7', 128, false],
    ['255ub >> 1', 127, false],
    ['255ub >>> 1', 127, false],
    ['0x8000us >> 1', 0x4000, false],
    ['128ub + 128ub', 0, false],
    ['1us - 2us', 65535, false],
    ['200ub * 2ub', 144, false],
    ['255ub / 2ub', 127, false],
    ['255ub % 16ub', 15, false],
    ['129ub | 65ub | 2ub', 195, false],
    ['~0ul', '18446744073709551615', false],
];

it.each(cases)('%s', (input, expected, signed) => {
    const v = evalLast(input);
    expect(v.value.toString()).toBe(String(expected));
    expect(v.signed).toBe(signed);
});
