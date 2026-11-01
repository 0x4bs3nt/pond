import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, rm, stat, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger } from './logger';
import { logDirectory } from './log-directory';

const directories: string[] = [];
const fixture = async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-logs-'));
    directories.push(directory);
    return directory;
};
afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const records = async (path: string) =>
    (await readFile(path, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

test('writes ordered structured records and safe error details without messages, values, or credentials', async () => {
    const directory = await fixture();
    const logger = createLogger({ version: '0.1.0', directory });
    const cause = new TypeError('password=hunter2');
    const error = Object.assign(new Error('postgres://alice:secret@host/db SQL value=private', { cause }), {
        code: 'EACCES',
        query: 'private sql',
    });
    error.stack = 'Error: private cell\n    at secretFunction (/home/alice/pond/src/app/Workspace.tsx:12:3)';
    logger.log('app.started');
    logger.log('app.fatal', 'bootstrap', error);
    logger.log('runtime.warning', 'console', 'private raw input');
    expect(await logger.flush()).toBe(true);
    const result = await records(logger.path);
    expect(result.map((record) => record.event)).toEqual(['app.started', 'app.fatal', 'runtime.warning']);
    expect(result.map((record) => record.level)).toEqual(['info', 'error', 'warn']);
    expect(result[1]).toMatchObject({
        version: '0.1.0',
        pid: process.pid,
        source: 'bootstrap',
        error: { name: 'Error', code: 'EACCES', frames: ['Workspace.tsx:12:3'], cause: { name: 'TypeError' } },
    });
    expect(result[0].runtime).toBe(`bun ${Bun.version}`);
    expect(Number.isNaN(Date.parse(result[0].timestamp))).toBe(false);
    const raw = await readFile(logger.path, 'utf8');
    for (const secret of ['hunter2', 'alice', 'secret', 'private', 'postgres://', 'query', 'secretFunction'])
        expect(raw).not.toContain(secret);
    expect(result[2].error).toEqual({ name: 'NonErrorThrow' });
    if (process.platform !== 'win32') {
        expect((await stat(logger.path)).mode & 0o777).toBe(0o600);
        expect((await stat(directory)).mode & 0o777).toBe(0o700);
    }
});

test('rotates bounded logs and retains the newest record', async () => {
    const directory = await fixture();
    const logger = createLogger({ version: 'test', directory, maxBytes: 600 });
    for (let index = 0; index < 20; index++) {
        logger.log('runtime.warning');
        await logger.flush();
    }
    logger.log('app.fatal', 'renderer', new Error('omitted'));
    expect(await logger.flush()).toBe(true);
    expect((await readdir(directory)).sort()).toEqual([`pond-${process.pid}.jsonl`, `pond-${process.pid}.jsonl.1`]);
    expect((await stat(logger.path)).size).toBeLessThanOrEqual(600);
    expect((await stat(logger.path + '.1')).size).toBeLessThanOrEqual(600);
    expect((await records(logger.path)).at(-1).event).toBe('app.fatal');
});

test('bounds queued records and reports dropped records on the next accepted write', async () => {
    const logger = createLogger({ version: 'test', directory: await fixture(), maxQueued: 2 });
    for (let index = 0; index < 20; index++) logger.log('runtime.warning');
    expect(await logger.flush()).toBe(true);
    expect(logger.droppedRecords).toBe(18);
    logger.log('app.stopped');
    await logger.flush();
    const result = await records(logger.path);
    expect(result).toHaveLength(3);
    expect(result.at(-1)).toMatchObject({ event: 'app.stopped', droppedRecords: 18 });
});

test('log initialization failure does not throw or loop', async () => {
    const directory = await fixture();
    const blocker = join(directory, 'file');
    await writeFile(blocker, 'not a directory');
    const logger = createLogger({ version: 'test', directory: blocker });
    logger.log('app.fatal', 'bootstrap', new Error('secret'));
    expect(await logger.flush()).toBe(false);
    expect(logger.available).toBe(false);
    logger.log('app.stopped');
    expect(await logger.flush()).toBe(false);
    expect(await readFile(blocker, 'utf8')).toBe('not a directory');
});

test('uses application state directories independently of cwd', () => {
    expect(logDirectory({}, 'linux', '/home/test')).toBe('/home/test/.local/state/pond/logs');
    expect(logDirectory({ XDG_STATE_HOME: '/state' }, 'linux', '/home/test')).toBe('/state/pond/logs');
    expect(logDirectory({ XDG_STATE_HOME: 'relative' }, 'linux', '/home/test')).toBe(
        '/home/test/.local/state/pond/logs'
    );
    expect(logDirectory({}, 'darwin', '/Users/test')).toBe('/Users/test/Library/Logs/Pond');
    expect(logDirectory({ POND_LOG_DIR: '/tmp/logs' }, 'linux', '/home/test')).toBe('/tmp/logs');
});

test('prunes exited-process logs while leaving unrelated files alone', async () => {
    const directory = await fixture();
    for (let index = 0; index < 12; index++)
        await writeFile(join(directory, `pond-${1000000000 + index}.jsonl`), '{}\n');
    await writeFile(join(directory, 'keep.txt'), 'unrelated');
    const logger = createLogger({ version: 'test', directory });
    logger.log('app.started');
    expect(await logger.flush()).toBe(true);
    const names = await readdir(directory);
    expect(names.filter((name) => name.endsWith('.jsonl'))).toHaveLength(9);
    expect(await readFile(join(directory, 'keep.txt'), 'utf8')).toBe('unrelated');
});

test('handles cyclic causes and hostile error properties without leaking or throwing', async () => {
    const logger = createLogger({ version: 'test', directory: await fixture() });
    const cyclic = new Error('hidden');
    cyclic.cause = cyclic;
    const hostile = new Error('hidden');
    Object.defineProperty(hostile, 'stack', {
        get() {
            throw new Error('hidden');
        },
    });
    logger.log('runtime.error', 'console', cyclic);
    logger.log('runtime.error', 'console', hostile);
    await logger.flush();
    const result = await records(logger.path);
    expect(result[0].error.cause.cause.cause).toBeUndefined();
    expect(result[1].error).toEqual({ name: 'UnreadableError' });
    expect(await readFile(logger.path, 'utf8')).not.toContain('hidden');
});

test('keeps a fatal error when the queue is saturated', async () => {
    const logger = createLogger({ version: 'test', directory: await fixture(), maxQueued: 2 });
    logger.log('runtime.warning');
    logger.log('runtime.warning');
    logger.log('app.fatal', 'uncaughtException', new TypeError('omitted'));
    await logger.flush();
    const result = await records(logger.path);
    expect(result.at(-1)).toMatchObject({ event: 'app.fatal', error: { name: 'TypeError' }, droppedRecords: 1 });
});

test('a write failure after successful startup stops logging without recursive reports', async () => {
    const directory = await fixture();
    const logger = createLogger({ version: 'test', directory });
    logger.log('app.started');
    expect(await logger.flush()).toBe(true);
    await rm(logger.path);
    // A file replacing the directory simulates storage becoming unavailable mid-session.
    await rm(directory, { recursive: true });
    await writeFile(directory, 'storage unavailable');
    logger.log('app.fatal', 'renderer', new Error('private'));
    expect(await logger.flush()).toBe(false);
    expect(logger.available).toBe(false);
    logger.log('shutdown.failed');
    expect(await logger.flush()).toBe(false);
    expect(await readFile(directory, 'utf8')).toBe('storage unavailable');
});

test.skipIf(process.platform === 'win32')(
    'preserves existing directory permissions and creates private log storage',
    async () => {
        const existing = await fixture();
        await chmod(existing, 0o755);
        const logger = createLogger({ version: 'test', directory: existing });
        logger.log('app.started');
        expect(await logger.flush()).toBe(true);
        expect((await stat(existing)).mode & 0o777).toBe(0o755);
        expect((await stat(logger.path)).mode & 0o777).toBe(0o600);

        const newDirectory = join(existing, 'new-logs');
        const newLogger = createLogger({ version: 'test', directory: newDirectory });
        newLogger.log('app.started');
        expect(await newLogger.flush()).toBe(true);
        expect((await stat(newDirectory)).mode & 0o777).toBe(0o700);
        expect((await stat(newLogger.path)).mode & 0o777).toBe(0o600);
        expect((await stat(existing)).mode & 0o777).toBe(0o755);
    }
);
