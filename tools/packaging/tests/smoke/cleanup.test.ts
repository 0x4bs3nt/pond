import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeSmokeDirectory } from '../../smoke/cleanup';

test('retries transient file locks and removes the smoke directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-cleanup-'));
    const file = join(directory, 'fixture');
    await Bun.write(file, 'fixture');
    let attempts = 0;
    const delays: number[] = [];
    try {
        await removeSmokeDirectory(
            directory,
            async (path, options) => {
                if (++attempts === 1) throw Object.assign(new Error('locked'), { code: 'EBUSY' });
                await rm(path, options);
            },
            async (milliseconds) => {
                delays.push(milliseconds);
            }
        );
        expect(attempts).toBe(2);
        expect(delays).toEqual([200]);
        expect(await Bun.file(file).exists()).toBe(false);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('bounds retries and preserves a persistent cleanup failure', async () => {
    const error = Object.assign(new Error('locked'), { code: 'EBUSY' });
    let attempts = 0;
    const delays: number[] = [];
    await expect(
        removeSmokeDirectory(
            'unused',
            async () => {
                attempts++;
                throw error;
            },
            async (milliseconds) => {
                delays.push(milliseconds);
            }
        )
    ).rejects.toBe(error);
    expect(attempts).toBe(6);
    expect(delays).toEqual([200, 400, 600, 800, 1000]);
});

test('does not retry unrelated filesystem errors', async () => {
    const error = Object.assign(new Error('I/O failure'), { code: 'EIO' });
    let attempts = 0;
    const delays: number[] = [];
    await expect(
        removeSmokeDirectory(
            'unused',
            async () => {
                attempts++;
                throw error;
            },
            async (milliseconds) => {
                delays.push(milliseconds);
            }
        )
    ).rejects.toBe(error);
    expect(attempts).toBe(1);
    expect(delays).toEqual([]);
});
