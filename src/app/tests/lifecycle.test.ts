import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger } from '../../platform/logging';
import { createLifecycle } from '../lifecycle';

const run = async (scenario: (directory: string) => Promise<void>) => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-lifecycle-'));
    try {
        await scenario(directory);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
};

test('fatal shutdown is idempotent, restores before reporting, and writes the original error once', async () =>
    run(async (directory) => {
        const logger = createLogger({ version: 'test', directory });
        const calls: string[] = [];
        let closed!: () => void;
        const renderer = {
            isDestroyed: false,
            closed: new Promise<void>((resolve) => {
                closed = resolve;
            }),
            destroy: () => {
                calls.push('destroy');
                renderer.isDestroyed = true;
                closed();
            },
        };
        const lifecycle = createLifecycle({
            logger,
            writeError: () => calls.push('report'),
            exit: (code) => calls.push(`exit:${code}`),
        });
        lifecycle.attach(renderer);
        lifecycle.attachCleanup(async () => {
            calls.push('disconnect');
        });
        const error = new Error('private');
        const first = lifecycle.fatal(error, 'unhandledRejection');
        const second = lifecycle.fatal(error, 'uncaughtException');
        expect(first).toBe(second);
        await first;
        expect(calls).toEqual(['destroy', 'disconnect', 'report', 'exit:1']);
        const events = (await readFile(logger.path, 'utf8'))
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));
        expect(events.map((entry) => entry.event)).toEqual(['app.fatal', 'app.stopped']);
        expect(events[0].source).toBe('unhandledRejection');
    }));

test('a React error reported by console and the boundary is logged once without immediate shutdown', async () =>
    run(async (directory) => {
        const logger = createLogger({ version: 'test', directory });
        const exits: number[] = [];
        const lifecycle = createLifecycle({ logger, writeError: () => {}, exit: (code) => exits.push(code) });
        const error = new Error('private');
        lifecycle.consoleError(error);
        lifecycle.reportUI(error);
        await Promise.resolve();
        await logger.flush();
        expect(exits).toEqual([]);
        await lifecycle.stop();
        expect(exits).toEqual([1]);
        const raw = await readFile(logger.path, 'utf8');
        expect(raw.match(/ui.failed/g)).toHaveLength(1);
        expect(raw).not.toContain('app.fatal');
    }));

test('a stuck terminal close cannot hang fatal shutdown', async () =>
    run(async (directory) => {
        const logger = createLogger({ version: 'test', directory });
        const exits: number[] = [];
        const lifecycle = createLifecycle({
            logger,
            writeError: () => {},
            exit: (code) => exits.push(code),
            timeoutMs: 30,
        });
        lifecycle.attach({ isDestroyed: false, destroy: () => {}, closed: new Promise(() => {}) });
        await lifecycle.fatal(new Error('private'), 'renderer');
        expect(exits).toEqual([1]);
        expect(await readFile(logger.path, 'utf8')).toContain('shutdown.failed');
    }));

test.each(['reject', 'hang'])(
    'session cleanup failure (%s) cannot prevent terminal restoration or exit',
    async (mode) =>
        run(async (directory) => {
            const logger = createLogger({ version: 'test', directory });
            const calls: string[] = [];
            const lifecycle = createLifecycle({
                logger,
                timeoutMs: 20,
                writeError: () => calls.push('report'),
                exit: (code) => calls.push(`exit:${code}`),
            });
            lifecycle.attach({
                isDestroyed: false,
                destroy: () => {
                    calls.push('restore');
                },
                closed: Promise.resolve(),
            });
            lifecycle.attachCleanup(async () => {
                calls.push('cleanup');
                if (mode === 'reject') throw new Error('password=private');
                await new Promise(() => {});
            });
            await lifecycle.stop();
            expect(calls).toEqual(['restore', 'cleanup', 'report', 'exit:1']);
            const raw = await readFile(logger.path, 'utf8');
            expect(raw).toContain('shutdown.failed');
            expect(raw).toContain('app.stopped');
            expect(raw).not.toContain('password=private');
        })
);
