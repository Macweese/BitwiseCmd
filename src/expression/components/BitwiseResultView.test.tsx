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
