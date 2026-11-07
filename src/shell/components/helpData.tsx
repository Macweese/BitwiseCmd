import React, { ReactNode } from "react";
import CommandLink from "../../core/components/CommandLink";
import {
    INT8_MIN_VALUE, INT8_MAX_VALUE, UINT8_MAX_VALUE,
    INT16_MIN_VALUE, INT16_MAX_VALUE, UINT16_MAX_VALUE,
    INT32_MIN_VALUE, INT32_MAX_VALUE, UINT32_MAX_VALUE,
    INT64_MIN_VALUE, INT64_MAX_VALUE, UINT64_MAX_VALUE
} from "../../core/const";

export type TipEntry = {
    content: ReactNode;
};

// Tips and trivia
export const HELPFUL_TIPS: readonly TipEntry[] = [
    {
        content: (
            <>
                Advanced computational techniques like{' '}
                <a target='_blank' href='https://en.wikipedia.org/wiki/Single_instruction,_multiple_data' rel="noreferrer">SIMD</a>{' '}
                and{' '}
                <a target='_blank' href='https://en.wikipedia.org/wiki/SWAR' rel="noreferrer">SWAR</a>{' '}
                heavily exploit the binary layout for performance optimizations, and data compression through{' '}
                <a target='_blank' href='https://www.cs.cornell.edu/courses/cs3410/2024fa/notes/bitpack.html' rel="noreferrer">bit-packing</a>
                .<br/>
                Learn more:{' '}
                <span className="no-break" >
                    <a target='_blank' href='https://en.wikipedia.org/wiki/Bit_field' rel="noreferrer">Bit-field</a>
                </span>
            </>
        ),
    },

    {
        content: (
            <>
                Unconventional arithmetic and integer manipulation is common in activities like{' '}
                <a target='_blank' href='https://en.wikipedia.org/wiki/Code_golf' rel="noreferrer">code golfing</a>.
            </>
        ),
    },

    {
        content: (
            <>
                Interesting masks for creating repeating patterns/shifts:
                <p>
                    <code>
                        <span className="pre">
                            {/* eslint-disable react/jsx-no-comment-textnodes */}
                            // 01010101...01<br/>
                            evenBits = <CommandLink text="0x55555555" /><br/><br/>
                            // 10101010...10<br/>
                            oddBits = <CommandLink text="0xAAAAAAAA" /><br/><br/>
                            // Checkerboard pattern (8×8 example)<br/>
                            checkerboard = <CommandLink text="0x55AA55AA55AA55AA" />
                            {/* eslint-enable react/jsx-no-comment-textnodes */}
                        </span>
                    </code>
                </p>
            </>
        ),
    },

    {
        content: (
            <>
                To check if two numbers have opposite signs, you can do:
                <p><span className="pre"><code>(a ^ b) &lt; 0</code></span></p>
                This returns true if one is positive and the other negative, only works for signed ints!
            </>
        ),
    },

    {
        content: (
            <>
                Population count using Kernighan's way (fast for sparse bits):
                <p>
                    <code>
                        <span className="pre">
                            {'\t'}int count = 0<br/>
                            {'\t'}while (n) {'{'}<br/>
                            {'\t\t'}n &= (n - 1) // clears the lowest set bit<br/>
                            {'\t\t'}count++<br/>
                            {'\t'}{'}'}
                        </span>
                    </code>
                </p>
                Although many modern languages already have a feature for this, like <code>.bit_count()</code> in Python 3.10 and newer.<br/>
                CPUs have a single instruction for this (<code>POPCNT</code>).
            </>
        ),
    },

    {
        content: (
            <>
                Isolate the rightmost zero bit of a number (all other bits are cleared):
                <p>
                    <span className="no-break"><code>~n & (n + 1)</code></span>
                </p>
                This is useful when working with graphics, or creating masks.<br/><br/>
                Try it:<br/>
                <p>
                    <span className="pre">
                        <code>
                            <CommandLink text="47" /><br/>
                            <CommandLink text="~47 & (47 + 1)" /><br/>
                            <br/>
                            <CommandLink text="239" /><br/>
                            <CommandLink text="~239 & (239 + 1)" /><br/>
                            <br/>
                            <CommandLink text="611" /><br/>
                            <CommandLink text="~611 & (611 + 1)" />
                        </code>
                    </span>
                </p>
            </>
        ),
    },

    {
        content: (
            <>
                Get the absolute value of a <strong>signed</strong> integer:{" "}
                <p>
                    <code>(n ^ (n &gt;&gt; 31)) - (n &gt;&gt; 31)</code>
                </p>
                <code>n &gt;&gt; 31</code> is 0 for a positive <code>n</code> and -1 (all bits set) for a negative one.<br/>
                If <code>n</code> is negative, the XOR flips all of its bits and subtracting -1 adds the 1 that completes the two's complement negation.<br/>
                If <code>n</code> is positive, nothing changes.<br/><br/>
                Try it:
                <p>
                    <span className="no-break"><code><CommandLink text="(9197 ^ (9197 >> 31)) - (9197 >> 31)" /></code></span><br/>
                    <span className="no-break"><code><CommandLink text="(-9197 ^ (-9197 >> 31)) - (-9197 >> 31)" /></code></span>
                </p>
            </>
        ),
    },

    {
        content: (
            <>
                Convert a character between uppercase and lowercase using bits:
                <p>
                    <code>
                        <span className="pre">
                            c ^ ' ' // char 'c' toggles case<br/>
                            c | ' ' // char 'c' becomes lowercase<br/>
                            c & '_' // char 'c' becomes uppercase<br/>
                        </span>
                    </code>
                </p>
                Example:<br/>
                <p>
                    <code>
                        <span className="pre">
                            char 'A' // binary representation 0100 0001 = 65<br/>
                            char 'a' // binary representation 0110 0001 = 97<br/>
                            char ' ' // binary representation 0010 0000 = 32<br/>
                            char '_' // binary representation 0101 1111 = 95<br/><br/>
                            <CommandLink text="65 | 32" /> = 97 // 'A' | ' ' = 'a'<br/>
                            <CommandLink text="97 ^ 32" /> = 65 // 'a' ^ ' ' = 'A'<br/>
                            <CommandLink text="97 & 95" /> = 65 // 'a' & '_' = 'A'<br/>
                        </span>
                    </code>
                </p>
                Cool party trick!
            </>
        ),
    },

    {
        content: (
            <>
                To check if a number is a power of 2 (i.e. 2<sup>n</sup>) you can do the following:
                <p>
                    <code>
                        <span className="pre">
                            {'\t'}bool isPowerOfTwo(int n) {'{'}
                            {'\n\t\t'}return n &gt; 0 && (n & (n - 1)) == 0
                            {'\n\t'}{'}'}
                        </span>
                    </code>
                </p>
                Try it:<br/>
                <p>
                    <code>
                        <span className="pre">
                            <CommandLink text="64 & (64 - 1)" /><br/>
                            <CommandLink text="67 & (67 - 1)" /><br/>
                            <CommandLink text="(2 * 2 * 2 * 2 * 2) & ((2 * 2 * 2 * 2 * 2) - 1)" /><br/>
                            <CommandLink text="(2 * 2 * 2 * 2 * 11) & ((2 * 2 * 2 * 2 * 11) - 1)" />
                        </span>
                    </code>
                </p>
                Don't forget the <code>n &gt; 0</code> part: the bit trick alone also accepts zero!<br/>
                <p>
                    <code><CommandLink text="0 & (0 - 1)" noBreak={true} /></code> ← careful!
                </p>
            </>
        ),
    },

    {
        content: (
            <>
                You can click on bits to flip them in number inputs{" "}
                <span className="no-break">(e.g. <code><CommandLink text="2 4" /></code>)</span>{" "}
                or IP addresses{" "}
                <span className="no-break">(e.g. <code><CommandLink text="192.168.0.0/8" /></code>)</span>.
            </>
        ),
    },

    {
        content: (
            <>
                Different integer representations are supported:<br/>
                <code><CommandLink text="213" noBreak={true} /></code><br/>
                <code><CommandLink text="0xcafebabe" noBreak={true} /></code><br/>
                <code><CommandLink text="0xDEAF - 0xDEAD" noBreak={true} /></code><br/>
                <code><CommandLink text="0b11001101" noBreak={true} /></code> — binary works great too!
            </>
        ),
    },

    {
        content: (
            <>
                Use <code><CommandLink text="10b 42ub -6s 999us" noBreak={true} /></code>
                {' '}to see different signed/unsigned integer sizes side by side.
            </>
        ),
    },

    {
        content: (
            <>
                The command <code><CommandLink text="em" noBreak={true} /></code>
                {' '}toggles byte emphasis — very useful when looking at IPv4 addresses.
                {' '}You can also specify the setting directly by appending <code>:on</code> or <code>:off</code> to the command.
            </>
        ),
    },

    {
        content: (
            <>
                You can enter multiple expressions at once:
                {' '}<code><CommandLink text="5 28 0b101010 0xF" noBreak={true} /></code>
            </>
        ),
    },

    {
        content: (
            <>
                To convert binary to Gray code:
                <p><span className="no-break">{'\t'}<code>n ^ (n &gt;&gt; 1)</code></span></p>
                Or the inverse; Gray code to binary:
                <p>
                    <code>
                        <span className="pre">
                            {'\t'}int binary = gray;<br/>
                            {'\t'}for (int g = gray &gt;&gt; 1; g != 0; g &gt;&gt;= 1) {'{'}<br/>
                            {'\t\t'}binary ^= g<br/>
                            {'\t'}{'}'}
                        </span>
                    </code>
                </p>
                Learn more:<br/>
                <a target='_blank' href='https://rosettacode.org/wiki/Gray_code' rel="noreferrer">Gray code (Rosetta Code)</a>,{' '}
                <a target='_blank' href='https://en.wikipedia.org/wiki/Gray_code' rel="noreferrer">Gray code (Wikipedia)</a>
            </>
        ),
    },

    {
        content: (
            <>
                You can use the arrow keys (<code>↑</code> and <code>↓</code>) to cycle through previously submitted commands.
            </>
        ),
    },

    {
        content: (
            <>
                Get the average of two numbers using binary arithmetic (overflow safe!):
                <p>
                    <code>
                        <span className="no-break">
                            int avg = (a & b) + ((a ^ b) &gt;&gt; 1)
                        </span>
                    </code>
                </p>
            </>
        ),
    },

    {
        content: (
            <>
                If you want to manipulate the <code>k<sup>th</sup></code> bit, you can do:
                <p>
                    <code>
                        <span className="pre">
                            n |=  (1 &lt;&lt; k)  // set<br/>
                            n ^=  (1 &lt;&lt; k)  // toggle<br/>
                            n &=  ~(1 &lt;&lt; k) // clear<br/>
                        </span>
                    </code>
                </p>
            </>
        ),
    },

    {
        content: (
            <>
                If you want to right-propagate (set all bits after) the rightmost set bit, you can do:
                <p>
                    <code>
                        <span className="no-break">
                            n |= n - 1 // sets all lower bits<br/>
                        </span>
                        <br/>
                    </code>
                    Check it out:
                    <code>
                        <span className="no-break">
                            <p>
                                <CommandLink text={"72"}></CommandLink><br/>
                                <CommandLink text={"72 | (72 - 1)"}></CommandLink>
                            </p>
                        </span>
                    </code>
                </p>
            </>
        ),
    },

    {
        content: (
            <>
                Trying to isolate the lowest set bit of a variable?<br/>
                <br/>Try
                <p><span className="no-break"><code>int keepLowest = n & -n</code></span></p>
                or
                <p><span className="no-break"><code>int discardLowest = n & ~(-n)</code></span></p>
                This comes in handy in many algorithms!<br/>
                For example, it may be used in {' '}
                <a target='_blank' href='https://en.wikipedia.org/wiki/Fenwick_tree' rel="noreferrer">Fenwick Trees</a>, {' '}
                <a target='_blank' href='https://rosettacode.org/wiki/Gosper%27s_hack' rel="noreferrer">Gosper's Hack</a>, {' '}
                (Brian) Kernighan's algorithm, and in solving 'power of two' problems (common in graphics or memory allocation!).
            </>
        ),
    },

    {
        content: (
            <>
                Did you know...
                <p>
                    In many programming languages, division truncates toward zero and the remainder takes the sign of the dividend.
                    {' '}This means that checking whether a number is odd with
                </p>
                <pre>
                    <span className="pre">
                        <code>
                            {'\t'}bool is_odd(int n) {'{'}
                            {'\n\t\t'}return n % 2 == 1
                            {'\n\t'}{'}'}
                        </code>
                    </span>
                    <br/>
                </pre>
                is false for every negative <code>n</code>, because <code>n % 2</code> is then <code>-1</code> or <code>0</code>.
                {' '}That could cause a bug!
                <br/>
                <br/>
                By checking if it is even instead <span className="no-break">(<code>n % 2 == 0</code>)</span>,
                {' '}or making use of binary arithmetic this may be avoided:
                <pre>
                    <span className="pre">
                        <code>
                            {'\t'}bool is_odd(int n) {'{'}
                            {'\n\t\t'}return n & 1
                            {'\n\t'}{'}'}
                        </code>
                    </span>
                    <br/>
                </pre>
                Though the first alternative can also be used intentionally, to check for only positive odd numbers!
            </>
        ),
    },

    {
        content: (
            <>
                Use <code><CommandLink text="max" /></code> to print the maximum value of different integer sizes.
            </>
        ),
    },

    {
        content: (
            <>
                Use <code><CommandLink text="min" /></code> to print the minimum value of different integer sizes.
            </>
        ),
    },

    {
        content: (
            <>
                Do you want to see what <code>~x</code> (bitwise NOT) really does in two's complement? Try
                {' '}<code><CommandLink text="~5" noBreak={true} /></code>,
                {' '}<code><CommandLink text="-~5" noBreak={true} /></code>,
                {' '}<code><CommandLink text="~-5" noBreak={true} /></code>
                {' '}or <code><CommandLink text="-~-5" noBreak={true} /></code>.
            </>
        ),
    },

    {
        content: (
            <>
                Did you know you can swap the value of two variables without declaring a third temporary variable?
                <br/>
                Instead of
                <pre>
                    <code>temp = a</code><br/>
                    <code>a = b</code><br/>
                    <code>b = temp</code><br/>
                </pre>
                It can be done with bit manipulation as
                <pre>
                    <code>a = a ^ b</code><br/>
                    <code>b = a ^ b</code><br/>
                    <code>a = a ^ b</code><br/>
                </pre>
                Cool huh?
            </>
        ),
    },

] as const;


export type CommandEntry = {
    command: string | readonly string[];
    description?: string;
    extraContent?: ReactNode;
};

export const BITWISE_CALCULATION_COMMANDS: readonly CommandEntry[] = [
    { command: "23 | 34",     description: "type bitwise expression to see the result in binary" },
    { command: "23 34",       description: "type one or more numbers to see their binary representations" },
    { command: ["1 << (2 + 1)", "(1 << 2) + 1", "~7 & 1", "~(7 & 1)"],
        description: "use parentheses to prioritize or nest expressions" },
] as const;

export const IP_NETWORK_COMMANDS: readonly CommandEntry[] = [
    { command: "127.0.0.1",              description: "enter single or multiple IP addresses (separated by space) to see their binary representation" },
    { command: "192.168.0.1/8",          description: "subnet mask notations are supported as well" },
    { command: "subnet 192.168.24.1/14", description: "display information about a subnet (network address, broadcast address, etc.)" },
    { command: "vpc 192.168.24.1/24",    description: "see how VPC network address bits are divided between VPC address, Subnets, and Hosts" },
] as const;

export const COLOR_THEME_COMMANDS: readonly CommandEntry[] = [
    { command: "light",    description: "set the Light color theme" },
    { command: "dark",     description: "set the Dark color theme" },
    { command: "midnight", description: "set the Midnight color theme" },
    { command: "graphite", description: "set the Graphite color theme" },
    { command: "github",   description: "set the GitHub color theme" },
    { command: "helix",    description: "set the Helix color theme" },
    { command: "emacs",    description: "set the Emacs color theme" },
    { command: "sakura",   description: "set the Sakura color theme" },
] as const;

export const OTHER_COMMANDS: readonly CommandEntry[] = [
    { command: "clear",    description: "clear output pane" },
    { command: "help",     description: "display this help" },
    { command: "whatsnew", description: "display changelog" },
    { command: "em",       description: "toggle byte emphasis" },
    { command: "annotate", description: "toggle data type annotations" },
    { command: "max",      description: "display the maximum values of the integer types" },
    { command: "min",      description: "display the minimum values of the integer types" },
    { command: "incognito", description: "toggle analytics tracking" },
    { command: "about",    description: "about the app" },
    {
        command: "guid",
        description: "generate ",
        extraContent: (
            <a href="https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_.28random.29" target="_blank" rel="noreferrer">
                v4 GUID
            </a>
        ),
    },
    { command: "tip",    description: "display a tip, trick or trivia" },
] as const;

type Operator = {
    symbol: string;
    description: string;
    note?: string;
};

export const BITWISE_OPERATORS: readonly Operator[] = [
    { symbol: "&",   description: "bitwise AND" },
    { symbol: "|",   description: "bitwise inclusive OR" },
    { symbol: "^",   description: "bitwise exclusive XOR" },
    { symbol: "~",   description: "bitwise NOT" },
    {
        symbol: "<<",
        description: "left shift",
        note: "[1]",
    },
    {
        symbol: ">>",
        description: "sign propagating right shift",
        note: "[1]",
    },
    {
        symbol: ">>>",
        description: "zero-fill right shift",
        note: "[1]",
    },
] as const;

export const ARITHMETIC_OPERATORS: readonly Operator[] = [
    { symbol: "+", description: "addition" },
    { symbol: "-", description: "subtraction" },
    { symbol: "*", description: "multiplication" },
    {
        symbol: "/",
        description: "division (truncates toward zero)",
        note: "[2]",
    },
    {
        symbol: "%",
        description: "remainder (truncated division)",
        note: "[3]",
    },
] as const;

export const ALL_OPERATORS = [...BITWISE_OPERATORS, ...ARITHMETIC_OPERATORS] as const;

// TODO: remove the \t hack, make the result div be a table, do it properly
//  or re-use the CommandTable component somehow
export const MAX_VALUES: readonly CommandEntry[] = [
    { command: `${INT8_MAX_VALUE}b`,    description: "Signed 8-bit:\t\t" },
    { command: `${INT16_MAX_VALUE}s`,   description: "Signed 16-bit:\t\t" },
    { command: `${INT32_MAX_VALUE}`,    description: "Signed 32-bit:\t\t" },
    { command: `${INT64_MAX_VALUE}l`,   description: "Signed 64-bit:\t\t" },
    { command: `${UINT8_MAX_VALUE}ub`,  description: "Unsigned 8-bit:\t\t" },
    { command: `${UINT16_MAX_VALUE}us`, description: "Unsigned 16-bit:\t" },
    { command: `${UINT32_MAX_VALUE}u`,  description: "Unsigned 32-bit:\t" },
    { command: `${UINT64_MAX_VALUE}ul`, description: "Unsigned 64-bit:\t" },
    {
        command: `${INT8_MAX_VALUE}b ${INT16_MAX_VALUE}s ${INT32_MAX_VALUE} ${INT64_MAX_VALUE}l ${UINT8_MAX_VALUE}ub ${UINT16_MAX_VALUE}us ${UINT32_MAX_VALUE}u ${UINT64_MAX_VALUE}ul`,
        description: "Display all:\t\t"
    },
] as const;

// TODO: remove the \t hack, make the result div be a table, do it properly
export const MIN_VALUES: readonly CommandEntry[] = [
    { command: `${INT8_MIN_VALUE}b`,  description: "Signed 8-bit:\t" },
    { command: `${INT16_MIN_VALUE}s`, description: "Signed 16-bit:\t" },
    { command: `${INT32_MIN_VALUE}`,  description: "Signed 32-bit:\t" },
    { command: `${INT64_MIN_VALUE}l`, description: "Signed 64-bit:\t" },
    {
        command: `${INT8_MIN_VALUE}b ${INT16_MIN_VALUE}s ${INT32_MIN_VALUE} ${INT64_MIN_VALUE}l`,
        description: "Display all:\t"
    },
] as const;