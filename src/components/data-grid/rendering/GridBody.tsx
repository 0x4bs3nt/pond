import { theme } from '../../../theme';
import type { PositionedColumn } from '../layout';
import type { CellPosition, GridRow } from '../types';
import { GridCell } from './GridCell';

type GridBodyProps = {
    columns: readonly PositionedColumn[];
    rows: readonly GridRow[];
    top: number;
    left: number;
    width: number;
    height: number;
    gutter: number;
    selection: CellPosition;
    focused: boolean;
    onSelect: (position: CellPosition) => void;
};

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
                    <box key={row.id} height={1} flexShrink={0} flexDirection="row">
                        <text
                            width={gutter}
                            height={1}
                            selectable={false}
                            fg={selection.row === rowIndex ? theme.accent : theme.muted}
                        >
                            {String(rowIndex + 1).padStart(4) + '  '}
                        </text>
                        <box
                            width={width}
                            height={1}
                            flexShrink={0}
                            overflow="hidden"
                            backgroundColor={rowIndex % 2 ? theme.stripe : theme.background}
                        >
                            {columns.map((column) => (
                                <GridCell
                                    key={column.id}
                                    value={row.cells[column.index]}
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
