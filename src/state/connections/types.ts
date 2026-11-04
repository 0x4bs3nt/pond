import type { ConnectionProfile } from '../../domain/connections';

export type ConnectionState = {
    profiles: readonly ConnectionProfile[];
    status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
    activeProfile: ConnectionProfile | null;
    message: string;
};
