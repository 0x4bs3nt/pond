import { useRef, useState } from 'react';
import { DataGrid, type CellPosition, type GridInteraction } from '../../components/data-grid';
import { CellEditor } from '../../components/editors';
import { theme } from '../../theme';
import type { TableBrowserProps } from './types';
import { useTableEditing } from './use-table-editing';
import { useWorkspace } from '../workspace';
import { useDiagnosticActions } from '../diagnostics';

export const TableBrowser = ({ table, sessions, width, height, focused, onFocus }: TableBrowserProps) => {
    const [selection, setSelection] = useState<CellPosition>({ row: 0, column: 0 });
    const latestSelection = useRef(selection);
    latestSelection.current = selection;
    const isActive = useWorkspace((state) => state.isActive);
    const editing = useTableEditing(table, sessions, focused);
    const diagnostics = useDiagnosticActions();

    const getGridInteraction = (): GridInteraction => {
        if (!isActive() || editing.isEditing()) return 'disabled';

        return focused ? 'focused' : 'unfocused';
    };

    const column = table.columns[selection.column];
    const row = editing.rows[selection.row];
    const value = row?.cells[selection.column];
    const editorColumn = editing.editor ? table.columns[editing.editor.column] : undefined;
    const editorValue = editing.editor
        ? (editing.rows[editing.editor.row]?.cells[editing.editor.column] ?? null)
        : null;

    return (
        <box width={width} height={height} flexDirection="column" overflow="hidden">
            <box height={2} flexShrink={0} backgroundColor={theme.panel} paddingLeft={1}>
                <text
                    height={1}
                    flexShrink={0}
                    wrapMode="none"
                    fg={theme.accent}
                    selectable={false}
                >{`▦  ${table.name}${table.namespace ? `   /   ${table.namespace}` : ''}`}</text>
                <text height={1} flexShrink={0} wrapMode="none" fg={theme.border} selectable={false}>
                    {'─'.repeat(width - 1)}
                </text>
            </box>
            <text
                height={1}
                flexShrink={0}
                wrapMode="none"
                fg={theme.muted}
            >{` ${table.rows.length} rows · ${editing.count} pending cells · Mock data`}</text>
            <DataGrid
                columns={table.columns}
                rows={editing.rows}
                width={width}
                height={height - 6}
                getInteraction={getGridInteraction}
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
                onEdit={editing.open}
            />
            <text height={1} flexShrink={0} bg={theme.raised} fg={theme.accent} wrapMode="none">
                {row
                    ? ` Row ${selection.row + 1} / ${table.rows.length}  ·  ${column?.name}  ·  ${column?.type}${editing.canEdit(selection) ? '' : ' · Read-only'}`
                    : ' 0 rows · No cell selected'}
            </text>
            <box height={2} flexShrink={0} paddingLeft={1} backgroundColor={theme.panel} overflow="hidden">
                <text fg={theme.muted} wrapMode="char">
                    {row
                        ? `Value  ${value === null ? 'NULL' : value === '' ? "'' (empty text)" : (value ?? '')}`
                        : 'Select another table in the explorer.'}
                </text>
            </box>
            {editing.editor && editorColumn && (
                <CellEditor
                    onContentEdited={diagnostics.nativeEdit}
                    label={editorColumn.name}
                    value={editorValue}
                    multiline={
                        editorColumn.type === 'text' ||
                        editorColumn.type.startsWith('json') ||
                        Boolean(editorValue?.includes('\n'))
                    }
                    json={editorColumn.type.startsWith('json')}
                    width={width}
                    height={height - 3}
                    onConfirm={editing.confirm}
                    onCancel={editing.cancel}
                />
            )}
        </box>
    );
};
