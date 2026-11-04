import { expect, test } from 'bun:test';
import { createConnectionService } from '../../services/connections';
import { createDatabaseRegistry } from '../../adapters/databases';
import { createMemoryCredentials } from '../../adapters/credentials';
import type { DatabaseAdapter, DatabaseSession } from '../../ports/database';
import type { ConnectionProfile } from '../../domain/connections';

const profile: ConnectionProfile = {
    id: 'local',
    name: 'Local',
    connection: {
        engineId: 'postgres',
        database: 'postgres',
        network: { host: 'localhost', port: 5432, user: 'pond', tls: 'disable' },
    },
};
const session = (close: () => Promise<void>): DatabaseSession => ({
    capabilities: { namespaces: false, primaryKeys: false, maxPageSize: 0 },
    schema: {
        listNamespaces: async () => ({ ok: true, value: [] }),
        listTables: async () => ({ ok: true, value: [] }),
        describeTable: async () => ({ ok: false, error: { code: 'not-found' } }),
    },
    browsing: { readPage: async () => ({ ok: false, error: { code: 'unsupported-operation' } }) },
    close,
    subscribeClose: () => () => {},
});

test('replacement closes the old session first and passwords are consumed once', async () => {
    const credentials = createMemoryCredentials();
    const events: string[] = [];
    const passwords: (string | undefined)[] = [];
    let index = 0;
    const adapter: DatabaseAdapter = {
        engineId: 'postgres',
        connect: async (_target, options) => {
            const id = ++index;
            events.push(`connect:${id}`);
            passwords.push(options?.password);
            return {
                ok: true,
                value: session(async () => {
                    events.push(`close:${id}`);
                }),
            };
        },
    };
    const service = createConnectionService(createDatabaseRegistry([adapter]), credentials);
    credentials.setPassword(profile.id, 'secret');
    expect((await service.connect(profile)).ok).toBe(true);
    expect(await credentials.takePassword(profile.id)).toBeUndefined();
    expect((await service.connect(profile)).ok).toBe(true);
    await service.dispose();
    await service.dispose();
    expect(events).toEqual(['connect:1', 'close:1', 'connect:2', 'close:2']);
    expect(passwords).toEqual(['secret', undefined]);
    expect(await service.connect(profile)).toEqual({ ok: false, error: { code: 'cancelled' } });
});

test('disconnect aborts a pending handshake and closes a late successful session', async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    let signal: AbortSignal | undefined;
    let closes = 0;
    const adapter: DatabaseAdapter = {
        engineId: 'postgres',
        connect: async (_target, options) => {
            signal = options?.signal;
            started.resolve();
            await finish.promise;
            return {
                ok: true,
                value: session(async () => {
                    closes++;
                }),
            };
        },
    };
    const service = createConnectionService(createDatabaseRegistry([adapter]), createMemoryCredentials());
    const pending = service.connect(profile);
    await started.promise;
    const disconnected = service.disconnect();
    expect(signal?.aborted).toBe(true);
    finish.resolve();
    expect(await pending).toEqual({ ok: false, error: { code: 'cancelled' } });
    await disconnected;
    expect(closes).toBe(1);
});

test('failed authentication allows retry and a close failure cannot open a second session', async () => {
    let attempts = 0;
    let closeFails = true;
    const failure = new Error('unexpected cleanup failure');
    const adapter: DatabaseAdapter = {
        engineId: 'postgres',
        connect: async () => {
            if (++attempts === 1) return { ok: false, error: { code: 'authentication' } };
            return {
                ok: true,
                value: session(async () => {
                    if (closeFails) throw failure;
                }),
            };
        },
    };
    const service = createConnectionService(createDatabaseRegistry([adapter]), createMemoryCredentials());
    expect(await service.connect(profile)).toEqual({ ok: false, error: { code: 'authentication' } });
    expect((await service.connect(profile)).ok).toBe(true);
    await expect(service.connect(profile)).rejects.toBe(failure);
    expect(attempts).toBe(2);
    closeFails = false;
    await service.dispose();
});
