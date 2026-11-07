import React from 'react';
import {CommandEntry} from "./helpData";
import CommandLink from "../../core/components/CommandLink";

interface TextResultViewProps {
    text: string | readonly CommandEntry[];
    asCode?: boolean;
    className?: string;
}

function TextResultView({ text, asCode = false, className = '' }: TextResultViewProps) {

    // A list of labelled commands (for example the max and min values of the integer types)
    if (typeof text !== 'string') {
        const entries = text;
        return <table className={`values-list ${className}`}>
            <tbody>
                {entries.map((entry, i) => (
                    <tr key={i}>
                        <td className="values-list-label">{entry.description ?? ''}</td>
                        <td><code><CommandLink text={Array.isArray(entry.command) ? entry.command[0] : entry.command as string}/></code></td>
                    </tr>
                ))}
            </tbody>
        </table>;
    }

    return <span className={`text-result-view ${className}`}>{asCode ? <code>{text}</code> : text}</span>;
}

export default TextResultView;
