import { Operand, Operator } from './expression';
import { IntermediateStep } from './PrattParser';
import calc from '../core/calc';
import { Integer } from '../core/Integer';

export type ExpressionNodeType = 'operand' | 'operation' | 'unary';

export class ExpressionNode {
    id: number;
    type: ExpressionNodeType;
    operand: Operand;
    operator: string | null;
    leftChild: ExpressionNode | null;
    rightChild: ExpressionNode | null;
    cachedResult: Operand | null;

    constructor(
        id: number,
        type: ExpressionNodeType,
        operand: Operand,
        operator: string | null = null,
        leftChild: ExpressionNode | null = null,
        rightChild: ExpressionNode | null = null
    ) {
        this.id = id;
        this.type = type;
        this.operand = operand;
        this.operator = operator;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
        this.cachedResult = null;
    }

    // Evaluate this node and cache the result
    evaluate(): Operand {
        if (this.cachedResult) {
            return this.cachedResult;
        }

        let result: Operand;

        if (this.type === 'operand') {
            // Leaf node - just return the operand
            result = this.operand;
        } else if (this.type === 'unary') {
            // Unary operation (NOT or unary minus)
            const childResult = this.leftChild!.evaluate();

            if (this.operator === '~') {
                result = new Operand(calc.not(childResult.value), childResult.base);
            } else if (this.operator === '-') {
                const negatedValue = -childResult.value.value;
                result = new Operand(
                    new Integer(negatedValue, childResult.value.maxBitSize, childResult.value.signed),
                    childResult.base
                );
            } else {
                result = childResult;
            }
        } else {
            // Binary operation
            const leftResult = this.leftChild!.evaluate();
            const rightResult = this.rightChild!.evaluate();

            // Use the Operator class to handle type promotion and evaluation
            const op = new Operator(rightResult, this.operator!);
            result = op.evaluate(leftResult);
        }

        this.cachedResult = result;
        return result;
    }

    // Invalidate cache for this node and all dependent nodes
    invalidateCache() {
        this.cachedResult = null;
    }

    // Find the operand node by ID and update its value
    updateOperandValue(operandId: number, newValue: Integer): boolean {
        if (this.type === 'operand' && this.operand.id === operandId) {
            this.operand.setValue(newValue);
            this.cachedResult = null;
            return true;
        }

        let found = false;
        if (this.leftChild) {
            found = this.leftChild.updateOperandValue(operandId, newValue);
            if (found) {
                this.cachedResult = null;
            }
        }

        if (!found && this.rightChild) {
            found = this.rightChild.updateOperandValue(operandId, newValue);
            if (found) {
                this.cachedResult = null;
            }
        }

        return found;
    }

    // Get all nodes in evaluation order (for display)
    getNodesInOrder(): ExpressionNode[] {
        const nodes: ExpressionNode[] = [];
        this.collectNodesInOrder(nodes);
        return nodes;
    }

    private collectNodesInOrder(nodes: ExpressionNode[]) {
        if (this.type === 'operand') {
            nodes.push(this);
            return;
        }

        if (this.leftChild) {
            this.leftChild.collectNodesInOrder(nodes);
        }

        if (this.rightChild) {
            this.rightChild.collectNodesInOrder(nodes);
        }

        nodes.push(this);
    }
}

export class ExpressionTree {
    root: ExpressionNode;
    allOperands: Map<number, ExpressionNode>; // Map operand ID to node

    constructor(root: ExpressionNode) {
        this.root = root;
        this.allOperands = new Map();
        this.collectOperands(root);
    }

    private collectOperands(node: ExpressionNode) {
        if (node.type === 'operand') {
            this.allOperands.set(node.operand.id, node);
        }

        if (node.leftChild) {
            this.collectOperands(node.leftChild);
        }

        if (node.rightChild) {
            this.collectOperands(node.rightChild);
        }
    }

    // Update an operand's value and recalculate
    updateOperand(operandId: number, newValue: Integer) {
        const updated = this.root.updateOperandValue(operandId, newValue);
        if (updated) {
            // Re-evaluate from root (cache invalidation ensures only necessary nodes recalculate)
            this.root.evaluate();
        }
    }

    // Get evaluation steps for display
    getEvaluationSteps(): Array<{
        node: ExpressionNode;
        isLeaf: boolean;
        isResult: boolean;
        operator: string | null;
        leftOperand: Operand | null;
        rightOperand: Operand | null;
        result: Operand;
    }> {
        const steps: any[] = [];
        const nodes = this.root.getNodesInOrder();

        for (const node of nodes) {
            const result = node.evaluate();

            if (node.type === 'operand') {
                steps.push({
                    node,
                    isLeaf: true,
                    isResult: false,
                    operator: null,
                    leftOperand: null,
                    rightOperand: null,
                    result
                });
            } else if (node.type === 'unary') {
                const childResult = node.leftChild!.evaluate();
                steps.push({
                    node,
                    isLeaf: false,
                    isResult: true,
                    operator: node.operator,
                    leftOperand: childResult,
                    rightOperand: childResult,
                    result
                });
            } else {
                const leftResult = node.leftChild!.evaluate();
                const rightResult = node.rightChild!.evaluate();
                steps.push({
                    node,
                    isLeaf: false,
                    isResult: true,
                    operator: node.operator,
                    leftOperand: leftResult,
                    rightOperand: rightResult,
                    result
                });
            }
        }

        return steps;
    }

    // Build tree from Pratt parser steps
    static fromPrattSteps(steps: IntermediateStep[]): ExpressionTree {
        if (steps.length === 0) {
            throw new Error('Cannot build tree from empty steps.');
        }

        const nodeMap = new Map<number, ExpressionNode>();

        const getOrCreateLeafNode = (operand: Operand): ExpressionNode => {
            if (nodeMap.has(operand.id)) {
                return nodeMap.get(operand.id)!;
            }
            const node = new ExpressionNode(operand.id, 'operand', operand);
            nodeMap.set(operand.id, node);
            return node;
        };

        let previousResultNode: ExpressionNode | null = null;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            const leftChild: ExpressionNode = i === 0
                ? getOrCreateLeafNode(step.leftOperand)
                : previousResultNode!;

            if (step.leftOperand.id === step.rightOperand.id) {
                // Unary operator
                const node: ExpressionNode = new ExpressionNode(
                    step.result.id,  // ← Use result's ID, not a counter
                    'unary',
                    step.result,
                    step.operator,
                    leftChild,
                    null
                );
                nodeMap.set(step.result.id, node);
                previousResultNode = node;
            } else {
                // Binary operator
                let rightChild: ExpressionNode;

                if (nodeMap.has(step.rightOperand.id)) {
                    rightChild = nodeMap.get(step.rightOperand.id)!;
                } else {
                    rightChild = getOrCreateLeafNode(step.rightOperand);
                }

                const node: ExpressionNode = new ExpressionNode(
                    step.result.id,  // ← Use result's ID, not a counter
                    'operation',
                    step.result,
                    step.operator,
                    leftChild,
                    rightChild
                );
                nodeMap.set(step.result.id, node);
                previousResultNode = node;
            }
        }

        return new ExpressionTree(previousResultNode!);
    }
}