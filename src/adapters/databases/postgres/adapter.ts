import { Client } from 'pg';
import { Socket } from 'node:net';
import type { DatabaseAdapter } from '../../../ports/database';
import { isConnectionProfile } from '../../../domain/connections';
import { connectionError } from './errors';
import { createSchemaInspection } from './schema';
import { createTableBrowsing, maximumPageSize } from './browsing';

export const postgresDatabaseAdapter: DatabaseAdapter = {
    engineId: 'postgres',
    connect: async (connection, options = {}) => {
        if (connection.engineId !== 'postgres') return { ok: false, error: { code: 'unsupported-engine' } };

        if (!isConnectionProfile({ id: 'connection', name: 'connection', connection }))
            return { ok: false, error: { code: 'invalid-request' } };

        if (options.signal?.aborted) return { ok: false, error: { code: 'cancelled' } };

        const network = connection.network!;
        const listeners = new Set<() => void>();
        let closed = false;

        const notifyClosed = () => {
            closed = true;

            for (const listener of listeners) listener();
            listeners.clear();
        };

        const socket = new Socket();

        const client = new Client({
            host: network.host,
            port: network.port,
            database: connection.database,
            user: network.user,
            password: () => options.password ?? '',
            ssl: network.tls === 'disable' ? false : { rejectUnauthorized: network.tls === 'verify-full' },
            stream: () => socket,
            application_name: 'pond',
            statement_timeout: 10_000,
        });

        client.on('error', notifyClosed);
        client.once('end', notifyClosed);

        let closing: Promise<void> | undefined;
        const close = () => {
            if (!closing) {
                notifyClosed();

                closing = client.end();
                socket.destroy();
            }

            return closing;
        };

        const interrupted = Promise.withResolvers<void>();
        const abort = () => {
            void close();
            interrupted.resolve();
        };

        options.signal?.addEventListener('abort', abort, { once: true });
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            abort();
        }, 10_000);

        try {
            await Promise.race([client.connect(), interrupted.promise]);
            if (options.signal?.aborted || timedOut) {
                await close();

                return { ok: false, error: { code: timedOut ? 'unreachable' : 'cancelled' } };
            }
        } catch (error) {
            await close();

            return {
                ok: false,
                error: options.signal?.aborted
                    ? { code: 'cancelled' }
                    : timedOut
                      ? { code: 'unreachable' }
                      : connectionError(error),
            };
        } finally {
            clearTimeout(timeout);

            options.signal?.removeEventListener('abort', abort);
        }

        // Keep transactions and catalog reads from interleaving on the single pg client.
        let reads = Promise.resolve();
        const read = <T extends unknown>(operation: () => Promise<T>): Promise<T> => {
            const result = reads.then(operation);
            reads = result.then(
                () => {},
                () => {}
            );

            return result;
        };

        const schema = createSchemaInspection(client, () => closed);
        const browsing = createTableBrowsing(client, schema, () => closed);

        return {
            ok: true,
            value: {
                capabilities: { namespaces: true, primaryKeys: true, maxPageSize: maximumPageSize },
                schema: {
                    listNamespaces: () => read(schema.listNamespaces),
                    listTables: (namespace) => read(() => schema.listTables(namespace)),
                    describeTable: (table) => read(() => schema.describeTable(table)),
                },
                browsing: { readPage: (request) => read(() => browsing.readPage(request)) },
                close,
                subscribeClose: (listener) => {
                    listeners.add(listener);
                    if (closed) listener();
                    return () => {
                        listeners.delete(listener);
                    };
                },
            },
        };
    },
};
