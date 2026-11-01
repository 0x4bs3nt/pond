import { createStore } from 'zustand/vanilla';

export type PendingCell = { rowId: string; columnId: string; original: string | null; value: string | null };
export type PendingChanges = Readonly<Record<string, PendingCell>>;
export const cellKey = (rowId: string, columnId: string) => JSON.stringify([rowId, columnId]);
export const emptyChanges: PendingChanges = Object.freeze({});

type TableSessionsState = {
    changes: Record<string, PendingChanges>;
    stage: (tableId: string, cell: PendingCell) => void;
    discard: (tableId: string) => void;
};

// Fetched rows never enter this store; each entry is an overlay keyed by stable identities.
export const createTableSessionsStore = () =>
    createStore<TableSessionsState>()((set) => ({
        changes: {},
        stage: (tableId, cell) =>
            set((state) => {
                const changes = { ...state.changes[tableId] };
                const key = cellKey(cell.rowId, cell.columnId);
                const original = changes[key] ? changes[key].original : cell.original;

                if (cell.value === original) delete changes[key];
                else changes[key] = { ...cell, original };

                return { changes: { ...state.changes, [tableId]: changes } };
            }),
        discard: (tableId) => set((state) => ({ changes: { ...state.changes, [tableId]: emptyChanges } })),
    }));

export type TableSessionsStore = ReturnType<typeof createTableSessionsStore>;
