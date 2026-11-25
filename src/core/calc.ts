import { Integer, JsNumber,  asInteger } from "./Integer";

const ZERO = BigInt(0);
const ONE = BigInt(1);

const calc = {

    numberOfBitsDisplayed: function (num: Integer | JsNumber) : number {
        const n = asInteger(num);
        const len = this.toBinaryString(n).length;
        return (len + 1) === n.maxBitSize ? n.maxBitSize : len; // Include sign bit if it is all that left
    },

    flipBit: function(num: Integer | JsNumber, bitIndex: number): Integer  {
        const n = asInteger(num);
        // The index 0 is the most significant bit of the type
        return resultOf(bitsOf(n) ^ (ONE << BigInt(n.maxBitSize - 1 - bitIndex)), n);
    },

    promoteTo64Bit(number: Integer) : Integer {
        const bin = this.toBinaryString(number);
        return new Integer(BigInt("0b" + bin), 64);
    },

    addSpace(number: Integer, requiredSpace: number) : Integer {

        if(requiredSpace < 0)
            throw new Error("Required space cannot be negative.");

        const totalSpaceRequired = number.maxBitSize + requiredSpace;
        return new Integer(number.value, nextPowOfTwo(totalSpaceRequired), number.signed);
    },

    operation (op1: Integer, operator: string, op2 : Integer) : Integer {
       
        switch(operator) {
            case ">>": return this.rshift(op1, op2.value);
            case ">>>": return this.urshift(op1, op2.value);
            case "<<": return this.lshift(op1, op2.value);
            case "&": return this.and(op1, op2);
            case "|": return this.or(op1, op2);
            case "^": return this.xor(op1, op2);
            case "+": return this.add(op1, op2);
            case "-": return this.sub(op1, op2);
            case "*": return this.mul(op1, op2);
            case "/": return this.div(op1, op2);
            case "%": return this.mod(op1, op2);
            default: throw new Error(operator + " operator is not supported.");
        }
    },

    toBinaryString(num: Integer) : string {
        const bitSize = num.maxBitSize;

        if(!fitsWidth(num)) {
            const bin = num.abs().value.toString(2);
            throw new Error(`Binary representation for '${num.value}' ('${bin}', ${bin.length} bits) is bigger than the given data type (${bitSize} bits).`)
        }

        // The bits of a negative number are its two's complement in the width of its type
        return num.value < ZERO
            ? BigInt.asUintN(bitSize, num.value).toString(2).padStart(bitSize, '0')
            : num.value.toString(2);
    },

    lshift (num: Integer, numBytes : JsNumber) : Integer {
        return resultOf(typedValue(num) << BigInt(shiftCount(numBytes, num.maxBitSize)), num);
    },

    rshift (num : Integer, numBytes : JsNumber) : Integer {
        // BigInt keeps the sign of a negative value in a right shift. An unsigned type has no negative values.
        return resultOf(typedValue(num) >> BigInt(shiftCount(numBytes, num.maxBitSize)), num);
    },

    urshift (num : Integer, numBytes : JsNumber) : Integer {
        return resultOf(bitsOf(num) >> BigInt(shiftCount(numBytes, num.maxBitSize)), num);
    },

    not(num:Integer) : Integer {
        return resultOf(~typedValue(num), num);
    },

    // Arithmetic negation within the operand's width: wraps like hardware, so
    // -INT_MIN stays INT_MIN and negating an unsigned number gives its two's complement.
    negate(num: Integer) : Integer {
        return resultOf(-typedValue(num), num);
    },

    and (num1 : Integer, num2 : Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a & b);
    },

    or (num1 : Integer, num2 : Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a | b);
    },

    xor (num1 : Integer, num2 : Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a ^ b);
    },

    mul (num1: Integer, num2: Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a * b);
    },

    sub (num1: Integer, num2: Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a - b);
    },

    // BigInt division truncates toward zero, like C
    div (num1: Integer, num2: Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a / nonZero(b));
    },

    add(num1: Integer, num2: Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a + b);
    },

    // BigInt remainder takes the sign of the dividend, like C
    mod(num1: Integer, num2: Integer) : Integer {
        return binaryOperation(num1, num2, (a, b) => a % nonZero(b));
    },

    engine: { 
        lshift (bin: string, bytes: number):string {
            return bin.substring(bytes) + "0".repeat(bytes);
        },
        rshift (bin: string, bytes: number):string {
            const pad = bin[0].repeat(bytes);
            return pad + bin.substring(0, bin.length - bytes);
        },
        urshift (bin: string, bytes: number):string {
            const pad = '0'.repeat(bytes);
            return pad + bin.substring(0, bin.length - bytes);
        },
        not (bin: string) : string {

            return bin
                .split('').map(c => flip(c))
                .join("");
        },
        or (bin1: string, bin2 : string) : string  {

            checkSameLength(bin1, bin2);

            const result = [];
            for(var i=0; i<bin1.length; i++) {
                
                const b1 = bin1[i] === "1";
                const b2 = bin2[i] === "1";

                result.push(b1 || b2 ? "1" : "0");
            }

            return result.join('');
        },
        and (bin1: string, bin2 : string) : string  {

            checkSameLength(bin1, bin2);

            const result = [];
            for(var i=0; i<bin1.length; i++) {
                
                const b1 = bin1[i] === "1";
                const b2 = bin2[i] === "1";

                result.push(b1 && b2 ? "1" : "0");
            }

            return result.join('');
        },
        xor (bin1: string, bin2:string) : string {

            checkSameLength(bin1, bin2);

            const result = [];
            for(var i=0; i<bin1.length; i++) {
                
                const b1 = bin1[i] === "1";
                const b2 = bin2[i] === "1";

                result.push(b1 !== b2 ? "1" : "0");
            }

            return result.join('');
        },
        add (bin1: string, bin2:string) : string {
            checkSameLength(bin1, bin2);
            const len = bin1.length;
            let carry = 0;
            const out: string[] = new Array(len);

            for (let i = len - 1; i >= 0; i--) {
                const b1 = bin1[i] === '1' ? 1 : 0;
                const b2 = bin2[i] === '1' ? 1 : 0;
                const sum = b1 + b2 + carry;
                out[i] = (sum % 2) === 1 ? '1' : '0';
                carry = sum >= 2 ? 1 : 0;
            }

            // Overflow carry is discarded to keep fixed width
            return out.join('');
        },
        mul (bin1: string, bin2: string) : string {
            checkSameLength(bin1, bin2);
            // The low `len` bits of a product do not depend on the signedness of the operands
            return wrapToWidth(binToBigInt(bin1, true) * binToBigInt(bin2, true), bin1.length);
        },
        sub (bin1: string, bin2: string) : string {
            checkSameLength(bin1, bin2);
            // Two's complement subtraction: a - b == a + (-b)
            const negB = calc.engine.applyTwosComplement(bin2);
            return calc.engine.add(bin1, negB);
        },
        div (bin1: string, bin2: string, signed: boolean = true) : string {
            checkSameLength(bin1, bin2);
            const a = binToBigInt(bin1, signed);
            const b = binToBigInt(bin2, signed);
            if (b === BigInt(0))
                throw new Error('Division by zero.');

            // BigInt division truncates toward zero, like C
            return wrapToWidth(a / b, bin1.length);
        },
        mod (bin1: string, bin2: string, signed: boolean = true) : string {
            checkSameLength(bin1, bin2);
            const a = binToBigInt(bin1, signed);
            const b = binToBigInt(bin2, signed);
            if (b === BigInt(0))
                throw new Error('Division by zero.');

            // BigInt remainder takes the sign of the dividend, like C
            return wrapToWidth(a % b, bin1.length);
        },
        flipBit(bin: string, bitIndex : number) : string {
            return bin.substring(0, bitIndex) + flip(bin[bitIndex]) + bin.substring(bitIndex+1)
        },
        applyTwosComplement: (bin:string):string => {
            var lastIndex = bin.lastIndexOf('1');
        
            // If there exists no '1' concat 1 at the
            // starting of string
            if (lastIndex === -1)
                return bin;
        
            // Continue traversal backward after the position of
            // first '1'
            var flipped =[];
            for (var i = lastIndex - 1; i >= 0; i--) {
                // Just flip the values
                flipped.unshift(bin.charAt(i) === "1" ? "0" : "1");
            }
        
            const result =  flipped.join('') + bin.substring(lastIndex);
            //logLines(bin + " " + bin.length, result + " " + result.length);
            return result;
        },
    }
};

export default calc;

// The operations calculate on BigInt values. A result that is out of the range of its type
// wraps, as in hardware with a fixed width.

// A number fits the width of its type if its magnitude has no more bits than the type
function fitsWidth(n: Integer) : boolean {
    const magnitude = n.value < ZERO ? -n.value : n.value;
    return magnitude >> BigInt(n.maxBitSize) === ZERO;
}

// The value that the bits of a number have in its type
function typedValue(n: Integer) : bigint {
    if(!fitsWidth(n))
        calc.toBinaryString(n); // Throws the error for a number that is too large

    return n.signed ? BigInt.asIntN(n.maxBitSize, n.value) : BigInt.asUintN(n.maxBitSize, n.value);
}

// The bits of a number as a value that is not negative
function bitsOf(n: Integer) : bigint {
    return BigInt.asUintN(n.maxBitSize, typedValue(n));
}

// A number of the given type from a value. The value wraps to the width of the type.
function resultOf(value: bigint, type: Integer) : Integer {
    const wrapped = type.signed ? BigInt.asIntN(type.maxBitSize, value) : BigInt.asUintN(type.maxBitSize, value);
    return new Integer(wrapped, type.maxBitSize, type.signed);
}

function binaryOperation(op1: Integer, op2: Integer, operation: (a: bigint, b: bigint) => bigint) : Integer {

    if(op1.maxBitSize === op2.maxBitSize && op1.signed !== op2.signed)
        throw new Error("This operation cannot be applied to signed and unsigned operands of the same size.");

    const [num1, num2] = equalizeSize(op1, op2);

    return resultOf(operation(typedValue(num1), typedValue(num2)), num1);
}

function nonZero(divisor: bigint) : bigint {
    if(divisor === ZERO)
        throw new Error('Division by zero.');

    return divisor;
}

function checkSameLength(bin1: string, bin2: string) {
    if (bin1.length !== bin2.length)
        throw new Error("Binary strings must have the same length.");
}

// Reduces a shift count to the range [0, width) the way hardware does
// (x86 masks the count, JavaScript masks it for 32-bit values). Done on
// BigInt so that 64-bit counts are not rounded on the way through a double.
function shiftCount(count: JsNumber, width: number) : number {
    const w = BigInt(width);
    return Number(((BigInt(count) % w) + w) % w);
}

// Interprets a fixed-width binary string as a number, as two's complement when signed
function binToBigInt(bin: string, signed: boolean) : bigint {
    if (signed && bin[0] === '1')
        return -BigInt('0b' + calc.engine.applyTwosComplement(bin));

    return BigInt('0b' + bin);
}

// Keeps the low `width` bits of a number as a binary string (discards overflow, like fixed-width hardware)
function wrapToWidth(value: bigint, width: number) : string {
    const modulo = BigInt(1) << BigInt(width);
    return (((value % modulo) + modulo) % modulo).toString(2).padStart(width, '0');
}

function flip(bit:string):string { 
    return bit === "0" ? "1" : "0";
}

function nextPowOfTwo(num: number) : number {
    let p = 2;
    while(p < num) p = p*2;
    return p;
}

// Promotes both numbers to the same size using the size of the bigger one
function equalizeSize(n1: Integer, n2: Integer) : [Integer, Integer] {
    if(n1.maxBitSize === n2.maxBitSize)
    {
        if(n1.signed === n2.signed) return [n1,n2];

        // Example int and unsigned int. Promoted both to 64 bit
        return [n1.resize(n1.maxBitSize*2).toSigned(), n2.resize(n2.maxBitSize*2).toSigned()];
    }
    
    return n1.maxBitSize > n2.maxBitSize  
        ? [n1, n2.convertTo(n1)] 
        : [n1.convertTo(n2), n2];
}

/*
        // c#
        var op = -1;
		var r = op>>>33;
		Console.WriteLine(Convert.ToString(op, 2).PadLeft(32, '0'));
		Console.WriteLine(Convert.ToString(r,2).PadLeft(32, '0'));
		Console.WriteLine(Convert.ToString(r));
		Console.WriteLine(r.GetType().Name);
*/
