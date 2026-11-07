import React from 'react';
import CommandLink from '../../core/components/CommandLink';
import './HelpResultView.css';
import { INT32_MAX_VALUE, INT32_MIN_VALUE } from '../../core/const';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import {
    COLOR_THEME_COMMANDS,
    OTHER_COMMANDS,
    ALL_OPERATORS,
    ARITHMETIC_OPERATORS,
    BITWISE_CALCULATION_COMMANDS,
    IP_NETWORK_COMMANDS,
    BITWISE_OPERATORS
} from "./helpData";
import {CommandTable} from "./CommandTable";
import TipResultView from "./TipResultView";

function HelpResultView() {

    return <div className="help helpResultTpl">
        <div className="panel-container">
            <div className="left-panel">
                <CommandTable title="Bitwise Calculation Commands" commands={BITWISE_CALCULATION_COMMANDS} />
                <CommandTable title="IP Address & Networking Commands" commands={IP_NETWORK_COMMANDS} />
                <CommandTable title="Color Theme Commands" commands={COLOR_THEME_COMMANDS} />
                <CommandTable title="Other Commands" commands={OTHER_COMMANDS} />
            </div>
            <div className="right-panel">
                <div className="section">
                    <div className="section-title soft">Supported Operations</div>
                    <table className="operators-table">
                        <thead className="sr-only">
                        <tr>
                            <th scope="col">Operator</th>
                            <th scope="col">Description</th>
                        </tr>
                        </thead>

                        <tbody>
                        {ALL_OPERATORS.map((op) => (
                            <tr key={op.symbol}>
                                <td className="operator-cell"> <code>{op.symbol}</code> </td>
                                <td> — {op.description} {op.note && <sup>{op.note}</sup>} </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <div className="important-note"><FontAwesomeIcon icon={faInfoCircle} size="lg" />
                        <div>
                            <a target='_blank' href='https://en.cppreference.com/w/c/language/operator_precedence' rel="noreferrer">Operator precedence</a>
                            {' '}is respected: expressions are <strong>not</strong> evaluated left-to-right.
                            <br/>
                            The order of operations follows C-style programming languages.
                        </div>
                    </div>
                    <div className="footnotes">
                        {BITWISE_OPERATORS.some((op) => op.note === "[1]") && (
                            <p>
                                <sup>[1]</sup> Shifts follow Java: the shift count is reduced modulo the width of the shifted operand, <strong>which includes negative counts</strong>.
                                For example <span className="no-break"><code>1 &lt;&lt; 5 * -1</code></span> is evaluated as <span className="no-break"><code>1 &lt;&lt; 27</code></span> for 32-bit integers.
                                In C and C++ a negative shift count, or one that is not smaller than the width, is undefined behaviour; Rust rejects such counts (its shift count is unsigned and an out-of-range count panics in debug builds).
                                Check the specification of your language to be sure.
                                <br/>
                                Learn more:
                                {' '}
                                <a target='_blank' rel='noreferrer' href='https://en.wikipedia.org/wiki/Arithmetic_shift'>Arithmetic shift</a>,
                                {' '}
                                <a target='_blank' rel='noreferrer' href='https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.19'>The Java Language Specification, §15.19</a>,
                                {' '}
                                <a target='_blank' rel='noreferrer' href='https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf'>ISO/IEC 9899:2011, §6.5.7</a>.
                            </p>
                        )}
                        {ARITHMETIC_OPERATORS.some((op) => op.note === "[2]") && (
                            <p>
                                <sup>[2]</sup> “Truncates toward zero” means the fractional part is discarded and the quotient is rounded toward 0.
                                For example: <span className="no-break"><code>7/2 = 3</code></span>, <span className="no-break"><code>-7/2 = -3</code></span>.
                                <br/>
                                Learn more:
                                {' '}
                                <a target='_blank' rel='noreferrer' href='https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Division#bigint_division'>JS BigInt division</a>,
                                {' '}
                                <a target='_blank' rel='noreferrer' href='https://en.cppreference.com/w/c/language/operator_arithmetic#Integer_arithmetic'>C integer division</a>.
                            </p>
                        )}
                        {ARITHMETIC_OPERATORS.some((op) => op.note === "[3]") && (
                            <p>
                                <sup>[3]</sup> The implementation of the remainder operator (not to be confused with{' '}
                                <a target='_blank' rel='noreferrer' href='https://en.wikipedia.org/wiki/Modular_arithmetic'>modular arithmetic</a>)
                                uses{' '}
                                <a target='_blank' rel='noreferrer' href='https://en.wikipedia.org/wiki/Modulo#Variants_of_the_definition'>truncated division</a>:
                                the remainder takes the sign of the dividend, so that <span className="no-break"><code>a == (a / b) * b + a % b</code></span> always holds.
                                For example: <span className="no-break"><code>-7 % 3 = -1</code></span>, <span className="no-break"><code>7 % -3 = 1</code></span>.
                                <br/>
                                Learn more:
                                {' '}
                                <a target='_blank' rel='noreferrer' href='https://en.wikipedia.org/wiki/Modulo'>Modulo (remainder)</a>,
                                {' '}
                                <a target='_blank' rel='noreferrer' href='https://en.cppreference.com/w/cpp/language/operator_arithmetic.html'>C++ Reference: Arithmetic Operators</a>.
                            </p>
                        )}
                    </div>
                </div>
                <div className="section soft-border">
                    <div className="section-title soft">Supported Number Types</div>
                    <p>
                    BitwiseCmd no longer uses the browser's JavaScript engine for the execution of bitwise operations. It has its own calculator implementation which supports bitwise operations on the following <i>signed</i> and <i>unsigned</i> data types:
                    </p>
                    <ul>
                        <li><code>8-bit integer</code> - a.k.a Byte. Numbers entered with <code>b</code> or <code>ub</code> suffixes for signed and unsigned versions respectively <span className="no-break">(e.g. <code><CommandLink text='10b 10ub' /></code>)</span>.</li>
                        <li><code>16-bit integer</code> - a.k.a Short. Numbers entered with <code>s</code> or <code>us</code> suffixes for signed and unsigned versions respectively <span className="no-break">(e.g. <code><CommandLink text='10s 10us' /></code>)</span>.</li>
                        <li><code>32-bit integer</code> - numbers entered without suffixes that fall in range of {INT32_MIN_VALUE} and {INT32_MAX_VALUE}. Use <code>u</code> suffix to denote an unsigned version of 32-bit integer. This is a default number type.</li>
                        <li><code>64-bit integer</code> - a.k.a Long. Numbers entered without suffixes and exceed the 32-bit range or entered with <code>l</code> and <code>ul</code> suffixes for signed and unsigned versions respectively <span className="no-break">(e.g. <code><CommandLink text='10l 10ul' /></code>)</span>.</li>
                    </ul>
                </div>
                <div className="section">
                    <strong className="section-title soft">Tip</strong>
                    <TipResultView></TipResultView>
                </div>
            </div>
        </div>
    </div>;
}

export default HelpResultView;

