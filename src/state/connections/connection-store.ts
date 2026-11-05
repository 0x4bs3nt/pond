import { createStore } from 'zustand/vanilla';
import type { ConnectionState } from './types';

export const createConnectionStore = () =>
    createStore<ConnectionState>(() => ({
        profiles: [],
        profilesStatus: 'loading',
        operation: 'idle',
        selectedId: null,
        status: 'disconnected',
        activeProfile: null,
        message: '',
    }));
