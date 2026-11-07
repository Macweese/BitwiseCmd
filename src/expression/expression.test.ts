import { parser, ListOfNumbers, BitwiseOperation } from "./expression";
import { random } from "../core/utils";
import { INT32_MAX_VALUE } from "../core/const";

function parse(input: string): BitwiseOperation {
    const expr = parser.parse(input);
    expect(expr).toBeInstanceOf(BitwiseOperation);
    return expr as BitwiseOperation;
}

function evaluate(input: string): string {
    return parse(input).evaluate().value.toString();
}

describe("expression parser", () => {

    it("parses list of number expression", () => {
        var result = parser.parse("1 2 3");
        expect(result).toBeInstanceOf(ListOfNumbers);
    });

    it("does not parse a list of numbers containing a bad number", () => {
        expect(parser.parse("1 2 z")).toBeNull();
        expect(parser.parse("")).toBeNull();
    });

    it("parses expressions with every operator", () => {
        expect(parser.parse("~1")).toBeInstanceOf(BitwiseOperation);
        expect(parser.parse("1^2")).toBeInstanceOf(BitwiseOperation);
        expect(parser.parse("1|2")).toBeInstanceOf(BitwiseOperation);
        expect(parser.parse("1*2")).toBeInstanceOf(BitwiseOperation);
        expect(parser.parse("1-2")).toBeInstanceOf(BitwiseOperation);
        expect(parser.parse("1/2")).toBeInstanceOf(BitwiseOperation);
        expect(parser.parse("1%2")).toBeInstanceOf(BitwiseOperation);
        expect(parser.parse("(1)")).toBeInstanceOf(BitwiseOperation);
    });

    it("parses big binary bitwise expression", () => {
        const input = "0b00010010001101000101011001111000 0b10101010101010101010101000000000";
        const actual = parser.parse(input);
        expect(actual).toBeInstanceOf(ListOfNumbers);

        const expr = actual as ListOfNumbers;
        expect(expr.children[0].getUnderlyingOperand().value.toString()).toBe('305419896');
        expect(expr.children[1].getUnderlyingOperand().value.toString()).toBe('2863311360');
    })

    it.each(["+", "*", "/", "-", "^", "%", "&", "|", "<<", ">>", ">>>"])("parses the binary operation 23 %s 34", (operator) => {
        const root = parse(`23 ${operator} 34`).tree.root;

        expect(root.type).toBe('operation');
        expect(root.operator).toBe(operator);
        expect(root.leftChild!.operand!.value.toString()).toBe('23');
        expect(root.rightChild!.operand!.value.toString()).toBe('34');
    });

    it("parses a unary operator inside a binary operation", () => {
        const root = parse("1|~2").tree.root;

        expect(root.operator).toBe('|');
        expect(root.rightChild!.type).toBe('unary');
        expect(root.rightChild!.operator).toBe('~');
        expect(root.rightChild!.leftChild!.operand!.value.toString()).toBe('2');
        expect(evaluate("1|~2")).toBe('-3');
    });

    it("parses parentheses", () => {
        expect(evaluate('0b0000000000000000001000010001011110000010100000001 & (0b0000000000000000001000010001011110000010100000001 >> 7)')).toBe('263168');
        expect(evaluate("(1 + 2) * 3")).toBe('9');
        expect(evaluate("((1))")).toBe('1');
        expect(evaluate("1 - (2 - 3)")).toBe('2');
        expect(evaluate("~(1|2)")).toBe('-4');
        expect(evaluate("-(1+2)")).toBe('-3');
    });

    it("keeps the operand's base", () => {
        expect(parse("0x10 + 1").tree.root.leftChild!.operand!.base).toBe('hex');
        expect(parse("0b10 + 1").tree.root.leftChild!.operand!.base).toBe('bin');
    });
});

describe("precedence and associativity", () => {
    it("follows the C precedence table", () => {
        expect(evaluate("1 + 2 * 3")).toBe('7');
        expect(evaluate("1 << 2 + 1")).toBe('8');
        expect(evaluate("1 | 2 & 3")).toBe('3');
        expect(evaluate("1 ^ 2 | 3 & 4")).toBe('3');
        expect(evaluate("0xff & 0x0f | 0xf0 ^ 0x3c")).toBe('207');
    });

    it("is left-associative", () => {
        expect(evaluate("2 - 1 - 1")).toBe('0');
        expect(evaluate("8 / 2 / 2")).toBe('2');
        expect(evaluate("8 >> 1 >> 1")).toBe('2');
        expect(evaluate("7 % 4 % 2")).toBe('1');
    });

    it("applies unary operators before binary ones", () => {
        expect(evaluate("~1 | 2")).toBe('-2');
        expect(evaluate("-2 * 3")).toBe('-6');
        expect(evaluate("~~5")).toBe('5');
        expect(evaluate("--5")).toBe('5');
        expect(evaluate("5 - -3")).toBe('8');
        expect(evaluate("5--3")).toBe('8');
        expect(evaluate("~-5")).toBe('4');
    });
});

describe("negative literals", () => {
    it("a minus in front of a literal is part of the literal", () => {
        const root = parse("-5 + 1").tree.root;
        expect(root.leftChild!.type).toBe('operand');
        expect(root.leftChild!.operand!.value.toString()).toBe('-5');
    });

    it("-2147483648 is a 32-bit INT_MIN, as in Java and C#", () => {
        const value = parse("-2147483648 + 0").evaluate().value;
        expect(value.toString()).toBe('-2147483648');
        expect(value.maxBitSize).toBe(32);
        expect(evaluate("-2147483648 / -1")).toBe('-2147483648'); // wraps, like the int it is
        expect(evaluate("-(-2147483648)")).toBe('-2147483648');
    });

    it("explicit and out-of-range literals are 64-bit", () => {
        const value = parse("-2147483648l / -1").evaluate().value;
        expect(value.toString()).toBe('2147483648');
        expect(value.maxBitSize).toBe(64);
        expect(parse("-2147483649 + 0").evaluate().value.maxBitSize).toBe(64);
        expect(parse("2147483648 + 0").evaluate().value.maxBitSize).toBe(64);
    });

    it("INT64_MIN can be used in an expression", () => {
        expect(evaluate("-9223372036854775808 + 0")).toBe('-9223372036854775808');
        expect(evaluate("-9223372036854775808 - 1")).toBe('9223372036854775807');
    });

    it("negative unsigned literals are their two's complement", () => {
        const value = parse("-1u + 0u").evaluate().value;
        expect(value.toString()).toBe('4294967295');
        expect(value.signed).toBe(false);
        expect(evaluate("-5u | 0u")).toBe('4294967291');
        expect(evaluate("-1ul & -1ul")).toBe('18446744073709551615');
    });

    it("negating an unsigned expression wraps as well", () => {
        const value = parse("-(5u)").evaluate().value;
        expect(value.toString()).toBe('4294967291');
        expect(value.signed).toBe(false);
    });
});

describe("literals", () => {
    it("accepts prefixes and suffixes in either case", () => {
        expect(parse("0XAB + 0").evaluate().value.toString()).toBe('171');
        expect(parse("0B11 + 0").evaluate().value.toString()).toBe('3');
        expect(parse("10U + 0u").evaluate().value.signed).toBe(false);
        expect(parse("10UL + 0ul").evaluate().value.maxBitSize).toBe(64);
    });
});

describe("parse errors", () => {
    it("rejects adjacent numbers instead of merging them", () => {
        expect(() => parse("1 2 + 3")).toThrow("Unexpected character at position 3");
    });

    it("reports the position in the input as typed", () => {
        expect(() => parse("(1 + 2")).toThrow("Expected closing parenthesis at position 7");
        expect(() => parse("1 +")).toThrow("Expected number at position 4");
        expect(() => parse("1 ++ 2")).toThrow("Expected number at position 4");
        expect(() => parse("1 > 2")).toThrow("Unexpected character at position 3");
        expect(() => parse("2(3)")).toThrow("Unexpected character at position 2");
        expect(() => parse("()")).toThrow("Expected number at position 2");
    });

    it("division and modulo by zero", () => {
        expect(() => evaluate("1 / 0")).toThrow("Division by zero");
        expect(() => evaluate("1 % 0")).toThrow("Division by zero");
    });
});

describe("multiplication", () => {
    it("evaluates simple products", () => {
        expect(evaluate("2*3")).toBe('6');
        expect(evaluate("-2*3")).toBe('-6');
    });

    it("wraps on 32-bit overflow", () => {
        expect(evaluate("2147483647*2")).toBe('-2');
    });

    it("wraps on 64-bit overflow", () => {
        expect(evaluate("9223372036854775807l*2l")).toBe('-2');
    });
});

describe("division", () => {
    it("evaluates simple quotients with truncation", () => {
        expect(evaluate("7/2")).toBe('3');
        expect(evaluate("-7/2")).toBe('-3');
        expect(evaluate("1/2")).toBe('0');
    });

    it("64-bit division", () => {
        expect(evaluate("9223372036854775807l/2l")).toBe('4611686018427387903');
    });
});

describe("modulo", () => {
    it("takes the sign of the dividend", () => {
        expect(evaluate("7 % 3")).toBe('1');
        expect(evaluate("-7 % 3")).toBe('-1');
        expect(evaluate("7 % -3")).toBe('1');
        expect(evaluate("-7 % -3")).toBe('-1');
        expect(evaluate("-2147483648 % -1")).toBe('0');
    });
});

describe("shifts", () => {
    it("the count is reduced modulo the width of the shifted operand", () => {
        expect(evaluate("1 << 31")).toBe('-2147483648');
        expect(evaluate("1 << 32")).toBe('1');
        expect(evaluate("1 << 33")).toBe('2');
        expect(evaluate("1l << 63")).toBe('-9223372036854775808');
        expect(evaluate("1l << 64")).toBe('1');
        expect(evaluate("1 << -1")).toBe('-2147483648');
        expect(evaluate("1 << 0xFFFFFFFFFFFFFFFFul")).toBe('-2147483648');
    });

    it("the result has the type of the left operand", () => {
        expect(parse("1 << 2l").evaluate().value.maxBitSize).toBe(32);
        expect(parse("1l << 2").evaluate().value.maxBitSize).toBe(64);
        expect(parse("1 >> 1u").evaluate().value.signed).toBe(true);
    });

    it("right shift is arithmetic for signed and logical for unsigned operands", () => {
        expect(evaluate("-8 >> 1")).toBe('-4');
        expect(evaluate("-8 >>> 1")).toBe('2147483644');
        expect(evaluate("4294967288u >> 1")).toBe('2147483644');
    });
});

describe("comparison with nodejs engine", () => {

    it('set 32-bit', () => {

        const inputs = [
            "1485578196>>14",
            "921979543<<31",
            "1123|324",
            "213&9531",
            "120^442161",
            "1<<7",
            "2>>>8",
            "2<<7"
        ];

        inputs.forEach(i => testBinary(i, i));
    });

    it('random: two operands 32-bit', () => {

        const signs = ["|", "&", "^", "<<", ">>", ">>>", "+", "*", "/", "-", "%"]
        const int32 = (n: bigint) => BigInt.asIntN(32, n);
        const uint32 = (n: bigint) => BigInt.asUintN(32, n);

        for(var i =0; i<1000; i++){

            const operator = signs[random(0, signs.length-1)];
            const isShift = operator.length > 1;
            const op1 = random(-INT32_MAX_VALUE, INT32_MAX_VALUE);
            let op2 = isShift ? random(0, 31) : random(-INT32_MAX_VALUE, INT32_MAX_VALUE);
            if ((operator === "/" || operator === "%") && op2 === 0) op2 = 1;
            
            const input = op1.toString() + operator + op2.toString();
            const a = BigInt(op1), b = BigInt(op2);
            let expected: bigint;

            switch (operator) {
                case "|": expected = a | b; break;
                case "&": expected = a & b; break;
                case "^": expected = a ^ b; break;
                case "<<": expected = a << b; break;
                case ">>": expected = a >> b; break;
                case ">>>": expected = uint32(a) >> b; break;
                case "+": expected = a + b; break;
                case "*": expected = a * b; break;
                case "/": expected = a / b; break; // trunc toward zero
                case "-": expected = a - b; break;
                default: expected = a % b; break;
            }

            expect(`${evaluate(input)} (${input})`).toBe(`${int32(expected)} (${input})`);
        }
    });

    it('random: 64 and 32-bit', () => {

        for(var i =0; i<1000; i++){

            const num = random(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
            const actualInput = "~" + num.toString();
            const expectedInput = Math.abs(num) > INT32_MAX_VALUE ? `~BigInt("${num}")` : actualInput;
            const expected = eval(expectedInput).toString();

            expect(evaluate(actualInput)).toBe(expected);
        }
    });

    it('random: two binary strings 64-bit', () => {

        const operators = ["|", "&", "^"]

        for(var i =0; i<1000; i++){
            const operator = operators[random(0, operators.length-1)];
            const op1 = random(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
            const op2 = random(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

            const actualInput = `${op1}l${operator}${op2}l`;
            const expectedInput = `BigInt("${op1}")${operator}BigInt("${op2}")`;

            testBinary(expectedInput, actualInput);
        }
    });

    function testBinary(expectedInput:string, actualInput: string) {
        const expected = eval(expectedInput).toString();
        expect(evaluate(actualInput)).toBe(expected);
    }
});
