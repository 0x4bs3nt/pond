import { createStore } from 'zustand/vanilla';
import type { WorkspaceState } from './types';

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
