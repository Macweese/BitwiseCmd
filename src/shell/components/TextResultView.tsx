import React from 'react';
import {CommandEntry} from "./helpData";
import CommandLink from "../../core/components/CommandLink";

interface TextResultViewProps {
    text: string | readonly CommandEntry[];
    asCode?: boolean;
    className?: string;
}

function isCommandEntryArray(value: string | readonly CommandEntry[]): value is readonly CommandEntry[] {
    return Array.isArray(value);
}

function TextResultView({ text, asCode = false, className = '' }: TextResultViewProps) {
    let content: React.ReactNode;

    if (isCommandEntryArray(text)) {
        content = (
            <div className="values-list">
                {text.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1ch', marginBottom: '0.3em' }}>
                        <span style={{ whiteSpace: 'pre' }}>{entry.description ?? ''}</span>
                        <code><CommandLink text={Array.isArray(entry.command) ? entry.command[0] : entry.command}/></code>
                    </div>
                ))}
            </div>
        );
    } else {
        content = asCode ? <code>{text}</code> : text;
    }

    return <span className={`text-result-view ${className}`}>{content}</span>;
}

export default TextResultView;