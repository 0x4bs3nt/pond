import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { CellPosition } from '../../components/data-grid';
import { cellKey, emptyChanges, type TableSessionsStore } from '../../state/table-sessions';
import { useWorkspace } from '../workspace';
import type { TableView } from './types';
import { useTableBrowserKeyboard } from './use-table-browser-keyboard';
import { useDiagnosticActions } from '../diagnostics';

export const useTableEditing = (table: TableView, store: TableSessionsStore, focused: boolean) => {
    const diagnostics = useDiagnosticActions();
    const changes = useStore(store, (state) => state.changes[table.id] ?? emptyChanges);
    const setEditing = useWorkspace((state) => state.setEditing);
    const isActive = useWorkspace((state) => state.isActive);
    const isEditing = useWorkspace((state) => state.isEditing);

    const [editor, setEditor] = useState<CellPosition | null>(null);
    const editorRef = useRef<CellPosition | null>(null);

    useEffect(() => () => setEditing(false), [setEditing]);

    const rows = useMemo(
        () =>
            table.rows.map((row) => {
                const modifiedColumns: string[] = [];
                const cells = table.columns.map((column, index) => {
                    const change = changes[cellKey(row.id, column.id)];
                    if (change) modifiedColumns.push(column.id);
                    return change ? change.value : (row.cells[index] ?? null);
                });

                return modifiedColumns.length ? { ...row, cells, modifiedColumns } : row;
            }),
        [table, changes]
    );

    const canEdit = (position: CellPosition) => {
        const row = table.rows[position.row];
        const column = table.columns[position.column];
        return !!row && !!column && !row.readOnlyColumns?.includes(column.id);
    };

    const open = (position: CellPosition) => {
        if (!isActive() || isEditing() || !canEdit(position)) return;
        diagnostics.mark('editing');

        editorRef.current = position;
        setEditing(true);
        setEditor(position);
    };

    const cancel = () => {
        if (editorRef.current) diagnostics.mark('editing');
        editorRef.current = null;
        setEditor(null);
        setEditing(false);
    };

    const confirm = (value: string | null) => {
        const position = editorRef.current;
        if (!position || !canEdit(position)) return;

        const row = table.rows[position.row];
        const column = table.columns[position.column];

        if (row && column)
            store.getState().stage(table.id, {
                rowId: row.id,
                columnId: column.id,
                original: row.cells[position.column] ?? null,
                value,
            });
        cancel();
    };

    useTableBrowserKeyboard({
        focused,
        isActive,
        isEditing,
        onDiscard: () => store.getState().discard(table.id),
    });

    return { rows, count: Object.keys(changes).length, editor, open, cancel, confirm, isEditing, canEdit };
};
