import { createStore } from 'zustand/vanilla';

export type WorkspaceFocus = 'explorer' | 'grid';

export type WorkspaceState = {
    activeTableId: string | null;
    focus: WorkspaceFocus;
    openTable: (tableId: string) => void;
    focusPanel: (panel: WorkspaceFocus) => void;
    toggleFocus: () => void;
};

// Create one store per workspace; importing this module never creates shared state.
export const createWorkspaceStore = (initialTableId: string | null = null) =>
    createStore<WorkspaceState>()((set) => ({
        activeTableId: initialTableId,
        focus: 'grid',
        openTable: (tableId) => set({ activeTableId: tableId, focus: 'grid' }),
        focusPanel: (focus) => set({ focus }),
        toggleFocus: () => set((state) => ({ focus: state.focus === 'grid' ? 'explorer' : 'grid' })),
    }));

export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
