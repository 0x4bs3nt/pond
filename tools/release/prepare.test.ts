import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const script = resolve('tools/release/prepare.ts');

test('preparation is repeatable, validates committed files, and rejects stale metadata or a foreign PR', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pond-release-'));
    const cwd = join(root, 'repo');
    const bin = join(root, 'bin');
    const prFile = join(root, 'pr.json');
    await mkdir(cwd);
    await mkdir(bin);
    const git = (...args: string[]) => {
        const result = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
        if (result.exitCode !== 0) throw new Error(result.stderr.toString());
        return result.stdout.toString().trim();
    };
    const run = (mode: string) =>
        Bun.spawnSync([process.execPath, script, mode], {
            cwd,
            env: {
                ...process.env,
                PATH: `${bin}:${process.env.PATH}`,
                GITHUB_REPOSITORY: 'test/pond',
                RELEASE_PR_NUMBER: '42',
                POND_TEST_PR: prFile,
            },
            stdout: 'pipe',
            stderr: 'pipe',
        });

    try {
        await Bun.write(join(bin, 'gh'), '#!/bin/sh\ncat "$POND_TEST_PR"\n');
        await chmod(join(bin, 'gh'), 0o755);
        await Bun.write(join(cwd, '.prettierrc'), '{"tabWidth":4}');
        await Bun.write(join(cwd, 'package.json'), '{"name":"pond","version":"0.1.0"}');
        git('init', '-b', 'main');
        git('config', 'user.name', 'Test');
        git('config', 'user.email', 'test@example.com');
        git('add', '.');
        git('commit', '-m', 'initial');
        git('tag', 'v0.1.0');
        const base = git('rev-parse', 'HEAD');
        git('update-ref', 'refs/remotes/origin/main', base);
        git('checkout', '-b', 'dev');
        const pr = {
            number: 42,
            title: 'feat: add editing',
            body: 'Adds cell editing.',
            state: 'open',
            base: { ref: 'main', sha: base },
            head: { ref: 'dev', sha: base, repo: { full_name: 'test/pond' } },
        };
        await Bun.write(prFile, JSON.stringify(pr));
        expect(run('check').exitCode).toBe(1);
        const prepared = run('prepare');
        expect(prepared.stderr.toString()).toBe('');
        expect(prepared.exitCode).toBe(0);
        expect((await Bun.file(join(cwd, 'package.json')).json()).version).toBe('0.2.0');
        const first = await Bun.file(join(cwd, 'CHANGELOG.md')).text();
        expect(run('prepare').exitCode).toBe(0);
        expect(await Bun.file(join(cwd, 'CHANGELOG.md')).text()).toBe(first);
        git('add', '.');
        git('commit', '-m', 'chore(release): prepare files');
        pr.head.sha = git('rev-parse', 'HEAD');
        await Bun.write(prFile, JSON.stringify(pr));
        expect(run('check').exitCode).toBe(0);

        pr.title = 'fix: correct editing';
        await Bun.write(prFile, JSON.stringify(pr));
        expect(run('check').exitCode).toBe(1);
        expect(run('prepare').exitCode).toBe(0);
        expect((await Bun.file(join(cwd, 'package.json')).json()).version).toBe('0.1.1');
        expect(run('check').exitCode).toBe(0);

        pr.head.repo.full_name = 'someone/pond';
        await Bun.write(prFile, JSON.stringify(pr));
        expect(run('prepare').stderr.toString()).toContain('same-repository dev');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
