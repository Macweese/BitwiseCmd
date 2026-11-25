import { parser } from '../expression';
import BitwiseResultViewModel from './BitwiseResultViewModel';

// Rows as "<operator><value>", e.g. ["1", "+2", "=3"]
function rows(input: string): string[] {
    const model = BitwiseResultViewModel.createModel(parser.parse(input)!, false, false);
    return model.items.map(i => i.operator + i.expressionElement.getUnderlyingOperand().value.toString());
}

describe('BitwiseResultViewModel', () => {
    it('lists the operands of an operation above its result', () => {
        expect(rows('1 + 2')).toEqual(['1', '+2', '=3']);
        expect(rows('8 >> 1')).toEqual(['8', '>>14']); // a shift is a single row showing the count and the result
        expect(rows('~5')).toEqual(['5', '~5', '=-6']);
    });

    it('resolves a sub-expression before the operation that uses it', () => {
        expect(rows('1 + 2 * 3')).toEqual(['2', '*3', '=6', '1', '+6', '=7']);
        expect(rows('2 * 3 + 1')).toEqual(['2', '*3', '=6', '+1', '=7']);
        expect(rows('~(1 | 2)')).toEqual(['1', '|2', '=3', '~3', '=-4']);
    });

    it('keeps the left operand above the operator row, so non-commutative operations read correctly', () => {
        expect(rows('5 - (1 + 1)')).toEqual(['1', '+1', '=2', '5', '-2', '=3']);
        expect(rows('(1 + 1) - (2 + 2)')).toEqual(['2', '+2', '=4', '1', '+1', '=2', '-4', '=-2']);
        expect(rows('(1 + 1) - 3')).toEqual(['1', '+1', '=2', '-3', '=-1']);
    });

    it('only lets the bits of the operands the user typed be flipped', () => {
        const model = BitwiseResultViewModel.createModel(parser.parse('5 - (1 + 1)')!, false, false);
        expect(model.items.map(i => i.allowFlipBits)).toEqual([true, true, false, true, false, false]);
    });

    it('sizes every row for the operand as the operation used it', () => {
        const sizes = (input: string) => {
            const model = BitwiseResultViewModel.createModel(parser.parse(input)!, false, false);
            return { rows: model.items.map(i => i.maxBitSize), bits: model.maxNumberOfBits };
        };

        // -1 has 8 bits as a byte. It has 32 bits as the int that the promotion or the conversion gives.
        expect(sizes('-1b + 1b')).toEqual({ rows: [32, 32, 32], bits: 32 });
        expect(sizes('-1b + 1')).toEqual({ rows: [32, 32, 32], bits: 32 });
        expect(sizes('~-1b')).toEqual({ rows: [32, 32, 32], bits: 32 });
        expect(sizes('-1b >> 1')).toEqual({ rows: [32, 32], bits: 32 });
        expect(sizes('-1b + 1l')).toEqual({ rows: [64, 64, 64], bits: 64 });
    });

    it('shows the operands of bytes and shorts as the ints they are promoted to', () => {
        expect(rows('127b + 1b')).toEqual(['127', '+1', '=128']);
        expect(rows('1b << 8')).toEqual(['1', '<<8256']);
        expect(rows('~0ub')).toEqual(['0', '~0', '=-1']);
    });

    it('puts a warning on the row it is about', () => {
        const kinds = (input: string) =>
            BitwiseResultViewModel.createModel(parser.parse(input)!, false, false).items.map(i => i.warnings.map(w => w.kind));

        expect(kinds('1 + 2')).toEqual([[], [], []]);
        expect(kinds('127b + 1b')).toEqual([[], [], ['promotion']]);
        expect(kinds('1b + 2')).toEqual([['conversion'], [], []]);
        expect(kinds('2 + 1b')).toEqual([[], ['conversion'], []]);
        expect(kinds('-(2147483648)')).toEqual([['literal'], [], []]);
        expect(kinds('-(-2147483648)')).toEqual([[], [], ['overflow']]);
        expect(kinds('1 << 33')).toEqual([[], ['shift']]);

        // The operator row of ~ shows the operand of the row above again. A shift count has no row.
        expect(kinds('~(2147483648)')).toEqual([['literal'], [], []]);
        expect(kinds('1 << 4294967296')).toEqual([[], ['literal', 'shift']]);

        // The next operation converts an intermediate result: rows 1, +2, =3, +3, =6
        expect(kinds('(1 + 2) + 3l')).toEqual([[], [], ['conversion'], [], []]);
    });

    it('marks the final result', () => {
        const model = BitwiseResultViewModel.createModel(parser.parse('1 + 2 * 3')!, false, false);
        expect(model.items.map(i => i.isFinalResult)).toEqual([false, false, false, false, false, true]);
    });
});
