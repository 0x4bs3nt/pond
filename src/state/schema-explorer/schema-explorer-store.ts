import { createStore } from 'zustand/vanilla';
import type { SchemaExplorerState } from './types';

export const createSchemaExplorerStore = () =>
    createStore<SchemaExplorerState>(() => ({
        catalog: { status: 'loading' },
        selected: null,
        description: { status: 'idle' },
    }));
