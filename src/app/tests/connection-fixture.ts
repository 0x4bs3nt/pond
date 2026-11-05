import { createMemoryCredentials } from '../../adapters/credentials';
import { createDatabaseRegistry } from '../../adapters/databases';
import { createConnectionService } from '../../services/connections';
import { copyProfile, type ConnectionProfile } from '../../domain/connections';
import type { DatabaseSession } from '../../ports/database';
import type { ProfileRepository } from '../../ports/profiles';

export const savedProfile: ConnectionProfile = {
    id: 'local',
    name: 'Local',
    connection: {
        engineId: 'postgres',
        database: 'pond',
        network: { host: 'localhost', port: 5432, user: 'pond', tls: 'disable' },
    },
};

export const connectionFixture = () => {
    const state = {
        profiles: [copyProfile(savedProfile)],
        saveFails: false,
        removeFails: false,
        closeFails: false,
        closeOnSubscribe: false,
        closeAttempts: 0,
        removeAttempts: 0,
        catalogs: 0,
        targets: [] as string[],
        errors: [] as unknown[],
        pendingSave: null as Promise<void> | null,
    };
    const profiles: ProfileRepository = {
        list: async () => ({ ok: true, value: state.profiles }),
        save: async (profile) => {
            await state.pendingSave;
            if (state.saveFails) return { ok: false, error: 'storage-unavailable' };
            state.profiles = state.profiles.some((item) => item.id === profile.id)
                ? state.profiles.map((item) => (item.id === profile.id ? copyProfile(profile) : item))
                : [...state.profiles, copyProfile(profile)];
            return { ok: true, value: state.profiles };
        },
        remove: async (id) => {
            state.removeAttempts++;
            if (state.removeFails) return { ok: false, error: 'storage-unavailable' };
            state.profiles = state.profiles.filter((item) => item.id !== id);
            return { ok: true, value: state.profiles };
        },
    };
    const credentials = createMemoryCredentials();
    const connections = createConnectionService(
        createDatabaseRegistry([
            {
                engineId: 'postgres',
                connect: async (target) => {
                    state.targets.push(target.database);
                    const session: DatabaseSession = {
                        capabilities: { namespaces: true, primaryKeys: true, maxPageSize: 0 },
                        schema: {
                            listNamespaces: async () => {
                                state.catalogs++;
                                return { ok: true, value: [] };
                            },
                            listTables: async () => ({ ok: true, value: [] }),
                            describeTable: async () => ({ ok: false, error: { code: 'not-found' } }),
                        },
                        browsing: { readPage: async () => ({ ok: false, error: { code: 'unsupported-operation' } }) },
                        close: async () => {
                            state.closeAttempts++;
                            if (state.closeFails) throw new Error('close failed');
                        },
                        subscribeClose: (listener) => {
                            if (state.closeOnSubscribe) listener();
                            return () => {};
                        },
                    };
                    return { ok: true, value: session };
                },
            },
        ]),
        credentials
    );
    return {
        state,
        dependencies: {
            profiles,
            credentials,
            connections,
            onError: (error: unknown) => {
                state.errors.push(error);
            },
        },
    };
};
