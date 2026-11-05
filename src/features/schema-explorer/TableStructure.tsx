import { useState } from 'react';
import { DataGrid, type CellPosition } from '../../components/data-grid';
import { theme } from '../../theme';
import type { TableStructureProps } from './types';

const columns = [
    { id: 'name', name: 'Column', type: 'name', width: 24 },
    { id: 'type', name: 'Native type', type: 'type', width: 30 },
    { id: 'nullable', name: 'Nullable', type: 'boolean', width: 10 },
    { id: 'key', name: 'Key', type: 'position', width: 10 },
    { id: 'default', name: 'Default', type: 'expression', width: 40 },
    { id: 'generated', name: 'Generated', type: 'expression', width: 48 },
];

export const TableStructure = ({ schema, width, height, focused, onFocus }: TableStructureProps) => {
    const [selection, setSelection] = useState<CellPosition>({ row: 0, column: 0 });

    const rows = schema.columns.map((column) => ({
        id: column.id,
        cells: [
            column.name,
            column.nativeType,
            column.nullable ? 'yes' : 'no',
            schema.primaryKey.includes(column.id) ? `PK ${schema.primaryKey.indexOf(column.id) + 1}` : '',
            column.defaultExpression,
            column.identity
                ? `IDENTITY ${column.identity}`
                : column.generated
                  ? `${column.generated.kind}: ${column.generated.expression}`
                  : null,
        ],
    }));

    const value = rows[selection.row]?.cells[selection.column];

    return (
        <box width={width} height={height} flexDirection="column">
            <text height={1} flexShrink={0} fg={theme.accent} wrapMode="none">
                {` ${[...schema.table.namespace, schema.table.name].map((part) => JSON.stringify(part)).join('.')} · ${schema.table.kind}`}
            </text>
            <text
                height={1}
                flexShrink={0}
                fg={theme.muted}
            >{` ${schema.columns.length} columns · Structure only`}</text>
            <DataGrid
                columns={columns}
                rows={rows}
                width={width}
                height={height - 5}
                selection={selection}
                onSelect={setSelection}
                onFocus={onFocus}
                getInteraction={() => (focused ? 'focused' : 'unfocused')}
            />
            <text height={3} flexShrink={0} fg={theme.text} wrapMode="char">
                {rows.length
                    ? ` ${columns[selection.column]?.name}: ${value ?? '(none)'}`
                    : 'This relation has no columns.'}
            </text>
        </box>
    );
};
