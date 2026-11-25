import { INT32_MAX_VALUE, INT32_MIN_VALUE, UINT32_MAX_VALUE } from "./const";
import { asIntN } from "./utils";
import formatter from "./formatter";
import { bitsOf } from "./calc";

export type JsNumber = number | bigint;
export type IntegerInput = JsNumber | string;

export class Integer {
    
    readonly value: bigint;
    readonly maxBitSize: number;
    readonly signed: boolean;

    constructor(value: IntegerInput, maxBitSize?: number, signed? : boolean) {

        this.value = typeof value === "bigint" ? value : BigInt(value);
        const resolvedSigned = signed ?? true;
        this.signed = resolvedSigned;
        this.maxBitSize = maxBitSize ?? detectSize(this.value, this.signed);

        if(!this.signed && this.value < 0)
            throw new Error("Value " + value + " cannot be negative if the type is unsigned.");
    }

    static unsigned(value : IntegerInput, maxBitSize?: number) {
        return new Integer(value, maxBitSize, false);
    }

    static signed(value : IntegerInput, maxBitSize?: number) {
        return new Integer(value, maxBitSize, true);
    }

    static long(value: IntegerInput) : Integer {
        return new Integer(value, 64);
    }

    static int(value: IntegerInput) : Integer {
        return new Integer(value, 32);
    }

    static short(value: IntegerInput) : Integer {
        return new Integer(value, 16);
    }

    static byte(value: IntegerInput) : Integer {
        return new Integer(value, 8);
    }

    abs() : Integer {
        return new Integer(
            this.value >= 0 ? 
                this.value : -this.value, this.maxBitSize, this.signed);
    }

    isTheSame  (other : Integer) : boolean {
        return this.value === other.value && this.signed === other.signed && this.maxBitSize === other.maxBitSize;
    }

    // The unsigned value has the same bits. A negative value has the bits of its two's complement.
    toUnsigned() {
        return new Integer(this.signed ? bitsOf(this) : this.value, this.maxBitSize, false);
    }

    // The signed value has the same bits
    toSigned() {
        return new Integer(this.signed ? this.value : BigInt.asIntN(this.maxBitSize, bitsOf(this)), this.maxBitSize, true);
    }

    resize(newSize: number) {

        if(newSize < this.maxBitSize)
            throw new Error("Size cannot be reduced.");
        
        if(newSize > 64)
            throw new Error(`Bit size of ${newSize} is not supported.`)
            
        return new Integer(this.value, newSize, this.signed);
    }

    // A signed value keeps its bits in the width of its own type. For example, -1 as a byte
    // becomes 255, also if the other type is wider.
    convertTo(other: Integer) {
        const value = this.signed && !other.signed ? bitsOf(this) : this.value;
        return new Integer(value, other.maxBitSize, other.signed);
    }

    valueOf() {
        return this.value.toString();
    }

    toString(base?:number) {
        return formatter.numberToString(this, base || 10, this.maxBitSize);
    }
    
    num() {
        return asIntN(this.value);
    }

    bigint() {
        return this.value;
    }
}

export function asInteger(num: JsNumber | Integer | string): Integer {

    if(typeof num === "string")
        return asInteger(BigInt(num));

    if(isInteger(num))
        return num;

    if(typeof num === "number" && isNaN(num)) {
        throw new Error("Cannot create BoundedNumber from NaN.");
    }

    const size = num > INT32_MAX_VALUE || num < INT32_MIN_VALUE ? 64 : 32;

    const n = typeof num === "bigint" ? num : BigInt(num);
    return new Integer(n, size);
}

export function isInteger(num: JsNumber | Integer): num is Integer {
    return (num as Integer).maxBitSize !== undefined;
}
function detectSize(value: bigint, signed: boolean): number {
    
    if(!signed)
        return value > UINT32_MAX_VALUE ? 64 : 32;
    else
        return value < INT32_MIN_VALUE || value > INT32_MAX_VALUE ? 64 : 32;
}

