import { Operand } from './expression';
import { numberParser } from './numberParser';
import calc from '../core/calc';
import { Integer } from '../core/Integer';
import { ExpressionNode } from './ExpressionTree';

export interface IntermediateStep {
    operator: string;
    leftOperand: Operand;
    rightOperand: Operand;
    result: Operand;
    expression: string;
}

export class PrattParser {
    private input: string;
    private pos: number;
    private steps: IntermediateStep[];
    private originalInput: string;
    private lastWasOperand: boolean;
    private nodeIdCounter: number;

    constructor(input: string) {
        this.originalInput = input;
        this.input = input.replace(/\s+/g, '');
        this.pos = 0;
        this.steps = [];
        this.lastWasOperand = false;
        this.nodeIdCounter = 10000;
    }

    parse(): { finalResult: Operand; steps: IntermediateStep[]; rootNode: ExpressionNode } {
        const { result, node } = this.parseExpression(0);

        if (this.pos < this.input.length) {
            throw new Error(this.formatParseError("Unexpected character", this.pos, this.input));
        }

        return { finalResult: result, steps: this.steps, rootNode: node };
    }

    private parseExpression(minPrecedence: number): { result: Operand; node: ExpressionNode } {
        let { result: left, node: leftNode } = this.parsePrimary();
        this.lastWasOperand = true;

        while (true) {
            const op = this.peekOperator();
            if (!op || this.getPrecedence(op) < minPrecedence) {
                break;
            }

            this.consumeOperator();
            this.lastWasOperand = false;

            const precedence = this.getPrecedence(op);
            const { result: right, node: rightNode } = this.parseExpression(
                precedence + (this.isLeftAssociative(op) ? 1 : 0)
            );

            // Apply operator and create tree node
            const result = this.applyOperator(left, op, right);

            const opNode = new ExpressionNode(
                result.id,
                'operation',
                result,
                op,
                leftNode,
                rightNode
            );

            this.steps.push({
                operator: op,
                leftOperand: left,
                rightOperand: right,
                result: result,
                expression: `${this.formatOperand(left)} ${op} ${this.formatOperand(right)}`
            });

            console.log(`Pushed step: ${op}  ${this.formatOperand(left)} ${op} ${this.formatOperand(right)}  →  ${this.formatOperand(result)}`);

            left = result;
            leftNode = opNode;
            this.lastWasOperand = true;
        }

        return { result: left, node: leftNode };
    }

    private parsePrimary(): { result: Operand; node: ExpressionNode } {
        this.skipWhitespace();

        // Handle unary minus
        if (this.peek() === '-') {
            this.pos++;
            this.lastWasOperand = false;
            const { result: operand, node: operandNode } = this.parsePrimary();

            const negatedValue = -operand.value.value;
            const result = new Operand(
                new Integer(negatedValue, operand.value.maxBitSize, operand.value.signed),
                operand.base
            );

            const unaryNode = new ExpressionNode(
                result.id,
                'unary',
                result,
                '-',
                operandNode,
                null
            );

            this.steps.push({
                operator: '-',
                leftOperand: operand,
                rightOperand: operand,
                result: result,
                expression: `-${this.formatOperand(operand)}`
            });

            return { result, node: unaryNode };
        }

        // Handle unary NOT
        if (this.peek() === '~') {
            this.pos++;
            this.lastWasOperand = false;
            const { result: operand, node: operandNode } = this.parsePrimary();
            const result = new Operand(calc.not(operand.value), operand.base);

            const unaryNode = new ExpressionNode(
                result.id,
                'unary',
                result,
                '~',
                operandNode,
                null
            );

            this.steps.push({
                operator: '~',
                leftOperand: operand,
                rightOperand: operand,
                result: result,
                expression: `~${this.formatOperand(operand)}`
            });

            return { result, node: unaryNode };
        }

        // Handle parentheses
        if (this.peek() === '(') {
            this.pos++;
            this.lastWasOperand = false;
            const { result, node } = this.parseExpression(0);
            this.skipWhitespace();

            if (this.peek() !== ')') {
                throw new Error(this.formatParseError("Expected closing parenthesis", this.pos, this.input));
            }
            this.pos++;
            return { result, node };
        }

        // Parse number - create leaf node
        const operand = this.parseNumber();
        const leafNode = new ExpressionNode(operand.id, 'operand', operand);

        return { result: operand, node: leafNode };
    }

    private parseNumber(): Operand {
        this.skipWhitespace();

        // Match number pattern (no longer matches leading minus since that's handled as unary operator)
        const remainingInput = this.input.substring(this.pos);
        const match = remainingInput.match(/^(?:0x[0-9a-f]+|0b[0-1]+|\d+)(?:ul|us|ub|l|s|b|u)?/i);

        if (!match) {
            throw new Error(this.formatParseError("Expected number", this.pos, this.input));
        }

        this.pos += match[0].length;
        const parsed = numberParser.parse(match[0]);
        return new Operand(parsed.value, parsed.base);
    }

    private peek(): string {
        return this.input[this.pos] || '';
    }

    private peekOperator(): string | null {
        this.skipWhitespace();
        const remaining = this.input.substring(this.pos);

        // Check for multi-character operators first
        if (remaining.startsWith('>>>')) return '>>>';
        if (remaining.startsWith('>>')) return '>>';
        if (remaining.startsWith('<<')) return '<<';

        // Single character operators
        const char = this.peek();

        // For '-', we need to distinguish between subtraction and negative number
        if (char === '-') {
            // If we just parsed an operand, this MUST be subtraction
            if (this.lastWasOperand) {
                return '-';
            }
            // Otherwise, it's part of a negative number (handled in parseNumber)
            return null;
        }

        if ('&|^+*/%'.includes(char)) {
            return char;
        }

        return null;
    }

    private consumeOperator(): void {
        this.skipWhitespace();
        const op = this.peekOperator();
        if (op) {
            this.pos += op.length;
        }
    }

    private skipWhitespace(): void {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
            this.pos++;
        }
    }

    // https://en.cppreference.com/w/c/language/operator_precedence.html
    // https://en.cppreference.com/w/cpp/language/operator_precedence.html
    // https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html
    private getPrecedence(op: string): number {
        const precedence: { [key: string]: number } = {
            '|': 1,
            '^': 2,
            '&': 3,
            '<<': 4,
            '>>': 4,
            '>>>': 4,
            '+': 5,
            '-': 5,
            '*': 6,
            '/': 6,
            '%': 6,
        };
        return precedence[op] || 0;
    }

    private isLeftAssociative(op: string): boolean {
        return true; // All operators are left-associative
    }

    private applyOperator(left: Operand, operator: string, right: Operand): Operand {
        // Handle shift operators specially
        const isShift = operator === '<<' || operator === '>>' || operator === '>>>';

        if (!isShift) {
            // Check for signed/unsigned mismatch
            if (left.value.maxBitSize === right.value.maxBitSize &&
                left.value.signed !== right.value.signed) {
                throw new Error(`Operator '${operator}' cannot be applied to signed and unsigned operands of the same ${right.value.maxBitSize}-bit size`);
            }

            // Equalize sizes
            this.equalizeSize(left, right);
        }

        const result = calc.operation(left.value, operator, right.value);
        return new Operand(result, left.base);
    }

    private equalizeSize(op1: Operand, op2: Operand): void {
        const n1 = op1.value;
        const n2 = op2.value;

        if (n1.maxBitSize === n2.maxBitSize) {
            if (n1.signed === n2.signed) return;

            // Example: int and unsigned int. Promote both to 64 bit
            op1.setValue(n1.resize(n1.maxBitSize * 2).toSigned()).setLabel("converted");
            op2.setValue(n2.resize(n2.maxBitSize * 2).toSigned()).setLabel("converted");
            return;
        }

        if (n1.maxBitSize > n2.maxBitSize) {
            op2.setValue(n2.convertTo(n1)).setLabel("converted");
        } else {
            op1.setValue(n1.convertTo(n2)).setLabel("converted");
        }
    }

    private formatOperand(op: Operand): string {
        return op.value.toString();
    }

    /**
     * Creates a pretty-printed parse error with source context and a caret pointing
     * at the problem position.
     *
     * @param message Short description ("Unexpected character", "Expected closing parenthesis ')'", etc.)
     * @param pos 0-based position in the cleaned input string
     * @param input The normalized input (spaces removed)
     * @returns Formatted multi-line error message ready to be thrown
     */
    private formatParseError(message: string, pos: number, input: string): string {
        const errorPosition = pos + 1; // 1-based indexing for readability

        const paddingSize = 6;
        const inputLine = "│" + " ".repeat(paddingSize) + `${input}`;
        const caretLine = "│" + " ".repeat(paddingSize + pos) + "˄";
        const traceLine = "└" + "─".repeat(paddingSize + pos) + "┘";

        return [
            `${message} at position ${errorPosition}.`,
            inputLine,
            caretLine,
            traceLine,
        ].join("\n");
    }
}