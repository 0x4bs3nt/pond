import type { createConnectionService } from './connection-service';
import type { ConnectionProfile } from '../../domain/connections';
import type { ProfileError, ProfileRepository } from '../../ports/profiles';
export type ConnectionService = ReturnType<typeof createConnectionService>;

export type RemoveProfileOptions = {
    profiles: ProfileRepository;
    connections: ConnectionService;
    id: string;
    activeId: string | null;
};
export type RemoveProfileResult = { disconnected: boolean } & (
    { ok: true; value: readonly ConnectionProfile[] } | { ok: false; error: ProfileError | 'disconnect-failed' }
);
