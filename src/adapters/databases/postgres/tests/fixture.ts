import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';

export const postgresAvailable =
    ['initdb', 'postgres'].every((binary) => Bun.which(binary)) && process.getuid?.() !== 0;

export const startPostgres = async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-catalog-test-'));

    let server: ReturnType<typeof Bun.spawn> | undefined;
    let client: Client | undefined;

    const stop = async () => {
        await client?.end();

        if (server?.exitCode === null) {
            server.kill('SIGINT');

            await server.exited;
        }
        await rm(directory, { recursive: true, force: true });
    };
    try {
        // This disposable cluster does not need crash-durable initialization.
        const init = Bun.spawn(
            [
                'initdb',
                '-D',
                directory,
                '--username=pond',
                '--auth=trust',
                '--no-locale',
                '--encoding=UTF8',
                '--no-sync',
            ],
            { stdout: 'ignore', stderr: 'ignore' }
        );

        if ((await init.exited) !== 0) throw new Error('initdb failed');

        const socket = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data: () => {} } });
        const port = socket.port;
        socket.stop(true);

        let output = '';
        server = Bun.spawn(
            ['postgres', '-D', directory, '-h', '127.0.0.1', '-p', String(port), '-c', 'unix_socket_directories='],
            { stdout: 'ignore', stderr: 'pipe', env: { ...process.env, LC_ALL: 'C' } }
        );

        const errors = server.stderr;
        if (errors && typeof errors !== 'number')
            void (async () => {
                for await (const bytes of errors) output += new TextDecoder().decode(bytes);
            })();

        const deadline = Date.now() + 10000;
        while (!output.includes('database system is ready to accept connections')) {
            if (server.exitCode !== null || Date.now() > deadline) throw new Error('PostgreSQL startup failed');

            await Bun.sleep(20);
        }

        client = new Client({ host: '127.0.0.1', port, user: 'pond', password: '', database: 'postgres', ssl: false });
        await client.connect();

        return { client, port, stop };
    } catch (error) {
        await stop();
        throw error;
    }
};
