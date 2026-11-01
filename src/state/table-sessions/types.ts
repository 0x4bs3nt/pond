import type { createTableSessionsStore } from './table-sessions-store';

export type PendingCell = { rowId: string; columnId: string; original: string | null; value: string | null };

export type PendingChanges = Readonly<Record<string, PendingCell>>;

export type TableSessionsState = {
    changes: Record<string, PendingChanges>;
    stage: (tableId: string, cell: PendingCell) => void;
    discard: (tableId: string) => void;
};

export type TableSessionsStore = ReturnType<typeof createTableSessionsStore>;
