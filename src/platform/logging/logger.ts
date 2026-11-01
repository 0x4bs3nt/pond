import { mkdir, open, readdir, rename, rm, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { logDirectory } from './log-directory';
import { safeError } from './safe-error';

export type LogEvent =
    'app.started' | 'app.stopped' | 'app.fatal' | 'ui.failed' | 'runtime.error' | 'runtime.warning' | 'shutdown.failed';
export type ErrorSource =
    'bootstrap' | 'react' | 'renderer' | 'input' | 'uncaughtException' | 'unhandledRejection' | 'console' | 'shutdown';
export type Logger = ReturnType<typeof createLogger>;

const isRunning = (pid: number) => {
    try {
        process.kill(pid, 0);

        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code !== 'ESRCH';
    }
};

export const createLogger = ({
    version,
    directory = logDirectory(),
    maxBytes = 256 * 1024,
    maxQueued = 32,
}: {
    version: string;
    directory?: string;
    maxBytes?: number;
    maxQueued?: number;
}) => {
    const path = join(directory, `pond-${process.pid}.jsonl`);
    const queue: string[] = [];
    let draining: Promise<void> | undefined;
    let ready = false;
    let failed = false;
    let dropped = 0;
    let size = 0;

    const initialize = async () => {
        await mkdir(directory, { recursive: true, mode: 0o700 });

        const old = [];
        for (const name of await readdir(directory)) {
            const match = name.match(/^pond-(\d+)\.jsonl(?:\.1)?$/);
            if (!match || Number(match[1]) === process.pid || isRunning(Number(match[1]))) continue;

            const entry = await stat(join(directory, name)).catch(() => undefined);
            if (entry) old.push({ name, modified: entry.mtimeMs });
        }

        old.sort((a, b) => b.modified - a.modified);

        // Retain eight files from exited processes in addition to active process logs.
        for (const entry of old.slice(8)) await rm(join(directory, entry.name), { force: true });
        size = await stat(path).then(
            (entry) => entry.size,
            (error: NodeJS.ErrnoException) => {
                if (error.code === 'ENOENT') return 0;

                throw error;
            }
        );
        ready = true;
    };

    const drain = async () => {
        try {
            if (!ready) await initialize();
            while (queue.length) {
                const line = queue.shift()!;
                const bytes = Buffer.byteLength(line);

                if (size + bytes > maxBytes) {
                    await rm(path + '.1', { force: true });
                    if (size) await rename(path, path + '.1');
                    size = 0;
                }

                const file = await open(
                    path,
                    constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | constants.O_NOFOLLOW,
                    0o600
                );

                try {
                    await file.chmod(0o600);
                    await file.writeFile(line);
                    size += bytes;
                } finally {
                    await file.close();
                }
            }
        } catch {
            // Never log a logger failure through the logger or through intercepted console methods.
            failed = true;
            queue.length = 0;
        }
    };

    const startDrain = () => {
        draining = drain().finally(() => {
            draining = undefined;

            if (queue.length && !failed) startDrain();
        });
    };

    const log = (event: LogEvent, source?: ErrorSource, error?: unknown) => {
        if (failed) return;

        if (queue.length >= maxQueued) {
            dropped++;
            if (event === 'app.fatal' || event === 'ui.failed' || event === 'shutdown.failed') queue.shift();
            else return;
        }

        const line =
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level:
                    event === 'runtime.warning'
                        ? 'warn'
                        : event === 'app.started' || event === 'app.stopped'
                          ? 'info'
                          : 'error',
                event,
                version,
                runtime: `bun ${Bun.version}`,
                pid: process.pid,
                ...(source ? { source } : {}),
                ...(error !== undefined ? { error: safeError(error) } : {}),
                ...(dropped ? { droppedRecords: dropped } : {}),
            }) + '\n';

        if (Buffer.byteLength(line) > maxBytes) {
            dropped++;
            return;
        }

        dropped = 0;
        queue.push(line);

        if (!draining) startDrain();
    };

    const flush = async (timeoutMs = 1000) => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        try {
            const settled = async () => {
                while (draining) await draining;

                return !failed;
            };
            return await Promise.race([
                settled(),
                new Promise<boolean>((resolve) => {
                    timer = setTimeout(() => resolve(false), timeoutMs);
                }),
            ]);
        } finally {
            clearTimeout(timer);
        }
    };

    return {
        path,
        log,
        flush,
        get available() {
            return !failed;
        },
        get droppedRecords() {
            return dropped;
        },
    };
};
