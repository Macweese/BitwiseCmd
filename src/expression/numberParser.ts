import { INT32_MAX_VALUE, UINT32_MAX_VALUE } from "../core/const";
import { NumberBase } from "../core/formatter";
import { Integer } from "../core/Integer";

const numberRegexString = "-?([0-9]+|0b[0-1]+|0x[0-9,a-f]+)(l|s|b|ul|us|ub|u)?";
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

    if(!signed && isNegative)
    {
        const signed = new Integer(newValue, bitSize, true);
        const bin = "0b" + signed.toString(2);
        return  Integer.unsigned(BigInt(bin), bitSize);
    }

    return new Integer(newValue, bitSize, signed);
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
