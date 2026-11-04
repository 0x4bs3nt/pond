import { isConnectionProfile, type ConnectionProfile } from '../../domain/connections';
import type { DatabaseResult } from '../../domain/database';
import type { DatabaseRegistry, DatabaseSession } from '../../ports/database';
import type { Credentials } from '../../ports/credentials';

export const createConnectionService = (registry: DatabaseRegistry, credentials: Credentials) => {
    let session: DatabaseSession | undefined;
    let attempt: AbortController | undefined;
    let queue = Promise.resolve();
    let generation = 0;
    let disposed = false;

    // Serialize replacement so even an in-flight handshake closes before the next starts.
    const enqueue = <T extends unknown>(operation: () => Promise<T>): Promise<T> => {
        const result = queue.then(operation);
        // The caller receives failures; the sequencing tail must still allow shutdown cleanup.
        queue = result.then(
            () => {},
            () => {}
        );

        return result;
    };

    const closeSession = async () => {
        const previous = session;
        await previous?.close();
        session = undefined;
    };

    const cancel = () => {
        generation++;
        attempt?.abort();
    };

    const connect = (profile: ConnectionProfile): Promise<DatabaseResult<DatabaseSession>> => {
        cancel();

        const current = generation;

        return enqueue(async () => {
            if (disposed || current !== generation) return { ok: false, error: { code: 'cancelled' } };
            if (!isConnectionProfile(profile)) return { ok: false, error: { code: 'invalid-request' } };

            const adapter = registry.get(profile.connection.engineId);
            if (!adapter) return { ok: false, error: { code: 'unsupported-engine' } };

            await closeSession();

            if (disposed || current !== generation) return { ok: false, error: { code: 'cancelled' } };
            const password = await credentials.takePassword(profile.id);

            if (disposed || current !== generation) return { ok: false, error: { code: 'cancelled' } };

            attempt = new AbortController();

            try {
                const result = await adapter.connect(profile.connection, { password, signal: attempt.signal });

                if (disposed || current !== generation) {
                    if (result.ok) await result.value.close();

                    return { ok: false, error: { code: 'cancelled' } };
                }

                if (result.ok) session = result.value;

                return result;
            } finally {
                attempt = undefined;
            }
        });
    };

    const disconnect = () => {
        cancel();
        credentials.clear();

        return enqueue(closeSession);
    };

    const dispose = () => {
        disposed = true;

        return disconnect();
    };

    return { connect, disconnect, dispose };
};
