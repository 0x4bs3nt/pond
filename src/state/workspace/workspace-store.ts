import { createStore } from 'zustand/vanilla';

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

// Create one store per workspace; importing this module never creates shared state.
export const createWorkspaceStore = (initialTableId: string | null = null) =>
    createStore<WorkspaceState>()((set, get) => ({
        activeTableId: initialTableId,
        focus: 'grid',
        editing: false,
        isEditing: () => get().editing,
        setEditing: (editing) => set({ editing }),
        openTable: (tableId) => {
            if (!get().editing) set({ activeTableId: tableId, focus: 'grid' });
        },
        focusPanel: (focus) => {
            if (!get().editing) set({ focus });
        },
        toggleFocus: () => {
            if (!get().editing) set((state) => ({ focus: state.focus === 'grid' ? 'explorer' : 'grid' }));
        },
    }));

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
