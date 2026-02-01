// components/TipResultView.tsx
import React, { useMemo, useRef } from 'react';
import { HELPFUL_TIPS } from './helpData';           // adjust path if needed

export default function TipResultView() {
    const prevIndexRef = useRef<number | null>(null);

    // Only run once, per mount, and never show the same tip twice in a row
    const tip = useMemo(() => {
        const len = HELPFUL_TIPS.length;
        if (len <= 1) {
            return HELPFUL_TIPS[0] ?? { content: "No tips available — Please open an issue about this on Github!" };
        }

        let newIndex: number;
        do {
            newIndex = Math.floor(Math.random() * len);
        } while (newIndex === prevIndexRef.current);

        prevIndexRef.current = newIndex;

        return HELPFUL_TIPS[newIndex];
    }, []);

    return (
        <div className="help tip-result">
            <div className="section">
                {tip.content}
            </div>

            {/* Optional hint */}
            {/* <div className="text-sm opacity-70 mt-4">
                Type <code>tip</code> again for another one.
            </div> */}
        </div>
    );
}