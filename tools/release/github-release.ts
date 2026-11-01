import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeArtifact } from '../packaging';
import type { Artifact } from '../packaging';
import { api, repository, run } from './io';
import type { PublishedRelease, ReleaseContext } from './types';

const releaseCommand = (command: string, tag: string, ...args: string[]) =>
    run('gh', 'release', command, tag, ...args, '--repo', repository());

const readRelease = (id: number) => api(`releases/${id}`) as PublishedRelease;

const findRelease = (tag: string) => {
    const releases = api('releases?per_page=100') as PublishedRelease[];
    return releases.find((release) => release.tag_name === tag);
};

export const ensureRelease = async ({ sha, tag, plan, hasMatchingTag }: ReleaseContext): Promise<PublishedRelease> => {
    const existing = findRelease(tag);

    if (existing) {
        if (existing.prerelease) throw new Error('Existing release is a prerelease.');
        if (!existing.draft && !hasMatchingTag) throw new Error('Published release has no matching local tag.');
        if (existing.draft && existing.target_commitish !== sha && !hasMatchingTag) {
            throw new Error('Draft targets a different commit.');
        }

        return existing;
    }

    const notes = join(process.env.RUNNER_TEMP ?? tmpdir(), 'pond-release-notes.md');
    await Bun.write(notes, plan.notes);

    releaseCommand('create', tag, '--target', sha, '--title', tag, '--notes-file', notes, '--draft');

    const created = findRelease(tag);
    if (!created) throw new Error('Created draft could not be found.');
    return readRelease(created.id);
};

const verifyRemoteAsset = async (tag: string, asset: Artifact, directory: string, failure: string) => {
    releaseCommand('download', tag, '--pattern', asset.name, '--dir', directory);

    const downloaded = await describeArtifact(join(directory, asset.name), asset.name);
    if (downloaded.sha256 !== asset.sha256) throw new Error(`${failure}: ${asset.name}`);
};

const missingAssets = (release: PublishedRelease, artifacts: Artifact[]) => {
    const expectedNames = new Set(artifacts.map((asset) => asset.name));
    const remoteNames = new Set(release.assets.map((asset) => asset.name));

    if (release.assets.some((asset) => !expectedNames.has(asset.name))) {
        throw new Error('Release contains unexpected assets.');
    }

    const missing = artifacts.filter((asset) => !remoteNames.has(asset.name));
    if (!release.draft && missing.length > 0) {
        throw new Error(`Published release is incomplete: ${missing[0]!.name}`);
    }

    return missing;
};

export const uploadAndVerifyAssets = async (release: PublishedRelease, artifacts: Artifact[], directory: string) => {
    const tag = release.tag_name;
    const missing = missingAssets(release, artifacts);
    const missingNames = new Set(missing.map((asset) => asset.name));
    const temporary = await mkdtemp(join(tmpdir(), 'pond-release-verify-'));

    try {
        // Check every existing asset before making any upload; never overwrite differing bytes.
        for (const asset of artifacts) {
            if (!missingNames.has(asset.name)) {
                await verifyRemoteAsset(tag, asset, temporary, 'Refusing to replace different published bytes');
            }
        }

        for (const asset of missing) {
            releaseCommand('upload', tag, join(directory, asset.name));
        }

        const uploaded = readRelease(release.id);
        if (
            uploaded.assets.length !== artifacts.length ||
            artifacts.some((asset) => !uploaded.assets.some((remote) => remote.name === asset.name))
        ) {
            throw new Error('Release is missing required assets.');
        }
        for (const asset of missing) {
            await verifyRemoteAsset(tag, asset, temporary, 'Uploaded checksum mismatch');
        }
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }
};

export const publishRelease = (release: PublishedRelease) => {
    if (release.draft) releaseCommand('edit', release.tag_name, '--draft=false', '--latest');
};
