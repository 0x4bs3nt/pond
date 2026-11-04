import { createStore } from 'zustand/vanilla';
import type { ConnectionState } from './types';

export const createConnectionStore = () =>
    createStore<ConnectionState>(() => ({
        profiles: [],
        status: 'disconnected',
        activeProfile: null,
        message: '',
    }));
