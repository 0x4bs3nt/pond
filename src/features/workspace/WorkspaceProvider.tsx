import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { WorkspaceProviderProps } from './types';

import type { WorkspaceState, WorkspaceStore } from '../../state/workspace';

const WorkspaceContext = createContext<WorkspaceStore | null>(null);

// Context carries the stable store instance, not changing state snapshots.
export const WorkspaceProvider = ({ store, children }: WorkspaceProviderProps) => (
    <WorkspaceContext.Provider value={store}>{children}</WorkspaceContext.Provider>
);

export const useWorkspaceStore = () => {
    const store = useContext(WorkspaceContext);

    if (!store) throw new Error('useWorkspace requires a WorkspaceProvider.');

    return store;
};

export const useWorkspace = <T,>(selector: (state: WorkspaceState) => T): T => useStore(useWorkspaceStore(), selector);
