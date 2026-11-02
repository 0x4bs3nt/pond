import { createHash } from 'node:crypto';
import targets from './targets.json';
import type { Artifact, BuildHost, RuntimeReport, Target } from './types';

export { targets };
export type { Artifact, BuildManifest, Target } from './types';

export const buildBunVersion = '1.4.2';
export const targetNames = Object.keys(targets) as Target[];

export const selectTarget = ({ platform, arch, libc }: BuildHost): Target => {
    const target = targetNames.find(
        (name) => targets[name].platform === platform && targets[name].arch === arch && targets[name].libc === libc
    );
    if (!target) throw new Error(`No build configuration for ${platform}/${arch}/${libc ?? 'native'}.`);

    return target;
};

export const hostTarget = (): Target => {
    const report = process.platform === 'linux' ? (process.report.getReport() as RuntimeReport) : undefined;
    const libc = report ? (report.header.glibcVersionRuntime ? 'glibc' : 'musl') : null;

    const target = selectTarget({ platform: process.platform, arch: process.arch, libc });

    const expected = process.env.POND_PACKAGE_TARGET;
    if (expected && expected !== target) throw new Error(`Expected ${expected}, but this build host is ${target}.`);

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
