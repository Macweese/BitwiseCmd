import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import IconWithToolTip, { getTooltipPosition } from './IconWithTooltip';

const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height } as DOMRect);

const viewport = { width: 1000, height: 800 };
const tooltip = { width: 300, height: 100 };

function mountIcon() {
    render(<IconWithToolTip icon={<svg role="img" aria-label="Help" />}><p>The text</p></IconWithToolTip>);
    return screen.getByRole('img', { name: "Help" });
}

describe('tooltip position', () => {
    it('is to the right of the icon', () => {
        expect(getTooltipPosition(rect(100, 200, 20, 20), tooltip, viewport)).toEqual({ left: 125, top: 200 });
    });

    it('is to the left of the icon if there is no room on the right', () => {
        expect(getTooltipPosition(rect(900, 200, 20, 20), tooltip, viewport)).toEqual({ left: 595, top: 200 });
    });

    it('stays in the viewport if there is no room on the two sides', () => {
        expect(getTooltipPosition(rect(200, 200, 20, 20), tooltip, { width: 400, height: 800 })).toEqual({ left: 90, top: 200 });
    });

    it('goes up if there is no room below', () => {
        expect(getTooltipPosition(rect(100, 750, 20, 20), tooltip, viewport)).toEqual({ left: 125, top: 670 });
    });

    it('goes above the row if it is to the left of the icon', () => {
        expect(getTooltipPosition(rect(900, 750, 20, 20), tooltip, viewport)).toEqual({ left: 595, top: 645 });
    });

    it('does not go above the top of the viewport', () => {
        expect(getTooltipPosition(rect(100, 90, 20, 20), { width: 300, height: 120 }, { width: 1000, height: 100 })).toEqual({ left: 125, top: 10 });
    });
});

describe('tooltip', () => {
    it('is not in the document before the pointer is on the icon', () => {
        mountIcon();

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        expect(screen.queryByText("The text")).not.toBeInTheDocument();
    });

    it('shows when the pointer is on the icon', () => {
        const icon = mountIcon();

        fireEvent.mouseEnter(icon);

        expect(screen.getByRole('tooltip')).toHaveTextContent("The text");
    });

    it('goes away when the pointer goes away', () => {
        const icon = mountIcon();

        fireEvent.mouseEnter(icon);
        fireEvent.mouseLeave(icon);

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('goes away when the user presses Escape', () => {
        const icon = mountIcon();

        fireEvent.mouseEnter(icon);
        fireEvent.keyDown(document, { key: 'Enter' });
        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('goes away when the page scrolls', () => {
        const icon = mountIcon();

        fireEvent.mouseEnter(icon);
        fireEvent.scroll(document.body);

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('has a position in the viewport', () => {
        const icon = mountIcon();

        fireEvent.mouseEnter(icon);

        // jsdom has no layout: the rectangles of the icon and the tooltip are empty
        expect(screen.getByRole('tooltip')).toHaveStyle({ left: '5px', top: '0px' });
    });

    it('accepts an icon of the icon font', () => {
        render(<IconWithToolTip icon={faCircleQuestion}><p>The text</p></IconWithToolTip>);

        fireEvent.mouseEnter(screen.getByRole('img', { hidden: true }));

        expect(screen.getByRole('tooltip')).toHaveTextContent("The text");
    });
});

describe('tooltip in a browser with popovers', () => {
    type WithPopover = { showPopover?: () => void };
    const prototype = HTMLElement.prototype as WithPopover;
    const showPopover = jest.fn();

    beforeEach(() => { prototype.showPopover = showPopover; });
    afterEach(() => { delete prototype.showPopover; showPopover.mockClear(); });

    it('opens in the top layer', () => {
        const icon = mountIcon();

        fireEvent.mouseEnter(icon);

        expect(screen.getByRole('tooltip')).toHaveAttribute('popover', 'manual');
        expect(showPopover).toHaveBeenCalledTimes(1);
    });
});

describe('tooltip in a browser without popovers', () => {
    it('opens in its place', () => {
        const icon = mountIcon();

        fireEvent.mouseEnter(icon);

        expect(screen.getByRole('tooltip')).not.toHaveAttribute('popover');
    });
});
