import type targets from './targets.json';

export type Target = keyof typeof targets;
export type Artifact = { name: string; sha256: string; size: number };
export type BuildManifest = {
    version: string;
    commit: string;
    target: Target;
    bun: string;
    archive: Artifact;
};

export type BuildContext = {
    root: string;
    target: Target;
    version: string;
    commit: string;
    out: string;
    stage: string;
    runtime: string;
};

export type SmokeContext = {
    cwd: string;
    executable: string;
    logs: string;
    env: Record<string, string | undefined>;
};

export type SmokeProcess = Pick<Bun.Subprocess, 'exitCode' | 'exited' | 'kill'>;
