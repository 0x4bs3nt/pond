import type { createWorkspaceStore } from './workspace-store';

export type WorkspaceFocus = 'explorer' | 'grid' | 'tabs';

export type WorkspaceState = {
    isActive: () => boolean;
    openTableIds: readonly string[];
    activeTableId: string | null;
    focus: WorkspaceFocus;
    editing: boolean;
    isEditing: () => boolean;
    setEditing: (editing: boolean) => void;
    openTable: (tableId: string) => void;
    activateTab: (tableId: string) => void;
    closeTab: (tableId: string) => void;
    focusPanel: (panel: WorkspaceFocus) => void;
    toggleFocus: (reverse?: boolean) => void;
};

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
