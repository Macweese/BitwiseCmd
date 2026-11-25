import { INT32_MAX_VALUE, UINT32_MAX_VALUE } from "../core/const";
import { NumberBase } from "../core/formatter";
import { Integer } from "../core/Integer";

const numberRegexString = "-?([0-9]+|0b[0-1]+|0x[0-9a-f]+)(l|s|b|ul|us|ub|u)?";
const numberRegexFullString = "^"+numberRegexString+"$"

export interface ParsedNumber {
    value: Integer;
    base: NumberBase;
    input: string;
}

class NumberParser {
    
    numberRegexString: string;

    constructor()
    {
        this.numberRegexString = numberRegexString;
    }

    caseParse(input : string) {
        const regex = new RegExp(numberRegexFullString);
        return regex.test(input.toLowerCase());
    }

    parse (input : string) : ParsedNumber {

        if(input.length === 0) throw new Error("input is null or empty");

        // Prefixes and suffixes are accepted in either case (0XFFu, 10UL)
        const normalized = input.toLowerCase();
        const m = new RegExp(numberRegexFullString).exec(normalized);

        if(m === null || m.length === 0)
            throw new Error(input + " is not a number");

        const value = parseInteger(m[0], m[1], m[2] || '');
        
        return {
            value: value,
            base: getBase(m[1]),
            input: input
        }
    };
}

function parseInteger(input : string, numberPart: string, suffix: string)  : Integer {
    
    const isNegative = input.startsWith('-');
    let num = BigInt(numberPart);
    const signed = !suffix.startsWith('u');

    const bitSize = getSizeBySuffix(suffix, num, signed, isNegative);
    const newValue = isNegative  ? -num : num;

    validateRange(newValue, bitSize, signed);

    if(!signed && isNegative)
    {
        const signed = new Integer(newValue, bitSize, true);
        const bin = "0b" + signed.toString(2);
        return  Integer.unsigned(BigInt(bin), bitSize);
    }

    return new Integer(newValue, bitSize, signed);
}

// A number with the suffix b or s must fit its type. Without this check, 200b was a
// signed byte with the value 200. A 32-bit number that is too large becomes a 64-bit
// number. The check of a 64-bit number occurs when its operand is made.
function validateRange(value: bigint, bitSize: number, signed: boolean) {

    if(bitSize >= 32) return;

    if(signed) {
        const max = (BigInt(1) << BigInt(bitSize - 1)) - BigInt(1);
        const min = -max - BigInt(1);

        if(value < min || value > max)
            throw new Error(`Signed ${bitSize}-bit numbers are supported in range from ${min} to ${max}. Given number was ${value}.`);

        return;
    }

    // A negative unsigned number wraps, as -1u does. Thus the limit applies to its magnitude only.
    const max = (BigInt(1) << BigInt(bitSize)) - BigInt(1);

    if(value > max || value < -max)
        throw new Error(`Unsigned ${bitSize}-bit numbers larger than ${max} are not supported. Given number was ${value}.`);
}

function getSizeBySuffix(suffix: string, value : bigint, signed: boolean, isNegative: boolean) {

    let max32: bigint;
    if (signed) {
        max32 = BigInt(INT32_MAX_VALUE) + (isNegative ? BigInt(1) : BigInt(0));
    }
    else {
        max32 = BigInt(UINT32_MAX_VALUE);
    }

    switch(suffix.replace('u', '').toLowerCase()) {
        case 'l': return 64;
        case 's': return 16;
        case 'b': return 8;
        default: return value > max32  ? 64 : 32;
    }
}

// The prefix of the digits gives the base. "0b" in a different position is not
// a prefix: 0x0b is hexadecimal, and 10b is the decimal 10 with the byte suffix.
function getBase(digits: string): NumberBase {

    if(digits.startsWith('0b')) return 'bin';
    if(digits.startsWith('0x')) return 'hex';
    return 'dec';
}

const numberParser = new NumberParser();

export {numberParser, numberRegexString};
