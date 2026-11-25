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

const cases: Array<[string, number|string]> = [
    ['0xd5120000u | 0x41250000u', 0xd5370000],
    ['0x80000000u | 1u', 2147483649],
    ['0xd5120000u & 0xf1250000u', 0xd1000000],
    ['0xff000000u ^ 0x00ff0000u', 0xffff0000],
    ['~0u', 4294967295],
    ['~1u', 4294967294],
    ['1u << 31', 2147483648],
    ['0xffffffffu >> 1', 2147483647],
    ['0xffffffffu >>> 1', 2147483647],
    ['0x80000000u >> 1', 0x40000000],
    ['0x80000000u + 0x80000000u', 0],
    ['1u - 2u', 4294967295],
    ['3000000000u * 2u', 1705032704],
    ['0xffffffffu / 2u', 2147483647],
    ['0xffffffffu % 16u', 15],
    ['0x80000000u | 0x40000000u | 2u', 3221225474],
    ['~0ul', '18446744073709551615'],
    ['0x8000000000000000ul | 1ul', '9223372036854775809'],
    ['1ul - 2ul', '18446744073709551615'],
    ['0xfffffffffffffffful >> 1', '9223372036854775807'],
    ['0xfffffffffffffffful / 2ul', '9223372036854775807'],
];

it.each(cases)('%s', (input, expected) => {
    const v = evalLast(input);
    expect(v.value.toString()).toBe(String(expected));
    expect(v.signed).toBe(false);
});

// The promotion changes unsigned operands that are narrower than int to a 32-bit signed
// int. There, the bit in their sign position is a usual bit. The result is signed but not negative.
const narrowCases: Array<[string, number]> = [
    ['0xd512us | 0x4125us', 0xd537],
    ['129ub | 65ub', 193],
    ['128ub | 1ub', 129],
    ['0xd512us & 0xf125us', 0xd100],
    ['0xff00us ^ 0x00ffus', 0xffff],
    ['200ub ^ 100ub', 172],
    ['200ub & 250ub', 200],
    ['1ub << 7', 128],
    ['255ub >> 1', 127],
    ['255ub >>> 1', 127],
    ['0x8000us >> 1', 0x4000],
    ['255ub / 2ub', 127],
    ['255ub % 16ub', 15],
    ['129ub | 65ub | 2ub', 195],
];

it.each(narrowCases)('%s', (input, expected) => {
    const v = evalLast(input);
    expect(v.value.toString()).toBe(String(expected));
    expect(v.maxBitSize).toBe(32);
    expect(v.signed).toBe(true);
});
