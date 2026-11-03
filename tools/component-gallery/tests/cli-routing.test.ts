import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('gallery help and listing stay noninteractive with diagnostics enabled', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-gallery-cli-'));
    const entry = new URL('../index.ts', import.meta.url).pathname;
    try {
        for (const argument of ['--help', '--list']) {
            const child = Bun.spawn([process.execPath, entry, argument], {
                cwd: directory,
                env: { ...process.env, POND_DIAGNOSTICS: '1', POND_LOG_DIR: directory },
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const timeout = setTimeout(() => child.kill('SIGKILL'), 3000);
            try {
                const [stdout, stderr, code] = await Promise.all([
                    new Response(child.stdout).text(),
                    new Response(child.stderr).text(),
                    child.exited,
                ]);
                expect(code).toBe(0);
                expect(stdout).toContain(argument === '--help' ? 'Usage: gallery' : 'wide:');
                expect(stdout).not.toContain('\x1b');
                expect(stderr).toBe('');
            } finally {
                clearTimeout(timeout);
                child.kill();
            }
        }
        expect(await readdir(directory)).toEqual([]);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
