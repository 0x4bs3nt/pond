import type { ConnectionProfile } from '../../domain/connections';

export type ConnectionState = {
    profiles: readonly ConnectionProfile[];
    status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'disconnect-failed';
    profilesStatus: 'loading' | 'ready' | 'error';
    operation: 'idle' | 'saving' | 'deleting';
    selectedId: string | null;
    activeProfile: ConnectionProfile | null;
    message: string;
};
