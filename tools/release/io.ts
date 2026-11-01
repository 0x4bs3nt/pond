import type { PullRequest } from './types';
export const run = (...args: string[]): string => {
    const result = Bun.spawnSync(args, { stdout: 'pipe', stderr: 'pipe' });

    if (result.exitCode !== 0) {
        throw new Error(`${args[0]} failed: ${result.stderr.toString().trim()}`);
    }

    return result.stdout.toString().trim();
};

export const git = (...args: string[]) => run('git', ...args);

export const repository = (): string => {
    const value = process.env.GITHUB_REPOSITORY;
    if (!value || !/^[\w.-]+\/[\w.-]+$/.test(value)) throw new Error('GITHUB_REPOSITORY is required.');

    return value;
};

export const api = (path: string): unknown => JSON.parse(run('gh', 'api', `repos/${repository()}/${path}`));

export const assertPromotion = (pr: PullRequest) => {
    if (pr.base.ref !== 'main' || pr.head.ref !== 'dev' || pr.head.repo?.full_name !== repository()) {
        throw new Error('Releases must come from a same-repository dev → main PR.');
    }
};

export const latestTag = (ref: string): string | null =>
    git('tag', '--merged', ref, '--sort=-version:refname')
        .split('\n')
        .find((tag) => /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)) ?? null;

export const changelogAt = (ref: string): string => {
    if (!git('ls-tree', '--name-only', ref, '--', 'CHANGELOG.md')) return '# Changelog\n';

    return git('show', `${ref}:CHANGELOG.md`);
};
