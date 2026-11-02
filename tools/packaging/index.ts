import { createHash } from 'node:crypto';
import targets from './targets.json';
import type { Artifact, Target } from './types';

export { targets };
export type { Artifact, BuildManifest, Target } from './types';

export const buildBunVersion = '1.4.2';
export const targetNames = Object.keys(targets) as Target[];

export const hostTarget = (): Target => {
    const target = targetNames.find(
        (name) => targets[name].platform === process.platform && targets[name].arch === process.arch
    );
    if (!target) throw new Error(`No validated build configuration for ${process.platform}/${process.arch}.`);

    return target;
};

export const run = (args: string[], env: NodeJS.ProcessEnv = {}) => {
    const result = Bun.spawnSync(args, { env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' });
    if (result.exitCode !== 0) throw new Error(`${args[0]} failed: ${result.stderr.toString()}`);

    return result.stdout.toString().trim();
};

export const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const describeArtifact = async (path: string, name: string): Promise<Artifact> => {
    const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());

    return { name, sha256: digest(bytes), size: bytes.length };
};

export const archiveName = (version: string, target: Target) =>
    `pond-v${version}-${target}.${targets[target].extension}`;
