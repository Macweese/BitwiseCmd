import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BitwiseResultView from './BitwiseResultView';
import { parser } from '../expression';

function renderResult(input: string, annotateTypes: boolean, bytePadding: boolean = false) {
    return render(<BitwiseResultView expression={parser.parse(input)!} annotateTypes={annotateTypes} bytePadding={bytePadding} />);
}

// The type annotation of each row, for example "8-bit signed"
function annotations(input: string): string[] {
    const { unmount } = renderResult(input, true);

    const sizes = screen.getAllByTitle(/^BitwiseCmd treats this number as/).map(e => e.textContent);
    const signs = screen.getAllByText(/^(un)?signed$/).map(e => (e.textContent || '').trim());
    unmount();

    return sizes.map((size, i) => `${size} ${signs[i]}`);
}

describe('type annotations', () => {
    it('show the type of a number as it was typed', () => {
        expect(annotations('1b 2us 3 4ul')).toEqual(['8-bit signed', '16-bit unsigned', '32-bit signed', '64-bit unsigned']);
    });

    it('mark the operands that were promoted to int', () => {
        expect(annotations('127b + 1b')).toEqual(['32-bit (promoted) signed', '32-bit (promoted) signed', '32-bit signed']);
        expect(annotations('1ub << 8')).toEqual(['32-bit (promoted) signed', '32-bit signed']);
        expect(annotations('~5s')).toEqual(['32-bit (promoted) signed', '32-bit (promoted) signed', '32-bit signed']);
    });

    it('mark the operand that was converted to the type of the other', () => {
        expect(annotations('1b + 2')).toEqual(['32-bit (converted) signed', '32-bit signed', '32-bit signed']);
        expect(annotations('1 + 2l')).toEqual(['64-bit (converted) signed', '64-bit signed', '64-bit signed']);
    });

    it('explain the promotion in the tooltip', () => {
        renderResult('127b + 1b', true);

        expect(screen.getAllByTitle(/promoted to a 32-bit signed integer before an operation/)).toHaveLength(2);
    });
});

it('pads every row to the same number of bits', () => {
    renderResult('-1b + 1', false);

    // The third cell of a row contains its bits
    const widths = screen.getAllByRole('row').map(row => (within(row).getAllByRole('cell')[2].textContent || '').length);
    expect(widths).toEqual([32, 32, 32]);
});

describe('bits of a row', () => {
    // The elements of the bits of a row, from the left
    const bitsOf = (row: HTMLElement) => within(row).getAllByText(/^[01]$/, { selector: 'span' });
    const textOf = (row: HTMLElement) => bitsOf(row).map(bit => bit.textContent).join('');

    it('are only the bits of the number when the padding of bytes is off', () => {
        renderResult('5', false);

        expect(textOf(screen.getByRole('row'))).toBe('101');
    });

    it('fill the number up to full bytes, and mark the added bits for the stylesheet', () => {
        renderResult('5 1000', false, true);

        const [five, thousand] = screen.getAllByRole('row').map(bitsOf);
        expect(five.map(bit => bit.textContent).join('')).toBe('0000000000000101');
        expect(thousand.map(bit => bit.textContent).join('')).toBe('0000001111101000');
        // 1000 has 10 bits. Thus the 6 bits at the left are the padding of the two rows.
        [five, thousand].forEach(bits => {
            expect(bits.map(bit => bit.classList.contains('byte-padding'))).toEqual([...Array(6).fill(true), ...Array(10).fill(false)]);
        });
    });

    it('have no padding of bytes when the types are shown', () => {
        renderResult('5b', true, true);

        const bits = bitsOf(screen.getByRole('row'));
        expect(bits).toHaveLength(8);
        expect(bits.filter(bit => bit.classList.contains('byte-padding'))).toHaveLength(0);
    });

    it('flip when the user clicks them', () => {
        renderResult('5', false);

        fireEvent.click(bitsOf(screen.getByRole('row'))[2]);
        expect(textOf(screen.getByRole('row'))).toBe('100');

        fireEvent.click(bitsOf(screen.getByRole('row'))[1]);
        expect(textOf(screen.getByRole('row'))).toBe('110');
    });

    it('flip also in the padding of bytes', () => {
        renderResult('5', false, true);

        fireEvent.click(bitsOf(screen.getByRole('row'))[0]);

        expect(textOf(screen.getByRole('row'))).toBe('10000101');
        expect(within(screen.getByRole('row')).getByText('133')).toBeInTheDocument();
    });

    it('do not flip in a row that shows a result', () => {
        renderResult('1 | 2', false);

        const result = screen.getAllByRole('row')[2];
        fireEvent.click(bitsOf(result)[1]);

        expect(textOf(result)).toBe('11');
    });

    it('have one click handler for the row, not one for each bit', () => {
        renderResult('5', false);

        // React sets the onclick property of an element that has a click handler
        const bits = bitsOf(screen.getByRole('row'));
        expect(bits.filter(bit => bit.onclick !== null)).toHaveLength(0);
    });
});

describe('warnings', () => {
    // The explanation is in the document only while the pointer is on the triangle
    function pointAtWarning(row: HTMLElement) {
        fireEvent.mouseEnter(within(row).getByRole('img', { name: "Warning" }));
    }

    it('show a triangle with the explanation on the row they are about', () => {
        renderResult('127b + 1b', false);

        const rows = screen.getAllByRole('row');
        expect(within(rows[0]).queryByRole('img', { name: "Warning" })).not.toBeInTheDocument();
        expect(within(rows[1]).queryByRole('img', { name: "Warning" })).not.toBeInTheDocument();

        pointAtWarning(rows[2]);
        expect(within(rows[2]).getByText("Does not fit the type of its operands")).toBeInTheDocument();
        expect(within(rows[2]).getByText((_, e) => e?.tagName === 'P' && /stored back into an 8-bit signed integer it would be -128\./.test(e.textContent || ''))).toBeInTheDocument();
    });

    it('do not show the explanation before the pointer is on the triangle', () => {
        renderResult('127b + 1b', false);

        expect(screen.queryByText(/Does not fit/)).not.toBeInTheDocument();
    });

    it('list every warning of a row', () => {
        renderResult('1b << 40', false);

        const shift = screen.getAllByRole('row')[1];
        pointAtWarning(shift);
        expect(within(shift).getByText("Shift count out of range")).toBeInTheDocument();
        expect(within(shift).getByText("Does not fit the type of its operand")).toBeInTheDocument();
    });

    it('show each value of the explanation in its own element', () => {
        renderResult('-1 + 1ul', false);

        pointAtWarning(screen.getAllByRole('row')[0]);
        const values = within(screen.getAllByRole('row')[0]).getAllByText(/^-?\d+$/, { selector: 'strong' }).map(e => e.textContent);
        expect(values).toEqual(['-1', '4294967295', '18446744073709551615']);
    });

    it('are absent where there is nothing to warn about', () => {
        renderResult('1 + 2', false);

        expect(screen.queryByRole('img', { name: "Warning" })).not.toBeInTheDocument();
    });
});
