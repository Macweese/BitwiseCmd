import React from 'react';
import CommandLink from '../../core/components/CommandLink';
import { CommandEntry } from "./helpData";

type CommandTableProps = {
    title?: string;
    commands: readonly CommandEntry[];
    className?: string;
};

export function CommandTable({ title, commands, className = "" }: CommandTableProps) {
    return (
        <div className={`section ${className}`}>
            {title && <div className="section-title soft">{title}</div>}

            <table className="commands-table">
                <thead className="sr-only">
                <tr>
                    <th scope="col">Command</th>
                    <th scope="col">Description</th>
                </tr>
                </thead>

                <tbody>
                {commands.flatMap((item) => {
                    // Normalize to array in all cases
                    const commands = Array.isArray(item.command)
                        ? item.command
                        : [item.command];

                    return commands.map((cmd, index) => (
                        <tr key={`${item.description}-${cmd}-${index}`}>
                            <td className="command-cell"><code><CommandLink text={cmd} /></code></td>
                            {/* Spacer only on the first command of the group */}
                            <td className="command-cell-spacer"> {index === 0 ? "—" : ""} </td>
                            <td className="command-desc">
                                {/* Only show description + extra on the first row of the group */}
                                {index === 0 && (
                                    <>
                                        {item.description}
                                        {item.extraContent}
                                    </>
                                )}
                            </td>
                        </tr>
                    ));
                })}
                </tbody>
            </table>

        </div>
    );
}
