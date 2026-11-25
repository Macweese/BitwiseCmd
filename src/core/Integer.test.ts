import { Integer } from "./Integer"
import { INT32_MAX_VALUE, UINT32_MAX_VALUE } from "./const";

it('toString for unsigned', () => {
    const s = Integer.unsigned(4294967295).toString(2)
    expect(s).toBe("11111111111111111111111111111111");
});

it('detects size correctly for signed and unsiged version', () => {
    expect(Integer.unsigned(UINT32_MAX_VALUE).maxBitSize).toBe(32);
    expect(Integer.signed(UINT32_MAX_VALUE).maxBitSize).toBe(64);
})

it('converts signed to unsigned and vice versa', () => {
    const n1 = new Integer(-1, 8);
    const n2 = n1.toUnsigned();
    const n3 = n2.toSigned();

    expect(n2.signed).toBe(false);
    expect(n2.num()).toBe(255);

    expect(n3.signed).toBe(true);
    expect(n3.num()).toBe(-1);

    expect(new Integer(1, 32, false).resize(64).toSigned().maxBitSize).toBe(64);
});

it('convers to different type', () => {
    const src = new Integer(-1);
    const dest = new Integer(1, 64, false);

    const n = src.convertTo(dest);
    expect(n.num()).toBe(UINT32_MAX_VALUE);
});

it('doesnt modify 64-bit number when converting from usinged to signed', () => {
    
    expect(Integer.unsigned(4294967295).toSigned().num()).toBe(-1);
    expect(Integer.unsigned(2147483647).toSigned().num()).toBe(2147483647);    
});


it('converts to largest size', () => {
    const n8 = new Integer(-1, 8);
    const n16 = n8.resize(16);
    const n32 = n16.resize(32);

    expect(n8.num()).toBe(-1);
    expect(n16.num()).toBe(-1);
    expect(n32.num()).toBe(-1);
});

it('abs doesnt change type size', () => {
    const result = Integer.byte(-127).abs();
    expect(result.num()).toBe(127);
    expect(result.maxBitSize).toBe(8);
})
describe('conversion between signed and unsigned', () => {
    // The pairs of a signed value and the unsigned value with the same bits
    function pairs(size: number, unsignedValues: bigint[]) {
        const range = BigInt(1) << BigInt(size);
        return unsignedValues.map(u => ({ u, s: u >= range / BigInt(2) ? u - range : u }));
    }

    function wrongConversions(size: number, unsignedValues: bigint[]) {
        return pairs(size, unsignedValues).filter(({ u, s }) =>
            Integer.unsigned(u, size).toSigned().value !== s
            || Integer.signed(s, size).toUnsigned().value !== u
            || Integer.signed(s, size).convertTo(Integer.unsigned(0, size)).value !== u);
    }

    it.each([8, 16])('keeps the bits of all %i-bit values', (size) => {
        const all = Array.from({ length: 1 << size }, (_, i) => BigInt(i));
        expect(wrongConversions(size, all)).toEqual([]);
    });

    it.each([32, 64])('keeps the bits of the limits of %i-bit values', (size) => {
        const range = BigInt(1) << BigInt(size);
        const half = range / BigInt(2);
        const one = BigInt(1);
        expect(wrongConversions(size, [BigInt(0), one, half - one, half, half + one, range - one])).toEqual([]);
    });

    it('keeps the type', () => {
        const n = Integer.signed(-5, 16).toUnsigned();
        expect([n.maxBitSize, n.signed]).toEqual([16, false]);

        const m = Integer.unsigned(5, 16).toSigned();
        expect([m.maxBitSize, m.signed]).toEqual([16, true]);
    });

    it('gives an error for a value that is too large for its type', () => {
        expect(() => new Integer(-256, 8, true).toUnsigned()).toThrow("bigger than the given data type (8 bits)");
        expect(() => new Integer(256, 8, false).toSigned()).toThrow("bigger than the given data type (8 bits)");
    });
});
