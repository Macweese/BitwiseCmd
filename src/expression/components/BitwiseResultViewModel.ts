import { Operand, ListOfNumbers, BitwiseOperation, Operator } from '../expression';
import { ExpressionElement, Expression } from '../expression-interfaces';
import { ExpressionNode } from '../ExpressionTree';
import calc from '../../core/calc';
import formatter from '../../core/formatter';

type Config = {
    emphasizeBytes: boolean;
    allowFlipBits: boolean;
    annotateDataTypes: boolean;
}

type ExpressionRowModel = {
    operator: string;
    css: string;
    expressionElement: ExpressionElement;
    allowFlipBits: boolean;
    label: string;
    maxBitSize: number;
    isFinalResult: boolean;
}

export default class BitwiseResultViewModel {

    emphasizeBytes: boolean;
    items: ExpressionRowModel[];
    maxNumberOfBits: number;
    allowFlipBits: boolean;
    annotateDataTypes: boolean;

    constructor({ emphasizeBytes = false, allowFlipBits = false, annotateDataTypes = false} : Config) {
        this.emphasizeBytes = emphasizeBytes;
        this.annotateDataTypes = annotateDataTypes;
        this.items = [];
        this.maxNumberOfBits = 0;
        this.allowFlipBits = allowFlipBits === true;
    }

    static buildListOfNumbers(expr : ListOfNumbers, config : Config) {
        var model = new BitwiseResultViewModel(config);
        expr.children.forEach(op => model.addScalarRow(op));
        model.maxNumberOfBits = BitwiseResultViewModel.applyEmphasizeBytes(model.maxNumberOfBits, model.emphasizeBytes);
        return model;
    }

    // Post-order traversal of the expression tree with deferred emission of left leaves
    static buildBitwiseOperation(expr: BitwiseOperation, config: Config) {
        const m = new BitwiseResultViewModel(config);

        // Recursively walk the tree and emit display rows in the correct
        // presentation order.  Returns the Operand representing this subtree's
        // value — either the leaf itself or the evaluated result of an expression.
        //
        // A leaf that is the left child of a binary op whose right
        // child is a sub-expression must NOT be emitted as an early scalar row.
        // Instead, it is "cached" and shown on the operator row AFTER the
        // right sub-expression has been fully resolved.  This way operands only
        // appear in the display at the point they are actually consumed in a
        // calculation, and never speculatively before a nested sub-expression.
        //
        // The four cases for a binary operation node:
        //   LEFT=leaf,     RIGHT=leaf      -> scalar(left),    op-row(right),  = result
        //   LEFT=leaf,     RIGHT=sub-expr  -> resolve(right),  op-row(LEFT),   = result       ← deferred
        //   LEFT=sub-expr, RIGHT=leaf      -> resolve(left),   op-row(right),  = result
        //   LEFT=sub-expr, RIGHT=sub-expr  -> resolve(left),   resolve(right), op-row(right), = result
        function emitNode(node: ExpressionNode): Operand {
            if (node.type === 'operand') {
                // Leaf: emit a scalar row and return the operand.
                m.addScalarRow(node.operand!);
                return node.operand!;
            }

            if (node.type === 'unary') {
                // Unary (~ or -):
                //   1. Recurse into the child so its rows appear first.
                //   2. Emit the operator row referencing the child's value.
                //   3. Emit the '=' result row.
                const childValue = emitNode(node.leftChild!);
                const result = node.evaluate();
                m.addOperatorRow(new Operator(childValue, node.operator!));
                m.addExpressionResultRow(result);
                return result;
            }

            // Binary operation.
            const operator = node.operator!;
            const isShift = operator === '<<' || operator === '>>' || operator === '>>>';
            const leftIsLeaf  = node.leftChild!.type === 'operand';
            const rightIsLeaf = node.rightChild!.type === 'operand';

            // Determine what value to show on the operator row,
            // and emit sub-expression rows in the right order.
            let operatorRowValue: Operand;

            if (leftIsLeaf && !rightIsLeaf) {
                // LEFT is a plain leaf, RIGHT is a sub-expression.
                // Resolve the right sub-expression first (its rows appear now),
                // then show the left leaf on the operator row.  The left leaf
                // is NOT emitted as a standalone scalar row — it would otherwise be
                // orphaned above the sub-expression which it at this point is unrelated to.
                emitNode(node.rightChild!);   // resolve right sub-expression
                operatorRowValue = node.leftChild!.operand!;  // deferred left leaf
            } else {
                // All other cases: resolve left first
                // (if it's a sub-expression its rows appear; if it's a leaf it gets its scalar row).
                const leftResult = emitNode(node.leftChild!);

                if (rightIsLeaf) {
                    // Right is a plain leaf: use it directly on the operator row.
                    operatorRowValue = node.rightChild!.operand!;
                } else {
                    // Both sides are sub-expressions.  Resolve the right one
                    // (its rows appear, ending with "= right-result").  The
                    // operator row must show the LEFT result, not the right:
                    // the right result is already visible on the '=' row
                    // immediately above, so repeating it would be redundant.
                    // Showing the left result is what gives the reader the
                    // other operand they need to follow the calculation in a cohesive manner.
                    emitNode(node.rightChild!);
                    operatorRowValue = leftResult;
                }
            }

            const result = node.evaluate();

            if (isShift) {
                m.addShiftExpressionResultRow(
                    new Operator(operatorRowValue, operator),
                    result
                );
            } else {
                m.addOperatorRow(new Operator(operatorRowValue, operator));
                m.addExpressionResultRow(result);
            }

            return result;
        }

        emitNode(expr.tree.root);

        // The last row emitted for an operation is the value of the whole expression
        if (expr.tree.root.type !== 'operand')
            m.items[m.items.length - 1].isFinalResult = true;

        m.maxNumberOfBits = BitwiseResultViewModel.applyEmphasizeBytes(
            m.maxNumberOfBits,
            m.emphasizeBytes
        );
        return m;
    }

    addScalarRow(expr: Operand) {
        const bits = this.calcMaxNumberOfBits(expr);
        this.maxNumberOfBits = Math.max(bits, this.maxNumberOfBits);
        this.items.push({
            operator:'',
            css: '',
            expressionElement: expr,
            allowFlipBits: this.allowFlipBits,
            label: '',
            maxBitSize: expr.value.maxBitSize,
            isFinalResult: false,
        });
    };

    addOperatorRow(expr: Operator) {

        const resultNumber = expr.getUnderlyingOperand();
        const bits = this.calcMaxNumberOfBits(resultNumber);

        this.maxNumberOfBits = Math.max(bits, this.maxNumberOfBits);

        this.items.push({
            operator: expr.operator,
            css: '',
            label: this.getLabel(resultNumber),
            expressionElement: expr.operand,
            allowFlipBits: this.allowFlipBits,
            maxBitSize: resultNumber.value.maxBitSize,
            isFinalResult: false,
        });
    };

    addShiftExpressionResultRow(expr : Operator, resultExpr : Operand) {
        const bits = this.calcMaxNumberOfBits(resultExpr);
        this.maxNumberOfBits = Math.max(bits, this.maxNumberOfBits);
        const child = expr.operand.getUnderlyingOperand();
        this.items.push({
            operator: expr.operator + formatter.numberToString(child.value, child.base),
            css: 'expression-result',
            expressionElement: resultExpr,
            allowFlipBits: false,
            label: '',
            maxBitSize: resultExpr.value.maxBitSize,
            isFinalResult: false,
        });
    };

    addExpressionResultRow(expr : Operand) {

        const bits = this.calcMaxNumberOfBits(expr);
        this.maxNumberOfBits = Math.max(bits, this.maxNumberOfBits);

        this.items.push({
            operator:'=',
            css: 'expression-result',
            expressionElement: expr,
            allowFlipBits: false,
            label: '',
            maxBitSize: expr.value.maxBitSize,
            isFinalResult: false,
        });
    };

    calcMaxNumberOfBits (op: Operand) {
        return calc.numberOfBitsDisplayed(op.value);
    }

    getLabel (op: Operand) : string {

        return formatter.numberToString(op.value, op.base === 'bin' ? 'dec' : op.base)
    }

    static applyEmphasizeBytes (bits : number, emphasizeBytes : boolean) : number {

        if(emphasizeBytes && bits % 8 !== 0) {
            if(bits < 8) {
                return 8;
            }

            var n = bits - (bits % 8);
            return n + 8;
        }

        return bits;
    };

    static createModel(expr : Expression, emphasizeBytes: boolean, annotateDataTypes: boolean) : BitwiseResultViewModel {

        if(expr instanceof ListOfNumbers) {
            return BitwiseResultViewModel.buildListOfNumbers(expr, {
                emphasizeBytes: emphasizeBytes,
                allowFlipBits: true,
                annotateDataTypes: annotateDataTypes
            });
        }

        if(expr instanceof BitwiseOperation) {
            return BitwiseResultViewModel.buildBitwiseOperation(expr, {
                emphasizeBytes: emphasizeBytes,
                allowFlipBits: true,
                annotateDataTypes: annotateDataTypes
            });
        }

        throw new Error("Cannot build BitwiseExpressionViewModel out of expression " + expr);
    }
}