import { theme } from '../../../theme';
import type { GridBodyProps } from '../types';
import { GridCell } from './GridCell';

// Stateless viewport slots reuse native nodes as logical rows and columns scroll past.
export const GridBody = ({
    columns,
    rows,
    top,
    left,
    width,
    height,
    gutter,
    selection,
    focused,
    onSelect,
}: GridBodyProps) => (
    <box height={height} flexShrink={0} flexDirection="column">
        {rows.length === 0 ? (
            <box height={height} padding={1}>
                <text fg={theme.muted}>No rows. This table is empty.</text>
            </box>
        ) : (
            rows.map((row, index) => {
                const rowIndex = top + index;

                return (
                    <box key={index} height={1} flexShrink={0} flexDirection="row">
                        <text
                            width={gutter}
                            flexShrink={0}
                            height={1}
                            selectable={false}
                            fg={selection.row === rowIndex ? theme.accent : theme.muted}
                        >
                            {String(rowIndex + 1).padStart(gutter - 2) + '  '}
                        </text>
                        <box
                            width={width}
                            height={1}
                            flexShrink={0}
                            overflow="hidden"
                            backgroundColor={rowIndex % 2 ? theme.stripe : theme.background}
                        >
                            {columns.map((column, slot) => (
                                <GridCell
                                    key={slot}
                                    value={row.cells[column.index]}
                                    modified={row.modifiedColumns?.includes(column.id)}
                                    left={column.left - left}
                                    width={column.width}
                                    selected={selection.row === rowIndex && selection.column === column.index}
                                    focused={focused}
                                    onSelect={() => onSelect({ row: rowIndex, column: column.index })}
                                />
                            ))}
                        </box>
                    </box>
                );
            })
        )}
    </box>
);
