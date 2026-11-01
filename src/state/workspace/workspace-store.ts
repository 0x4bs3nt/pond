import { createStore } from 'zustand/vanilla';
import type { WorkspaceFocus, WorkspaceState } from './types';

const panels: readonly WorkspaceFocus[] = ['grid', 'explorer', 'tabs'];

// Create one store per workspace; importing this module never creates shared state.
export const createWorkspaceStore = (initialTableId: string | null = null) =>
    createStore<WorkspaceState>()((set, get) => ({
        openTableIds: initialTableId ? [initialTableId] : [],
        activeTableId: initialTableId,
        focus: initialTableId ? 'grid' : 'explorer',
        editing: false,
        isEditing: () => get().editing,
        setEditing: (editing) => set({ editing }),
        openTable: (tableId) => {
            if (get().editing) return;
            set((state) => ({
                openTableIds: state.openTableIds.includes(tableId)
                    ? state.openTableIds
                    : [...state.openTableIds, tableId],
                activeTableId: tableId,
                focus: 'grid',
            }));
        },
        activateTab: (tableId) => {
            if (!get().editing && get().openTableIds.includes(tableId)) set({ activeTableId: tableId });
        },
        closeTab: (tableId) => {
            if (get().editing || !get().openTableIds.includes(tableId)) return;
            set((state) => {
                const index = state.openTableIds.indexOf(tableId);
                const openTableIds = state.openTableIds.filter((id) => id !== tableId);
                const activeTableId =
                    state.activeTableId === tableId
                        ? (openTableIds[Math.min(index, openTableIds.length - 1)] ?? null)
                        : state.activeTableId;
                return { openTableIds, activeTableId, focus: activeTableId ? state.focus : 'explorer' };
            });
        },
        focusPanel: (focus) => {
            if (!get().editing && (focus !== 'grid' || get().activeTableId)) set({ focus });
        },
        toggleFocus: (reverse = false) => {
            if (get().editing) return;
            const available = get().activeTableId ? panels : panels.filter((panel) => panel !== 'grid');
            const index = available.indexOf(get().focus);
            set({ focus: available[(index + (reverse ? -1 : 1) + available.length) % available.length]! });
        },
    }));
