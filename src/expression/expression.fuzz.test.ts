import { parser, BitwiseOperation, ListOfNumbers } from "./expression";

// Differential test of the parser and the calculation engine against a small
// independent BigInt evaluator with C semantics: fixed-width two's complement
// wrap-around, truncating division, remainder with the sign of the dividend,
// shift counts reduced modulo the width, the C precedence table and integer
// promotion of the types narrower than int.
// The generator is seeded, so a failure is reproducible.

type Type = { bits: number; signed: boolean; suffix: string };
type Value = { value: bigint; type: Type };

const INT: Type = { bits: 32, signed: true,  suffix: ''   };

const TYPES: Type[] = [
    INT,
    { bits: 32, signed: false, suffix: 'u'  },
    { bits: 64, signed: true,  suffix: 'l'  },
    { bits: 64, signed: false, suffix: 'ul' },
    { bits: 16, signed: true,  suffix: 's'  },
    { bits: 16, signed: false, suffix: 'us' },
    { bits: 8,  signed: true,  suffix: 'b'  },
    { bits: 8,  signed: false, suffix: 'ub' },
];

const NARROW_TYPES = TYPES.filter(t => t.bits < 32);

const PRECEDENCE: { [op: string]: number } = { '|': 1, '^': 2, '&': 3, '<<': 4, '>>': 4, '>>>': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };
const OPERATORS = Object.keys(PRECEDENCE);

function wrap(value: bigint, type: Type): bigint {
    const modulo = BigInt(1) << BigInt(type.bits);
    const unsigned = ((value % modulo) + modulo) % modulo;
    return type.signed && unsigned >= modulo / BigInt(2) ? unsigned - modulo : unsigned;
}

// An operand that is narrower than int goes into an operation as an int
const promote = (type: Type): Type => type.bits < 32 ? INT : type;

// Calculates an expression. typeOf gives the type of each literal. The literals of
// one expression have the same type, or all of them are narrower than int. Thus the
// two operands of an operation always have the same promoted type.
function reference(tokens: string[], typeOf: (literal: string) => Type): Value {
    let i = 0;

    const literal = (token: string, negative: boolean): Value => {
        const type = typeOf(token);
        const magnitude = BigInt(token.substring(0, token.length - type.suffix.length));
        return { value: wrap(negative ? -magnitude : magnitude, type), type };
    };

    const unary = (operation: (value: bigint) => bigint): Value => {
        const operand = primary();
        const type = promote(operand.type);
        return { value: wrap(operation(operand.value), type), type };
    };

    const primary = (): Value => {
        const token = tokens[i++];
        // A minus before a literal is a part of the literal. The value wraps to the type of the literal.
        if (token === '-' && /^[0-9]/.test(tokens[i] ?? '')) return literal(tokens[i++], true);
        if (token === '-') return unary(value => -value);
        if (token === '~') return unary(value => ~value);
        if (token === '(') { const v = expression(0); i++; return v; }
        return literal(token, false);
    };

    const expression = (minPrecedence: number): Value => {
        let left = primary();
        while (i < tokens.length && tokens[i] in PRECEDENCE && PRECEDENCE[tokens[i]] >= minPrecedence) {
            const op = tokens[i++];
            const right = expression(PRECEDENCE[op] + 1);
            left = apply(left, op, right);
        }
        return left;
    };

    const apply = (left: Value, op: string, right: Value): Value => {
        const type = promote(left.type);
        const a = left.value;
        const b = right.value;
        const width = BigInt(type.bits);
        const count = ((b % width) + width) % width;
        const unsignedA = wrap(a, { ...type, signed: false });
        const result = (value: bigint): Value => ({ value: wrap(value, type), type });
        switch (op) {
            case '<<': return result(a << count);
            case '>>': return result((type.signed ? a : unsignedA) >> count);
            case '>>>': return result(unsignedA >> count);
            case '&': return result(a & b);
            case '|': return result(a | b);
            case '^': return result(a ^ b);
            case '+': return result(a + b);
            case '-': return result(a - b);
            case '*': return result(a * b);
            case '/': if (b === BigInt(0)) throw new Error('Division by zero.'); return result(a / b);
            default:  if (b === BigInt(0)) throw new Error('Division by zero.'); return result(a % b);
        }
    };

    return expression(0);
}

// Deterministic generator (LCG) of random expressions. It selects a type for each literal.
function generator(seed: number) {
    let state = seed;
    const next = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
    const int = (from: number, to: number) => from + Math.floor(next() * (to - from + 1));

    const literal = (type: Type): string => {
        const maxBits = type.signed ? type.bits - 1 : type.bits;
        const magnitudeBits = int(0, maxBits);
        const max = (BigInt(1) << BigInt(magnitudeBits)) - BigInt(1);
        const value = BigInt(Math.floor(next() * 1e9)) * BigInt(Math.floor(next() * 1e9)) % (max + BigInt(1));
        const base = int(0, 2);
        // A hexadecimal literal cannot have the suffix b: 0x1b is the number 27
        const digits = base === 0 || (base === 1 && type.suffix === 'b') ? value.toString() : base === 1 ? '0x' + value.toString(16) : '0b' + value.toString(2);
        return digits + type.suffix;
    };

    const expression = (pickType: () => Type, depth: number): string[] => {
        if (depth === 0 || next() < 0.3) {
            const tokens = [literal(pickType())];
            const unary = int(0, 5);
            if (unary === 0) tokens.unshift('-');
            if (unary === 1) tokens.unshift('~');
            if (unary === 2) tokens.unshift('~', '-');
            return tokens;
        }

        const left = expression(pickType, depth - 1);
        const right = expression(pickType, depth - 1);
        const op = OPERATORS[int(0, OPERATORS.length - 1)];
        const parenthesize = (t: string[]) => next() < 0.4 ? ['(', ...t, ')'] : t;
        return [...parenthesize(left), op, ...parenthesize(right)];
    };

    return { expression, int };
}

// The value and type of a result, or the message of the error that replaced it (division by zero)
type Outcome = { value: string; bits: number; signed: boolean } | { error: string };

function outcome(evaluate: () => { value: bigint; maxBitSize: number; signed: boolean }): Outcome {
    try {
        const result = evaluate();
        return { value: result.value.toString(), bits: result.maxBitSize, signed: result.signed };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

function check(tokens: string[], input: string, typeOf: (literal: string) => Type) {
    const expected = outcome(() => {
        const result = reference(tokens, typeOf);
        return { value: result.value, maxBitSize: result.type.bits, signed: result.type.signed };
    });
    const actual = outcome(() => {
        const expression = parser.parse(input);
        return expression instanceof ListOfNumbers
            ? expression.children[0].value   // a lone (possibly negative) literal
            : (expression as BitwiseOperation).evaluate().value;
    });

    expect({ input, ...actual }).toEqual({ input, ...expected });
}

describe("differential fuzz against a BigInt reference", () => {
    for (const type of TYPES) {
        it(`${type.bits}-bit ${type.signed ? 'signed' : 'unsigned'} ('${type.suffix}' suffix)`, () => {
            const gen = generator(20261107);

            for (let i = 0; i < 300; i++) {
                const tokens = gen.expression(() => type, gen.int(1, 4));
                const input = tokens.join(gen.int(0, 1) === 0 ? '' : ' ');

                check(tokens, input, () => type);
            }
        });
    }

    it("8- and 16-bit types mixed, signed with unsigned", () => {
        const gen = generator(20261125);
        // The longest suffix is first. Thus the pattern does not read 'ub' as 'b'.
        const bySuffix = [...NARROW_TYPES].sort((a, b) => b.suffix.length - a.suffix.length);
        const typeOf = (literal: string) => bySuffix.find(t => literal.endsWith(t.suffix))!;

        for (let i = 0; i < 600; i++) {
            const tokens = gen.expression(() => NARROW_TYPES[gen.int(0, NARROW_TYPES.length - 1)], gen.int(1, 4));
            const input = tokens.join(gen.int(0, 1) === 0 ? '' : ' ');

            check(tokens, input, typeOf);
        }
    });
});
