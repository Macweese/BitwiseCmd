import React from 'react';
import CommandLink from '../../core/components/CommandLink';
import './WhatsNewResultView.css';

function WhatsNewResultView() {

    return <div className="changelog">
        <h3>Changelog</h3>
        <div className='item item-new'>
            <p>
                <span className="soft date">Unreleased</span> <br />
            </p>
            <ul>
                <li>
                    Expressions follow the operator precedence of C and Java and support parentheses, so{' '}
                    <code><CommandLink text="1 + 2 * 3" /></code> is 7 and <code><CommandLink text="(1 + 2) * 3" /></code> is 9.
                    Try: <span className="no-break"><code><CommandLink text="999 ^ ~((2 * (5 + 5) - 2 * 0x8a) + 100 << 1)" /></code></span>
                </li>
                <li>Added the remainder operator <code>%</code>: <code><CommandLink text="-7 % 3" /></code>.</li>
                <li>
                    Operations on unsigned 32- and 64-bit numbers keep their results unsigned (<a href="https://github.com/BorysLevytskyi/BitwiseCmd/issues/72">#72</a>),
                    and negative literals such as <code><CommandLink text="-1u" /></code> work inside expressions.
                </li>
                <li>
                    Bytes and shorts are promoted to 32-bit integers before an operation, as in C and Java, so{' '}
                    <code><CommandLink text="127b + 1b" /></code> is 128 and signed and unsigned ones can be mixed: <code><CommandLink text="255ub + 1b" /></code>.
                </li>
                <li>A number that does not fit its type, such as <code>200b</code>, is reported as an error instead of being shown with the wrong bits.</li>
                <li>
                    The prefix of a number sets its base: <code><CommandLink text="0x0b" /></code> is the hexadecimal 11,
                    and <code><CommandLink text="10b" /></code> is the decimal 10 as a byte.
                </li>
                <li>
                    A warning triangle marks what a program may do differently (an overflow, an automatic conversion, a shift count out of range)
                    and says how other languages treat it: <code><CommandLink text="2147483647 + 1" /></code>.
                    A negative unsigned number gets one too: <code><CommandLink text="-127ub" /></code> has the bits of -127, which are 129 as an unsigned byte.
                </li>
                <li>Errors in an expression point at the offending position.</li>
                <li>Four new themes: <CommandLink text="github" />, <CommandLink text="helix" />, <CommandLink text="emacs" /> and <CommandLink text="sakura" />.</li>
                <li>New commands: <CommandLink text="tip" /> for tips and trivia, <CommandLink text="max" /> and <CommandLink text="min" /> for the limits of the integer types, and <CommandLink text="incognito" /> to turn analytics tracking on or off.</li>
                <li>The cookie notice is a floating panel, the input box is centered, and results show the sign and the operator in their own columns.</li>
                <li>Long sessions stay fast: a new result no longer renders the other results again. The page keeps the last 500 results.</li>
                <li>The page downloads less JavaScript: the icons are part of the page, without the Font Awesome packages.</li>
                <li>
                    An expression can have at most 128 operators and 128 levels of parentheses, and a list at most 256 numbers or IP addresses.
                    A longer input gives an error, where before it could stop the page for seconds.
                </li>
                <li>A link to a result runs only commands that cannot change your settings. To use a command such as <code>dark</code> from a link, type it.</li>
            </ul>
        </div>
        <div className='item'>
            <p>
                <span className="soft date">Nov 28th, 2025</span> <br />
            </p>
            <ul>
                <li>Introduced a new <CommandLink text="graphite" /> theme inspired by industrial gradients.</li>
            </ul>
        </div>
        <div className='item'>
            <p>
                <span className="soft date">Nov 8th, 2025</span> <br />
            </p>
            <ul>
                <li>Expressions now support arithmetic operators alongside bitwise ones: <code>+</code>, <code>-</code>, <code>*</code>, and <code>/</code>.</li>
                <li>Try examples: <code><CommandLink text="15 + 3" /></code>, <code><CommandLink text="10 - 4" /></code>, <code><CommandLink text="3 * -5" /></code>, <code><CommandLink text="7 / 2 + 3" /></code>.</li>
            </ul>
        </div>
        <div className='item'>
            <p>
                <span className="soft date">Nov 6th, 2025</span> <br />
            </p>
            <ul>                
                <li>Introduced a Centered Layout option that centers content on wide monitors; you can revert to the stretched layout in <CommandLink text="settings" />.</li>
            </ul>
        </div>
        <div className='item'>
            <p>
                <span className="soft date">May 10th, 2023</span> <br />
            </p>
            <p>
                Behold! After a long time of inactivity, BitwiseCmd is getting an update. Here is what changed:
            </p>
            <ul>
                <li>The browser's JavaScript engine is no longer used for executing bitwise operations.
                    BitwiseCmd now has its own shiny, custom-built bitwise calculator that supports bitwise operations on integers of different sizes (8, 16, 32, and 64 bits), in both signed and unsigned variants. <CommandLink text='Check it out!' command='-1b 255ub -1 4294967295u -1l 18446744073709551615u' />&nbsp;
                    This calculator follows the behavior of bitwise operations as implemented in C, including edge cases.
                    For example, shifting an integer by a number of bits equal to its width is undefined behavior in C (see this <a href="https://codeyarns.com/tech/2004-12-20-c-shift-operator-mayhem.html#gsc.tab=0">link</a>).
                </li>
                <li>A slightly improved UI</li>
            </ul>
            <p>I'm sure there will be some bugs following such a big update. I will do my best to fix them as they are found.</p>
            <p>Many thanks to everyone who submitted issues on GitHub. Your feedback is greatly appreciated.</p>
        </div>
        <div className='item'>
            <span className="soft date">May 5th, 2023</span> <br />
            <p>
                Fixed a <a href="https://github.com/BorysLevytskyi/BitwiseCmd/issues/13">bug</a> with the binary representation of 64-bit numbers.
            </p>
        </div>
        <div className="item">
            <p><span className="soft date">Jul 24th, 2021</span> <br /></p>
            <ul>
                <li>Added support for the <code>vpc</code> command to see how the VPC network address bits are divided between the VPC, subnets, and hosts. Try it out: <CommandLink text="vpc 192.168.24.1/24" /></li>
                <li>Added the ability to remove individual results</li>
            </ul>
        </div>
        <div className="item">
            <span className="soft date">Jun 16th, 2021</span>
            <p>
                Added support for the <code>subnet</code> command to display subnet information (network address, broadcast address, etc.). Try it out: <CommandLink text="subnet 192.168.24.1/14" />
            </p>
        </div>
        <div className="item">
            <span className="soft date">Jun 14th, 2021</span>
            <p>
                Added support for IP addresses and subnet mask notation. Try them out:
            </p>
            <ul>
                <li>A single IP address <CommandLink text="127.0.0.1" /></li>
                <li>Multiple IP addresses and subnet mask notations <CommandLink text="127.0.0.1 192.168.0.0/24" /></li>
            </ul>

        </div>
        <div className="item">
            <span className="soft date">Jun 6th, 2017</span>
            <p>
                Added the <code><CommandLink text="guid" /></code> command. Use it to generate v4 GUIDs.</p>
        </div>
        <div className="item">
            <span className="soft date">May 27th, 2017</span>
            <p>
                Added support of binary number notation (e.g. <code><CommandLink text="0b10101" /></code>). </p>
        </div>
        <div className="item">
            <span className="soft">May 20th, 2017</span>
            <p>
                A new <CommandLink text="Midnight" /> theme was added.
            </p>
        </div>
        <div className="item">
            <span className="soft">May 16th, 2017</span>
            <p>
                Complete rewrite using React. Please let me know if you have problems with this release by <a href="https://github.com/BorysLevytskyi/BitwiseCmd/issues">creating an issue</a> in Github Repo.
            </p>
        </div>
    </div>;
}

export default WhatsNewResultView;
