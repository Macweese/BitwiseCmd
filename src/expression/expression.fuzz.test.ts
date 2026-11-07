import { parser, BitwiseOperation, ListOfNumbers } from "./expression";

// Differential test of the parser and the calculation engine against a small
// independent BigInt evaluator with C semantics: fixed-width two's complement
// wrap-around, truncating division, remainder with the sign of the dividend,
// shift counts reduced modulo the width and the C precedence table.
// The generator is seeded, so a failure is reproducible.

type Type = { bits: number; signed: boolean; suffix: string };

const TYPES: Type[] = [
    { bits: 32, signed: true,  suffix: ''   },
    { bits: 32, signed: false, suffix: 'u'  },
    { bits: 64, signed: true,  suffix: 'l'  },
    { bits: 64, signed: false, suffix: 'ul' },
    { bits: 16, signed: true,  suffix: 's'  },
    { bits: 8,  signed: false, suffix: 'ub' },
];

const PRECEDENCE: { [op: string]: number } = { '|': 1, '^': 2, '&': 3, '<<': 4, '>>': 4, '>>>': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };
const OPERATORS = Object.keys(PRECEDENCE);

function wrap(value: bigint, type: Type): bigint {
    const modulo = BigInt(1) << BigInt(type.bits);
    const unsigned = ((value % modulo) + modulo) % modulo;
    return type.signed && unsigned >= modulo / BigInt(2) ? unsigned - modulo : unsigned;
}

function reference(tokens: string[], type: Type): bigint {
    let i = 0;

    const primary = (): bigint => {
        const token = tokens[i++];
        if (token === '-') return wrap(-primary(), type);
        if (token === '~') return wrap(~primary(), type);
        if (token === '(') { const v = expression(0); i++; return v; }
        return wrap(BigInt(token.substring(0, token.length - type.suffix.length)), type);
    };

    const expression = (minPrecedence: number): bigint => {
        let left = primary();
        while (i < tokens.length && tokens[i] in PRECEDENCE && PRECEDENCE[tokens[i]] >= minPrecedence) {
            const op = tokens[i++];
            const right = expression(PRECEDENCE[op] + 1);
            left = apply(left, op, right);
        }
        return left;
    };

    const apply = (a: bigint, op: string, b: bigint): bigint => {
        const width = BigInt(type.bits);
        const count = ((b % width) + width) % width;
        const unsignedA = wrap(a, { ...type, signed: false });
        switch (op) {
            case '<<': return wrap(a << count, type);
            case '>>': return wrap((type.signed ? a : unsignedA) >> count, type);
            case '>>>': return wrap(unsignedA >> count, type);
            case '&': return wrap(a & b, type);
            case '|': return wrap(a | b, type);
            case '^': return wrap(a ^ b, type);
            case '+': return wrap(a + b, type);
            case '-': return wrap(a - b, type);
            case '*': return wrap(a * b, type);
            case '/': if (b === BigInt(0)) throw new Error('Division by zero.'); return wrap(a / b, type);
            default:  if (b === BigInt(0)) throw new Error('Division by zero.'); return wrap(a % b, type);
        }
    };

    return expression(0);
}

// Deterministic generator (LCG) of random expressions over one type
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
        const digits = base === 0 ? value.toString() : base === 1 ? '0x' + value.toString(16) : '0b' + value.toString(2);
        return digits + type.suffix;
    };

    const expression = (type: Type, depth: number): string[] => {
        if (depth === 0 || next() < 0.3) {
            const tokens = [literal(type)];
            const unary = int(0, 5);
            if (unary === 0) tokens.unshift('-');
            if (unary === 1) tokens.unshift('~');
            if (unary === 2) tokens.unshift('~', '-');
            return tokens;
        }

        const left = expression(type, depth - 1);
        const right = expression(type, depth - 1);
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

describe("differential fuzz against a BigInt reference", () => {
    for (const type of TYPES) {
        it(`${type.bits}-bit ${type.signed ? 'signed' : 'unsigned'} ('${type.suffix}' suffix)`, () => {
            const gen = generator(20261107);

            for (let i = 0; i < 300; i++) {
                const tokens = gen.expression(type, gen.int(1, 4));
                const input = tokens.join(gen.int(0, 1) === 0 ? '' : ' ');

                const expected = outcome(() => ({ value: reference(tokens, type), maxBitSize: type.bits, signed: type.signed }));
                const actual = outcome(() => {
                    const expression = parser.parse(input);
                    return expression instanceof ListOfNumbers
                        ? expression.children[0].value   // a lone (possibly negative) literal
                        : (expression as BitwiseOperation).evaluate().value;
                });

                expect({ input, ...actual }).toEqual({ input, ...expected });
            }
        });
    }
});
