import React from 'react';
import { render, screen, within } from '@testing-library/react';
import BitwiseResultView from './BitwiseResultView';
import { parser } from '../expression';

function renderResult(input: string, annotateTypes: boolean) {
    return render(<BitwiseResultView expression={parser.parse(input)!} emphasizeBytes={false} annotateTypes={annotateTypes} dimExtraBits={false} />);
}

it('pads every row to the same number of bits', () => {
    renderResult('-1b + 1', false);

    // The third cell of a row contains its bits
    const widths = screen.getAllByRole('row').map(row => (within(row).getAllByRole('cell')[2].textContent || '').length);
    expect(widths).toEqual([32, 32, 32]);
});
