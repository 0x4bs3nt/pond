import { afterEach, expect, test } from 'bun:test';
import { appendFile, mkdir, mkdtemp, rename, rm, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLogReader } from './log-reader';

const directories: string[] = [];
const fixture = async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-read-'));
    directories.push(directory);
    const chunks: Buffer[] = [];
    const reader = createLogReader(directory, async (bytes) => {
        chunks.push(Buffer.from(bytes));
    });
    return { directory, reader, output: () => Buffer.concat(chunks).toString('utf8') };
};
afterEach(async () => {
    await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test('reads only the newest process log, excluding backups and unrelated files', async () => {
    const { directory, reader, output } = await fixture();
    await writeFile(join(directory, 'pond-1.jsonl'), 'old\n');
    await utimes(join(directory, 'pond-1.jsonl'), 1, 1);
    await writeFile(join(directory, 'pond-2.jsonl'), 'new ✓\n');
    await writeFile(join(directory, 'pond-2.jsonl.1'), 'backup\n');
    await writeFile(join(directory, 'other.jsonl'), 'unrelated\n');
    try {
        expect(await reader.poll()).toBe(true);
        expect(output()).toBe('new ✓\n');
        await reader.poll();
        expect(output()).toBe('new ✓\n');
    } finally {
        await reader.close();
    }
});

test('follows appends, drains rotated files, and switches to new process logs without duplication', async () => {
    const { directory, reader, output } = await fixture();
    const path = join(directory, 'pond-1.jsonl');
    await writeFile(path, 'first\n');
    try {
        await reader.poll();
        await appendFile(path, 'tail\n');
        await rename(path, path + '.1');
        await writeFile(path, 'rotated\n');
        await reader.poll();
        await utimes(path, 1, 1);
        await writeFile(join(directory, 'pond-2.jsonl'), 'restarted\n');
        await reader.poll();
        await reader.poll();
        expect(output()).toBe('first\ntail\nrotated\nrestarted\n');
    } finally {
        await reader.close();
    }
});

test('waits without creating a missing directory and reads a log when one appears', async () => {
    const { directory, reader, output } = await fixture();
    await rm(directory, { recursive: true });
    try {
        expect(await reader.poll()).toBe(false);
        await mkdir(directory);
        await writeFile(join(directory, 'pond-3.jsonl'), 'started\n');
        expect(await reader.poll()).toBe(true);
        expect(output()).toBe('started\n');
    } finally {
        await reader.close();
    }
});
