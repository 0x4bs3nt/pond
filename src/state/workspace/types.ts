import type { createWorkspaceStore } from './workspace-store';

export type WorkspaceFocus = 'explorer' | 'grid';

export type WorkspaceState = {
    activeTableId: string | null;
    focus: WorkspaceFocus;
    editing: boolean;
    isEditing: () => boolean;
    setEditing: (editing: boolean) => void;
    openTable: (tableId: string) => void;
    focusPanel: (panel: WorkspaceFocus) => void;
    toggleFocus: () => void;
};

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
