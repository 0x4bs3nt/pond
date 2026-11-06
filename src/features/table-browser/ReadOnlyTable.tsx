import { useMemo, useRef, useState } from 'react';
import { DataGrid, type CellPosition } from '../../components/data-grid';
import { useDiagnosticActions } from '../diagnostics';
import { theme } from '../../theme';
import { presentTable } from './present-table';
import type { ReadOnlyTableProps } from './types';

export const ReadOnlyTable = ({ data, width, height, focused, isActive, onFocus }: ReadOnlyTableProps) => {
    const table = useMemo(() => presentTable(data, {}), [data]);

    const [selection, setSelection] = useState<CellPosition>({ row: 0, column: 0 });
    const latestSelection = useRef(selection);

    latestSelection.current = selection;

    const diagnostics = useDiagnosticActions();

    const column = table.columns[selection.column];
    const row = table.rows[selection.row];
    const value = row?.cells[selection.column];

    return (
        <box width={width} height={height} flexDirection="column">
            <text height={1} flexShrink={0} fg={theme.accent} wrapMode="none">
                {` ${[...data.schema.table.namespace, table.name].map((part) => JSON.stringify(part)).join('.')} · Read-only`}
            </text>
            <text height={1} flexShrink={0} fg={theme.muted} wrapMode="none">
                {` First ${table.rows.length} rows${data.page.hasMore ? ' · More rows available' : ''} · ${table.columns.length} columns`}
            </text>
            <DataGrid
                columns={table.columns}
                rows={table.rows}
                width={width}
                height={height - 5}
                selection={selection}
                onSelect={(position) => {
                    if (
                        position.row !== latestSelection.current.row ||
                        position.column !== latestSelection.current.column
                    ) {
                        diagnostics.mark('navigation');
                        latestSelection.current = position;
                        setSelection(position);
                    }
                }}
                onFocus={onFocus}
                getInteraction={() => (!isActive() ? 'disabled' : focused ? 'focused' : 'unfocused')}
            />
            <text height={1} flexShrink={0} fg={theme.accent} wrapMode="none">
                {column ? ` ${column.name} · ${column.type}` : ' No columns'}
            </text>
            <text height={2} flexShrink={0} fg={theme.text} wrapMode="char">
                {row
                    ? ` Value: ${value === null ? 'NULL' : value === '' ? "'' (empty text)" : (value ?? '')}`
                    : 'No rows returned.'}
            </text>
        </box>
    );
};
