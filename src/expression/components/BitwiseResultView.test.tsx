import React from 'react';
import { render, screen, within } from '@testing-library/react';
import BitwiseResultView from './BitwiseResultView';
import { parser } from '../expression';

function renderResult(input: string, annotateTypes: boolean) {
    return render(<BitwiseResultView expression={parser.parse(input)!} emphasizeBytes={false} annotateTypes={annotateTypes} dimExtraBits={false} />);
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

describe('warnings', () => {
    it('show a triangle with the explanation on the row they are about', () => {
        renderResult('127b + 1b', false);

        const rows = screen.getAllByRole('row');
        expect(within(rows[2]).getByRole('img', { name: "Warning" })).toBeInTheDocument();
        expect(within(rows[0]).queryByRole('img', { name: "Warning" })).not.toBeInTheDocument();
        expect(within(rows[2]).getByText("Does not fit the type of its operands")).toBeInTheDocument();
        expect(within(rows[2]).getByText((_, e) => e?.tagName === 'P' && /stored back into an 8-bit signed integer it would be -128\./.test(e.textContent || ''))).toBeInTheDocument();
        expect(within(rows[0]).queryByText(/Does not fit/)).not.toBeInTheDocument();
    });

    it('list every warning of a row', () => {
        renderResult('1b << 40', false);

        const shift = screen.getAllByRole('row')[1];
        expect(within(shift).getByText("Shift count out of range")).toBeInTheDocument();
        expect(within(shift).getByText("Does not fit the type of its operand")).toBeInTheDocument();
    });

    it('show each value of the explanation in its own element', () => {
        renderResult('-1 + 1ul', false);

        const values = within(screen.getAllByRole('row')[0]).getAllByText(/^-?\d+$/, { selector: 'strong' }).map(e => e.textContent);
        expect(values).toEqual(['-1', '4294967295', '18446744073709551615']);
    });

    it('are absent where there is nothing to warn about', () => {
        renderResult('1 + 2', false);

        expect(screen.queryByText(/Overflow|Converted|Shift count|Does not fit|64-bit number/)).not.toBeInTheDocument();
    });
});
