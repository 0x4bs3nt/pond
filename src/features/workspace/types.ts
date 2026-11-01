import type { ReactNode } from 'react';
import type { WorkspaceStore } from '../../state/workspace';

export type StatusMode = 'editing' | 'grid' | 'explorer';

export type WorkspaceProviderProps = { store: WorkspaceStore; children: ReactNode };
