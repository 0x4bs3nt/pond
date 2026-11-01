import { useState } from 'react';
import { DataGrid, type CellPosition } from '../../components/data-grid';
import { theme } from '../../theme';
import type { TableView } from './types';

type TableBrowserProps = { table: TableView; width: number; height: number; focused: boolean; onFocus: () => void };

export const TableBrowser = ({ table, width, height, focused, onFocus }: TableBrowserProps) => {
    const [selection, setSelection] = useState<CellPosition>({ row: 0, column: 0 });

    const column = table.columns[selection.column];
    const row = table.rows[selection.row];
    const value = row?.cells[selection.column];

    return (
        <box width={width} height={height} flexDirection="column" overflow="hidden">
            <box height={2} flexShrink={0} backgroundColor={theme.panel} paddingLeft={1}>
                <text
                    height={1}
                    flexShrink={0}
                    wrapMode="none"
                    fg={theme.accent}
                    selectable={false}
                >{`▦  ${table.name}   /   public`}</text>
                <text height={1} flexShrink={0} wrapMode="none" fg={theme.border} selectable={false}>
                    {'─'.repeat(width - 1)}
                </text>
            </box>
            <text
                height={1}
                flexShrink={0}
                wrapMode="none"
                fg={theme.muted}
            >{` ${table.rows.length} rows  ·  ${table.columns.length} columns  ·  Read-only mock data`}</text>
            <DataGrid
                columns={table.columns}
                rows={table.rows}
                width={width}
                height={height - 6}
                focused={focused}
                selection={selection}
                onSelect={setSelection}
                onFocus={onFocus}
            />
            <text height={1} flexShrink={0} bg={theme.raised} fg={theme.accent} wrapMode="none">
                {row
                    ? ` Row ${selection.row + 1} / ${table.rows.length}  ·  ${column?.name}  ·  ${column?.type}`
                    : ' 0 rows · No cell selected'}
            </text>
            <box height={2} flexShrink={0} paddingLeft={1} backgroundColor={theme.panel} overflow="hidden">
                <text fg={theme.muted} wrapMode="char">
                    {row
                        ? `Value  ${value === null ? 'NULL' : value === '' ? "'' (empty text)" : (value ?? '')}`
                        : 'Select another table in the explorer.'}
                </text>
            </box>
        </box>
    );
};
