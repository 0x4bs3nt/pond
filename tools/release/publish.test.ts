import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { createPlan } from './policy';

const script = resolve('tools/release/publish.ts');

test('publishes the exact squash commit, retries safely, and refuses a conflicting tag', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pond-publish-'));
    const cwd = join(root, 'repo');
    const bin = join(root, 'bin');
    await mkdir(cwd);
    await mkdir(bin);
    const prFile = join(root, 'pr.json');
    const releasesFile = join(root, 'releases.json');
    const callsFile = join(root, 'calls');
    const git = (...args: string[]) => {
        const result = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
        if (result.exitCode !== 0) throw new Error(result.stderr.toString());
        return result.stdout.toString().trim();
    };
    const run = () =>
        Bun.spawnSync([process.execPath, script], {
            cwd,
            env: {
                ...process.env,
                PATH: `${bin}:${process.env.PATH}`,
                GITHUB_REPOSITORY: 'test/pond',
                RUNNER_TEMP: root,
                POND_TEST_PR: prFile,
                POND_TEST_RELEASES: releasesFile,
                POND_TEST_CALLS: callsFile,
            },
            stdout: 'pipe',
            stderr: 'pipe',
        });
    try {
        await Bun.write(
            join(bin, 'gh'),
            '#!/bin/sh\ncase "$2" in\n*/pulls/*) cat "$POND_TEST_PR" ;;\n*/releases*) cat "$POND_TEST_RELEASES" ;;\ncreate) printf "%s\\n" "$@" > "$POND_TEST_CALLS" ;;\n*) exit 1 ;;\nesac\n'
        );
        await chmod(join(bin, 'gh'), 0o755);
        git('init', '-b', 'main');
        git('config', 'user.name', 'Test');
        git('config', 'user.email', 'test@example.com');
        await Bun.write(join(cwd, 'package.json'), '{"version":"0.1.0"}');
        git('add', '.');
        git('commit', '-m', 'first release');
        git('tag', 'v0.1.0');
        const previous = git('rev-parse', 'HEAD');
        const plan = createPlan('v0.1.0', 42, 'feat: add editing', 'Cell editing.');
        await Bun.write(join(cwd, 'package.json'), '{"version":"0.2.0"}');
        await Bun.write(join(cwd, '.release.json'), JSON.stringify(plan));
        git('add', '.');
        git('commit', '-m', 'feat: add editing (#42)');
        const sha = git('rev-parse', 'HEAD');
        const pr = {
            number: 42,
            body: 'Cell editing.',
            merged: true,
            merge_commit_sha: sha,
            base: { ref: 'main' },
            head: { ref: 'dev', repo: { full_name: 'test/pond' } },
        };
        await Bun.write(prFile, JSON.stringify(pr));
        await Bun.write(releasesFile, '[]');
        const published = run();
        expect(published.stderr.toString()).toBe('');
        expect(published.exitCode).toBe(0);
        const call = await Bun.file(callsFile).text();
        expect(call).toContain(`--target\n${sha}\n`);
        expect(call).toContain('create\nv0.2.0\n');
        expect(await Bun.file(join(root, 'pond-release-notes.md')).text()).toBe(plan.notes);

        git('tag', 'v0.2.0');
        await Bun.write(releasesFile, JSON.stringify([{ tag_name: 'v0.2.0', draft: false, prerelease: false }]));
        await rm(callsFile);
        expect(run().exitCode).toBe(0);
        expect(await Bun.file(callsFile).exists()).toBe(false);

        git('tag', '-f', 'v0.2.0', previous);
        expect(run().exitCode).toBe(1);
        expect(await Bun.file(callsFile).exists()).toBe(false);
        git('tag', '-f', 'v0.2.0', sha);
        pr.merge_commit_sha = previous;
        await Bun.write(prFile, JSON.stringify(pr));
        expect(run().stderr.toString()).toContain('not the merged release PR');
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
