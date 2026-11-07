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

    it('marks the final result', () => {
        const model = BitwiseResultViewModel.createModel(parser.parse('1 + 2 * 3')!, false, false);
        expect(model.items.map(i => i.isFinalResult)).toEqual([false, false, false, false, false, true]);
    });
});
