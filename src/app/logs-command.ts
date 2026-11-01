import { setTimeout as delay } from 'node:timers/promises';
import { createLogReader, logDirectory } from '../platform/logging';
import type { LogsCommandOptions } from './types';

export const runLogsCommand = async ({ follow }: LogsCommandOptions) => {
    const directory = logDirectory();

    const abort = new AbortController();
    const stop = () => abort.abort();

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);

    const reader = createLogReader(
        directory,
        (bytes) =>
            new Promise<void>((resolve, reject) => {
                process.stdout.write(bytes, (error) => (error ? reject(error) : resolve()));
            })
    );

    // A closed pipe (for example `pond logs | head`) is a normal consumer exit.
    const onOutputError = () => abort.abort();
    process.stdout.on('error', onOutputError);

    try {
        process.stderr.write(`Logs: ${directory}\n`);

        const found = await reader.poll();
        if (!found)
            process.stderr.write(
                follow ? 'No logs yet. Waiting for Pond to write a log…\n' : 'No logs yet. Start Pond first.\n'
            );

        while (follow && !abort.signal.aborted) {
            await delay(250, undefined, { signal: abort.signal });
            await reader.poll();
        }

        return 0;
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EPIPE' || (error instanceof Error && error.name === 'AbortError')) return 0;

        process.stderr.write('Unable to read Pond logs. Check the log directory and its permissions.\n');

        return 1;
    } finally {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        process.stdout.off('error', onOutputError);

        await reader.close().catch(() => {});
    }
};
