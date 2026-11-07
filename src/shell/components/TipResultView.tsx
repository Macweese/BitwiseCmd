import React, { useMemo } from 'react';
import { HELPFUL_TIPS } from './helpData';

// Remembered across invocations of the command, so that the same tip is not shown twice in a row
let previousTipIndex = -1;

export default function TipResultView() {
    const tip = useMemo(() => {
        let index: number;
        do {
            index = Math.floor(Math.random() * HELPFUL_TIPS.length);
        } while (HELPFUL_TIPS.length > 1 && index === previousTipIndex);

        previousTipIndex = index;
        return HELPFUL_TIPS[index];
    }, []);

    return (
        <div className="help tip-result">
            <div className="section">
                {tip.content}
            </div>
        </div>
    );
}