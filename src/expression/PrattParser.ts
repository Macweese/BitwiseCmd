import Operand from './Operand';
import { numberParser } from './numberParser';
import { ExpressionNode } from './ExpressionTree';

// Binding power of the binary operators, higher binds tighter. Same order as C,
// C++ and Java; every operator is left-associative.
// https://en.cppreference.com/w/c/language/operator_precedence
// https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html
const PRECEDENCE: { [operator: string]: number } = {
    '|': 1,
    '^': 2,
    '&': 3,
    '<<': 4, '>>': 4, '>>>': 4,
    '+': 5, '-': 5,
    '*': 6, '/': 6, '%': 6,
};

// Longest operators first so that '>>>' is not read as '>>' followed by '>'
const OPERATORS = ['>>>', '>>', '<<', '|', '^', '&', '+', '-', '*', '/', '%'];

const LITERAL = /^(?:0x[0-9a-f]+|0b[01]+|[0-9]+)(?:ul|us|ub|u|l|s|b)?/i;

// Builds the expression tree of an infix expression (precedence climbing).
// Evaluation is left to the tree, so that it can be redone when an operand changes.
export class PrattParser {
    private readonly input: string;
    private pos: number = 0;

    constructor(input: string) {
        this.input = input;
    }

    parse(): ExpressionNode {
        const root = this.parseExpression(0);

        this.skipWhitespace();
        if (this.pos < this.input.length)
            throw new Error(this.formatParseError("Unexpected character", this.pos));

        return root;
    }

    private parseExpression(minPrecedence: number): ExpressionNode {
        let left = this.parsePrimary();

        for (;;) {
            const operator = this.peekOperator();
            if (operator === null || PRECEDENCE[operator] < minPrecedence)
                break;

            this.pos += operator.length;
            const right = this.parseExpression(PRECEDENCE[operator] + 1);
            left = ExpressionNode.binary(operator, left, right);
        }

        return left;
    }

    private parsePrimary(): ExpressionNode {
        this.skipWhitespace();
        const char = this.input[this.pos];

        if (char === '-') {
            // A minus in front of a literal is part of the literal, as in Java and C#.
            // This is what makes -2147483648 a 32-bit INT_MIN and -1u the unsigned 0xFFFFFFFF.
            const literal = this.matchLiteral(this.pos + 1);
            if (literal !== null) {
                this.pos += 1 + literal.length;
                return this.leaf('-' + literal.trim());
            }

            this.pos++;
            return ExpressionNode.unary('-', this.parsePrimary());
        }

        if (char === '~') {
            this.pos++;
            return ExpressionNode.unary('~', this.parsePrimary());
        }

        if (char === '(') {
            this.pos++;
            const inner = this.parseExpression(0);

            this.skipWhitespace();
            if (this.input[this.pos] !== ')')
                throw new Error(this.formatParseError("Expected closing parenthesis", this.pos));

            this.pos++;
            return inner;
        }

        const literal = this.matchLiteral(this.pos);
        if (literal === null)
            throw new Error(this.formatParseError("Expected number", this.pos));

        this.pos += literal.length;
        return this.leaf(literal);
    }

    private leaf(literal: string): ExpressionNode {
        const number = numberParser.parse(literal);
        return ExpressionNode.leaf(new Operand(number.value, number.base));
    }

    // The literal at the given position, with the whitespace in front of it, or null
    private matchLiteral(from: number): string | null {
        const match = this.input.substring(from).match(LITERAL);
        if (match !== null)
            return match[0];

        const leadingWhitespace = this.input.substring(from).match(/^\s+/);
        if (leadingWhitespace !== null) {
            const literal = this.matchLiteral(from + leadingWhitespace[0].length);
            return literal === null ? null : leadingWhitespace[0] + literal;
        }

        return null;
    }

    private peekOperator(): string | null {
        this.skipWhitespace();
        const remaining = this.input.substring(this.pos);

        for (const operator of OPERATORS)
            if (remaining.startsWith(operator))
                return operator;

        return null;
    }

    private skipWhitespace(): void {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos]))
            this.pos++;
    }

    // "<message> at position <n>." followed by the input and a caret under the offending character
    private formatParseError(message: string, pos: number): string {
        const padding = 6;

        return [
            `${message} at position ${pos + 1}.`,
            "│" + " ".repeat(padding) + this.input,
            "│" + " ".repeat(padding + pos) + "˄",
            "└" + "─".repeat(padding + pos) + "┘",
        ].join("\n");
    }
}
