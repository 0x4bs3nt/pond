import { expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { archiveName, buildBunVersion, describeArtifact, targetNames } from '../../packaging';
import { createPlan } from '../policy';

const script = resolve('tools/release/publish.ts');

test('publishes despite a stale release list, retries safely, and refuses a conflicting tag', async () => {
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
    const remote = join(root, 'remote');
    await mkdir(remote);
    const artifacts = join(cwd, 'dist/release');
    await mkdir(artifacts, { recursive: true });
    let failUpload = false;
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
                POND_TEST_REMOTE: remote,
                POND_TEST_FAIL_UPLOAD: failUpload ? '1' : '0',
                POND_TEST_STALE_LIST: failUpload ? '1' : '0',
            },
            stdout: 'pipe',
            stderr: 'pipe',
        });
    try {
        await Bun.write(
            join(bin, 'gh'),
            '#!' +
                process.execPath +
                '\n' +
                (await Bun.file(resolve('tools/release/tests/fixtures/gh-publish.ts')).text())
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
        for (const target of targetNames) {
            const name = archiveName(plan.version, target);
            await Bun.write(join(artifacts, name), `fixture archive ${target}`);
            await Bun.write(
                join(artifacts, `${target}.json`),
                JSON.stringify({
                    version: plan.version,
                    commit: sha,
                    target,
                    bun: buildBunVersion,
                    archive: await describeArtifact(join(artifacts, name), name),
                })
            );
        }
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
        const missingManifest = join(artifacts, targetNames.at(-1) + '.json');
        const manifestContents = await Bun.file(missingManifest).text();
        await rm(missingManifest);
        expect(run().exitCode).toBe(1);
        expect(await Bun.file(callsFile).exists()).toBe(false);
        await Bun.write(missingManifest, manifestContents);
        failUpload = true;
        expect(run().exitCode).toBe(1);
        expect((await Bun.file(releasesFile).json())[0].draft).toBe(true);
        expect((await Bun.file(releasesFile).json())[0].assets).toHaveLength(1);
        failUpload = false;
        const published = run();
        expect(published.stderr.toString()).toBe('');
        expect(published.exitCode).toBe(0);
        const call = await Bun.file(callsFile).text();
        expect(call).toContain(
            'create\n' +
                JSON.stringify({
                    tag_name: 'v0.2.0',
                    target_commitish: sha,
                    name: 'v0.2.0',
                    body: plan.notes,
                    draft: true,
                })
        );

        git('tag', 'v0.2.0');
        expect((await Bun.file(releasesFile).json())[0].draft).toBe(false);
        await rm(callsFile);
        expect(run().exitCode).toBe(0);
        expect(await Bun.file(callsFile).text()).not.toContain('upload\n');
        await rm(callsFile);

        const firstArchive = archiveName(plan.version, targetNames[0]!);
        await Bun.write(join(remote, firstArchive), 'different bytes');
        expect(run().stderr.toString()).toContain('Refusing to replace');
        expect(await Bun.file(callsFile).text()).not.toContain('upload\n');
        await rm(callsFile);

        const manifestFile = join(artifacts, targetNames[0] + '.json');
        const manifest = await Bun.file(manifestFile).json();
        await Bun.write(manifestFile, JSON.stringify({ ...manifest, commit: previous }));
        expect(run().stderr.toString()).toContain('metadata mismatch');
        expect(await Bun.file(callsFile).exists()).toBe(false);
        await Bun.write(manifestFile, JSON.stringify(manifest));
        await Bun.write(join(artifacts, firstArchive), 'corrupt local archive');
        expect(run().stderr.toString()).toContain('checksum mismatch');
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
