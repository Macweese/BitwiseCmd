import { Operand } from './expression';
import { numberParser } from './numberParser';
import calc from '../core/calc';
import { Integer } from '../core/Integer';

export interface IntermediateStep {
    operator: string;
    leftOperand: Operand;
    rightOperand: Operand;
    result: Operand;
    expression: string; // The sub-expression that was evaluated
}

export class PrattParser {
    private input: string;
    private pos: number;
    private steps: IntermediateStep[];
    private originalInput: string;
    private lastWasOperand: boolean; // Track whether we just parsed an operand

    constructor(input: string) {
        this.originalInput = input;
        this.input = input.replace(/\s+/g, '');
        this.pos = 0;
        this.steps = [];
        this.lastWasOperand = false;
    }

    parse(): { finalResult: Operand; steps: IntermediateStep[] } {
        const result = this.parseExpression(0);

        if (this.pos < this.input.length) {
            throw new Error(`Unexpected character at position ${this.pos}: '${this.input[this.pos]}'`);
        }

        return { finalResult: result, steps: this.steps };
    }

    private parseExpression(minPrecedence: number): Operand {
        let left = this.parsePrimary();
        this.lastWasOperand = true; // We just parsed an operand

        while (true) {
            const op = this.peekOperator();
            if (!op || this.getPrecedence(op) < minPrecedence) {
                break;
            }

            this.consumeOperator();
            this.lastWasOperand = false; // We just consumed an operator

            const precedence = this.getPrecedence(op);
            const right = this.parseExpression(precedence + (this.isLeftAssociative(op) ? 1 : 0));

            // Create intermediate step
            const result = this.applyOperator(left, op, right);

            this.steps.push({
                operator: op,
                leftOperand: left,
                rightOperand: right,
                result: result,
                expression: `${this.formatOperand(left)} ${op} ${this.formatOperand(right)}`
            });
            console.log(`Pushed step: ${op}  ${this.formatOperand(left)} ${op} ${this.formatOperand(right)}  →  ${this.formatOperand(result)}`);

            left = result;
            this.lastWasOperand = true; // Result is now our left operand
        }

        return left;
    }

    private parsePrimary(): Operand {
        this.skipWhitespace();

        // Handle unary minus (negation)
        if (this.peek() === '-') {
            this.pos++;
            this.lastWasOperand = false;
            const operand = this.parsePrimary();

            // Negate the value by multiplying by -1
            const negatedValue = -operand.value.value;
            const result = new Operand(
                new Integer(negatedValue, operand.value.maxBitSize, operand.value.signed),
                operand.base
            );

            // Add unary minus as a step
            this.steps.push({
                operator: '-',
                leftOperand: operand,
                rightOperand: operand, // For unary minus, left and right are the same
                result: result,
                expression: `-${this.formatOperand(operand)}`
            });

            return result;
        }

        // Handle unary NOT operator
        if (this.peek() === '~') {
            this.pos++;
            this.lastWasOperand = false;
            const operand = this.parsePrimary();
            const result = new Operand(calc.not(operand.value), operand.base);

            // Add NOT as a step (special case - unary operator)
            this.steps.push({
                operator: '~',
                leftOperand: operand,
                rightOperand: operand, // For NOT, left and right are the same
                result: result,
                expression: `~${this.formatOperand(operand)}`
            });

            return result;
        }

        // Handle parentheses
        if (this.peek() === '(') {
            this.pos++;
            this.lastWasOperand = false;
            const result = this.parseExpression(0);
            this.skipWhitespace();

            if (this.peek() !== ')') {
                throw new Error(`Expected closing parenthesis at position ${this.pos}`);
            }
            this.pos++;
            return result;
        }

        // Parse number
        return this.parseNumber();
    }

    private parseNumber(): Operand {
        this.skipWhitespace();

        // Match number pattern (no longer matches leading minus since that's handled as unary operator)
        const remainingInput = this.input.substring(this.pos);
        const match = remainingInput.match(/^(?:0x[0-9a-f]+|0b[0-1]+|\d+)(?:ul|us|ub|l|s|b|u)?/i);

        if (!match) {
            throw new Error(`Expected number at position ${this.pos}`);
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
}