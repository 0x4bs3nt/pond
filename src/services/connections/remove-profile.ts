import type { RemoveProfileOptions, RemoveProfileResult } from './types';

export const removeProfile = async ({
    profiles,
    connections,
    id,
    activeId,
}: RemoveProfileOptions): Promise<RemoveProfileResult> => {
    const disconnected = id === activeId;

    if (disconnected) {
        try {
            await connections.disconnect();
        } catch {
            return { ok: false, error: 'disconnect-failed', disconnected: false };
        }
    }

    return { ...(await profiles.remove(id)), disconnected };
};
