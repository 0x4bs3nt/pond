import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bootstrap = new URL('../bootstrap.tsx', import.meta.url).pathname;

test('logs command prints records without starting the TUI or writing its own logs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-cli-logs-'));
    try {
        const content = '{"event":"app.started"}\n';
        await writeFile(join(directory, 'pond-123.jsonl'), content);
        const child = Bun.spawn([process.execPath, bootstrap, 'logs'], {
            env: { ...process.env, POND_LOG_DIR: directory },
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const [stdout, stderr, code] = await Promise.all([
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
            child.exited,
        ]);
        expect(code).toBe(0);
        expect(stdout).toBe(content);
        expect(stderr).toContain(directory);
        expect(stdout + stderr).not.toContain('\x1b');
        expect(await readdir(directory)).toEqual(['pond-123.jsonl']);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('empty logs and invalid arguments produce actionable messages without crashing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-cli-empty-'));
    try {
        for (const [args, expected, message] of [
            [[], 0, 'No logs yet. Start Pond first.'],
            [['--invalid'], 1, "unknown option '--invalid'"],
        ] as const) {
            const child = Bun.spawn([process.execPath, bootstrap, 'logs', ...args], {
                env: { ...process.env, POND_LOG_DIR: directory },
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const [stdout, stderr, code] = await Promise.all([
                new Response(child.stdout).text(),
                new Response(child.stderr).text(),
                child.exited,
            ]);
            expect(code).toBe(expected);
            expect(stdout).toBe('');
            expect(stderr).toContain(message);
        }
        expect(await readdir(directory)).toEqual([]);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('follow waits for the first log, streams it, and shuts down on SIGINT', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-cli-follow-'));
    const child = Bun.spawn([process.execPath, bootstrap, 'logs', '--follow'], {
        env: { ...process.env, POND_LOG_DIR: directory },
        stdout: 'pipe',
        stderr: 'pipe',
    });
    const timeout = setTimeout(() => child.kill('SIGKILL'), 3000);
    try {
        const errors = child.stderr.getReader();
        await errors.read(); // Command has installed its signal handlers and announced the directory.
        errors.releaseLock();
        await writeFile(join(directory, 'pond-456.jsonl'), '{"event":"app.started"}\n');
        const output = child.stdout.getReader();
        const chunk = await output.read();
        expect(new TextDecoder().decode(chunk.value)).toBe('{"event":"app.started"}\n');
        output.releaseLock();
        child.kill('SIGINT');
        expect(await child.exited).toBe(0);
        expect(await readdir(directory)).toEqual(['pond-456.jsonl']);
    } finally {
        clearTimeout(timeout);
        child.kill();
        await child.exited;
        await rm(directory, { recursive: true, force: true });
    }
});

test('help, version, and invalid commands never start the TUI or create logs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-cli-routing-'));
    const { version } = await Bun.file(new URL('../../../package.json', import.meta.url)).json();
    try {
        for (const [args, expected, message] of [
            [['--help'], 0, 'Usage: pond'],
            [['logs', '--help'], 0, '--follow'],
            [['--version'], 0, version],
            [['not-a-command'], 1, 'too many arguments'],
            [['logs', 'unexpected'], 1, 'too many arguments'],
        ] as const) {
            const child = Bun.spawn([process.execPath, bootstrap, ...args], {
                env: { ...process.env, POND_LOG_DIR: directory },
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
                expect(code).toBe(expected);
                expect(expected === 0 ? stdout : stderr).toContain(message);
                expect(stdout + stderr).not.toContain('\x1b');
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
