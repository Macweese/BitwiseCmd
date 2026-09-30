import { parser } from './expression';
import BitwiseOperation from './BitwiseOperation';
import calc from '../core/calc';

// Issue #3: flipping the sign-position bit of an unsigned operand caused a
// runtime error ("Value X cannot be negative if the type is unsigned")
// when the expression tree re-evaluated the operation.
it('re-evaluates unsigned operation without error after flipping the sign-position bit', () => {
    const expr = parser.parse('1ub | 65ub') as BitwiseOperation;
    const tree = expr.tree!;

    const firstOperandNode = Array.from(tree.allOperands.values())[0];
    const operand = firstOperandNode.operand;

    // Flip the most significant (sign-position) bit: 1ub -> 129ub
    const flipped = calc.flipBit(operand.value, 0);
    expect(flipped.num()).toBe(129);
    expect(flipped.signed).toBe(false);

    expect(() => tree.updateOperand(operand.id, flipped)).not.toThrow();

    const result = tree.root.evaluate();
    expect(result.value.num()).toBe(193);
    expect(result.value.signed).toBe(false);
    expect(result.value.maxBitSize).toBe(8);
});
