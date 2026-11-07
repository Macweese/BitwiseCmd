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

    // Walks the expression tree and emits the rows in the order a reader can follow:
    // the operands of an operation right above its result, left operand first.
    static buildBitwiseOperation(expr: BitwiseOperation, config: Config) {
        const m = new BitwiseResultViewModel(config);

        // Emits the rows of a subtree and returns its value: the leaf itself or the
        // evaluated result of the operation. For a binary operation the rows are
        //
        //   LEFT=leaf,     RIGHT=leaf      ->                  scalar(left),   op-row(right),        = result
        //   LEFT=sub-expr, RIGHT=leaf      ->                  resolve(left),  op-row(right),        = result
        //   LEFT=leaf,     RIGHT=sub-expr  -> resolve(right),  scalar(left),   op-row(right result), = result
        //   LEFT=sub-expr, RIGHT=sub-expr  -> resolve(right),  resolve(left),  op-row(right result), = result
        //
        // so that the two rows above a "=" row are always "left operand" then "operator right
        // operand", which matters for the operators that are not commutative. A right
        // sub-expression is resolved first so that its rows don't separate the left operand
        // from the operator row that uses it. A repeated (computed) value cannot have its bits
        // flipped: only the leaves are the user's input.
        function emitNode(node: ExpressionNode): Operand {
            if (node.type === 'operand') {
                m.addScalarRow(node.operand!);
                return node.operand!;
            }

            if (node.type === 'unary') {
                const childValue = emitNode(node.leftChild!);
                const result = node.evaluate();
                m.addOperatorRow(new Operator(childValue, node.operator!), node.leftChild!.type === 'operand');
                m.addExpressionResultRow(result);
                return result;
            }

            const operator = node.operator!;
            const rightIsLeaf = node.rightChild!.type === 'operand';

            const rightValue = rightIsLeaf ? node.rightChild!.operand! : emitNode(node.rightChild!);
            emitNode(node.leftChild!);
            const result = node.evaluate();

            if (operator === '<<' || operator === '>>' || operator === '>>>')
                m.addShiftExpressionResultRow(new Operator(rightValue, operator), result);
            else {
                m.addOperatorRow(new Operator(rightValue, operator), rightIsLeaf);
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

    addOperatorRow(expr: Operator, allowFlipBits: boolean = true) {

        const resultNumber = expr.getUnderlyingOperand();
        const bits = this.calcMaxNumberOfBits(resultNumber);

        this.maxNumberOfBits = Math.max(bits, this.maxNumberOfBits);

        this.items.push({
            operator: expr.operator,
            css: '',
            label: this.getLabel(resultNumber),
            expressionElement: expr.operand,
            allowFlipBits: this.allowFlipBits && allowFlipBits,
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