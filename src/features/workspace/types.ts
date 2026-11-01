import type { TableSessionsStore } from '../../state/table-sessions';
import type { ReactNode } from 'react';
import type { WorkspaceStore } from '../../state/workspace';

export type StatusMode = 'editing' | 'grid' | 'explorer' | 'tabs';

export type WorkspaceProviderProps = { store: WorkspaceStore; children: ReactNode };

export type WorkspaceTabsProps = {
    tables: readonly { id: string; name: string }[];
    sessions: TableSessionsStore;
    width: number;
};
export type TabsKeyboardOptions = { onClose: (id: string) => void };
