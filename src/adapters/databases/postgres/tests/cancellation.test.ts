import { expect, test } from 'bun:test';
import { postgresDatabaseAdapter } from '../adapter';

test('cancelling a stalled handshake releases the TCP socket without waiting for the connect timeout', async () => {
    const accepted = Promise.withResolvers<void>();
    const closed = Promise.withResolvers<void>();
    const server = Bun.listen({
        hostname: '127.0.0.1',
        port: 0,
        socket: { open: () => accepted.resolve(), data: () => {}, close: () => closed.resolve() },
    });
    const abort = new AbortController();
    try {
        const pending = postgresDatabaseAdapter.connect(
            {
                engineId: 'postgres',
                database: 'postgres',
                network: { host: '127.0.0.1', port: server.port, user: 'pond', tls: 'disable' },
            },
            { password: 'private', signal: abort.signal }
        );
        await accepted.promise;
        abort.abort();
        expect(await pending).toEqual({ ok: false, error: { code: 'cancelled' } });
        await closed.promise;
    } finally {
        abort.abort();
        server.stop(true);
    }
}, 2000);
