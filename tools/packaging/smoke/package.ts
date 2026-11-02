import { join, resolve } from 'node:path';
import { archiveName, describeArtifact } from '../index';
import type { BuildManifest, Target } from '../types';

export const verifyArchive = async (target: Target) => {
    const out = resolve('dist', target);
    const manifest: BuildManifest = await Bun.file(join(out, `${target}.json`)).json();
    const archive = join(out, archiveName(manifest.version, target));

    if (JSON.stringify(await describeArtifact(archive, manifest.archive.name)) !== JSON.stringify(manifest.archive)) {
        throw new Error('Archive does not match build manifest.');
    }

    return { archive, version: manifest.version };
};
