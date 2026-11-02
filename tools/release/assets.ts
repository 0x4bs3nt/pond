import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { archiveName, buildBunVersion, describeArtifact, targetNames } from '../packaging';
import type { Artifact, BuildManifest } from '../packaging';

export const collectAssets = async (directory: string, version: string, commit: string): Promise<Artifact[]> => {
    const artifacts: Artifact[] = [];
    const allowed = new Set<string>();

    for (const target of targetNames) {
        const name = `${target}.json`;
        const manifest: BuildManifest = await Bun.file(join(directory, name)).json();

        const expectedName = archiveName(version, target);
        if (
            manifest.version !== version ||
            manifest.commit !== commit ||
            manifest.target !== target ||
            manifest.bun !== buildBunVersion ||
            manifest.archive.name !== expectedName
        ) {
            throw new Error(`Release artifact metadata mismatch: ${target}`);
        }

        const actual = await describeArtifact(join(directory, expectedName), expectedName);
        if (actual.sha256 !== manifest.archive.sha256 || actual.size !== manifest.archive.size) {
            throw new Error(`Release archive checksum mismatch: ${target}`);
        }

        artifacts.push(actual, await describeArtifact(join(directory, name), name));
        allowed.add(name);
        allowed.add(expectedName);
    }

    for (const name of await readdir(directory)) {
        if (!allowed.has(name) && name !== 'SHA256SUMS') throw new Error(`Unexpected release file: ${name}`);
    }

    artifacts.sort((a, b) => a.name.localeCompare(b.name));
    await Bun.write(
        join(directory, 'SHA256SUMS'),
        artifacts.map((asset) => `${asset.sha256}  ${asset.name}\n`).join('')
    );

    return [...artifacts, await describeArtifact(join(directory, 'SHA256SUMS'), 'SHA256SUMS')];
};
