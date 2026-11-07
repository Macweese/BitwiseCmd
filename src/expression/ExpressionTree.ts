import Operand from './Operand';
import Operator from './Operator';
import calc from '../core/calc';
import { Integer } from '../core/Integer';

export type ExpressionNodeType = 'operand' | 'operation' | 'unary';

// A node of a parsed expression. Leaves hold the operands the user typed; inner
// nodes hold an operator. Nodes are evaluated lazily and cache their result until
// an operand below them changes (for example when the user flips one of its bits).
export class ExpressionNode {
    readonly type: ExpressionNodeType;
    readonly operand: Operand | null;
    readonly operator: string | null;
    readonly leftChild: ExpressionNode | null;
    readonly rightChild: ExpressionNode | null;
    private cachedResult: Operand | null = null;

    private constructor(type: ExpressionNodeType, operand: Operand | null, operator: string | null, leftChild: ExpressionNode | null, rightChild: ExpressionNode | null) {
        this.type = type;
        this.operand = operand;
        this.operator = operator;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
    }

    static leaf(operand: Operand): ExpressionNode {
        return new ExpressionNode('operand', operand, null, null, null);
    }

    static unary(operator: string, child: ExpressionNode): ExpressionNode {
        return new ExpressionNode('unary', null, operator, child, null);
    }

    static binary(operator: string, left: ExpressionNode, right: ExpressionNode): ExpressionNode {
        return new ExpressionNode('operation', null, operator, left, right);
    }

    evaluate(): Operand {
        if (this.cachedResult === null)
            this.cachedResult = this.compute();

        return this.cachedResult;
    }

    private compute(): Operand {
        switch (this.type) {
            case 'operand':
                return this.operand!;

            case 'unary': {
                const child = this.leftChild!.evaluate();
                const value = this.operator === '~' ? calc.not(child.value) : calc.negate(child.value);
                return new Operand(value, child.base);
            }

            default:
                return new Operator(this.rightChild!.evaluate(), this.operator!).evaluate(this.leftChild!.evaluate());
        }
    }

    // Replaces the value of the leaf holding the given operand and forgets the
    // cached results on the path from it to this node. Returns whether it was found.
    updateOperandValue(operandId: number, newValue: Integer): boolean {
        if (this.type === 'operand') {
            if (this.operand!.id !== operandId) return false;

            this.operand!.setValue(newValue);
            this.cachedResult = null;
            return true;
        }

        const found = (this.leftChild !== null && this.leftChild.updateOperandValue(operandId, newValue))
            || (this.rightChild !== null && this.rightChild.updateOperandValue(operandId, newValue));

        if (found)
            this.cachedResult = null;

        return found;
    }
}

export class ExpressionTree {
    readonly root: ExpressionNode;
    readonly allOperands: Map<number, ExpressionNode>; // leaf nodes by operand id

    constructor(root: ExpressionNode) {
        this.root = root;
        this.allOperands = new Map();
        this.collectOperands(root);
    }

    private collectOperands(node: ExpressionNode) {
        if (node.type === 'operand') {
            this.allOperands.set(node.operand!.id, node);
            return;
        }

        if (node.leftChild) this.collectOperands(node.leftChild);
        if (node.rightChild) this.collectOperands(node.rightChild);
    }

    updateOperand(operandId: number, newValue: Integer) {
        if (this.root.updateOperandValue(operandId, newValue))
            this.root.evaluate();
    }
}
