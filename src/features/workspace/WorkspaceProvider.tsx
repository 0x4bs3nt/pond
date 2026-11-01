import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';

import type { WorkspaceState, WorkspaceStore } from '../../state/workspace';

const WorkspaceContext = createContext<WorkspaceStore | null>(null);

// Context carries the stable store instance, not changing state snapshots.
export const WorkspaceProvider = ({ store, children }: { store: WorkspaceStore; children: ReactNode }) => (
    <WorkspaceContext.Provider value={store}>{children}</WorkspaceContext.Provider>
);

export const useWorkspace = <T,>(selector: (state: WorkspaceState) => T): T => {
    const store = useContext(WorkspaceContext);

    if (!store) throw new Error('useWorkspace requires a WorkspaceProvider.');

    return useStore(store, selector);
};
