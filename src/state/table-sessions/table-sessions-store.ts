import { createStore } from 'zustand/vanilla';
import type { PendingChanges, TableSessionsState } from './types';

export const cellKey = (rowId: string, columnId: string) => JSON.stringify([rowId, columnId]);
export const emptyChanges: PendingChanges = Object.freeze({});

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
