import Operand from "./Operand";
import Operator from './Operator';
import { Integer } from '../core/Integer';

it('can apply ~ operand', () => {
    var op = new Operand(10, 'dec');
    var expr = new Operator(op, "~");
    
    var result = expr.evaluate();
    expect(result.value.num()).toBe(-11);
    expect(result.base).toBe('dec');
});

it('can apply & operand', () => {
    var op1 = new Operand(3, 'dec');
    var op2 = new Operand(4, 'dec');
    var expr = new Operator(op1, "|");
    var result = expr.evaluate(op2);
    expect(result.value.num()).toBe(7);
    expect(result.base).toBe('dec');
});

it('promotes operands narrower than int', () => {
    const not = new Operator(new Operand(Integer.byte(5)), "~").evaluate();
    expect(not.value.num()).toBe(-6);
    expect(not.value.maxBitSize).toBe(32);

    const sum = new Operator(new Operand(Integer.byte(1)), "+").evaluate(new Operand(Integer.unsigned(255, 8)));
    expect(sum.value.num()).toBe(256);
    expect(sum.value.maxBitSize).toBe(32);
    expect(sum.value.signed).toBe(true);

    const shift = new Operator(new Operand(8), "<<").evaluate(new Operand(Integer.short(1)));
    expect(shift.value.num()).toBe(256);
    expect(shift.value.maxBitSize).toBe(32);
});
