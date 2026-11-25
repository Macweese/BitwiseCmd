import React from 'react';
import './icons.css';

// Outline glyphs for this application, on a 24 px grid with a 2 px stroke. The font
// size gives their size. The text colour gives their colour, thus they obey the theme.
type GlyphProps = {
    label: string
};

export function WarningTriangleIcon({ label }: GlyphProps) {
    return (
        <svg className="glyph" viewBox="0 0 24 24" role="img" aria-label={label}
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.27 4.5 2.4 18a2 2 0 0 0 1.73 3h15.74a2 2 0 0 0 1.73-3L13.73 4.5a2 2 0 0 0-3.46 0Z" />
            <path d="M12 9.5v4.5" />
            <path d="M12 17.5h.01" />
        </svg>
    );
}
