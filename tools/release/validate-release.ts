import { api, assertPromotion, git, latestTag } from './io';
import { createPlan } from './policy';
import type { PullRequest, ReleaseContext, ReleasePlan } from './types';

export const validateRelease = async (): Promise<ReleaseContext> => {
    const sha = git('rev-parse', 'HEAD');

    const parents = git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ');
    if (parents.length !== 2) throw new Error('Release must be a squash commit with exactly one parent.');

    const plan = (await Bun.file('.release.json').json()) as ReleasePlan;
    if (!Number.isSafeInteger(plan.pullRequest) || plan.pullRequest < 1) throw new Error('Invalid release PR number.');

    const pr = api(`pulls/${plan.pullRequest}`) as PullRequest;
    assertPromotion(pr);

    if (!pr.merged || pr.merge_commit_sha !== sha) throw new Error('This commit is not the merged release PR.');

    const expected = createPlan(latestTag('HEAD^'), pr.number, plan.title, pr.body ?? '');
    if (JSON.stringify(plan) !== JSON.stringify(expected)) throw new Error('Release metadata is inconsistent.');
    if ((await Bun.file('package.json').json()).version !== plan.version) throw new Error('Package version mismatch.');

    const tag = `v${plan.version}`;
    const existingTag = git('tag', '--list', tag);
    if (existingTag && git('rev-parse', `${tag}^{commit}`) !== sha) {
        throw new Error(`${tag} already points to a different commit; refusing to move it.`);
    }

    return { sha, tag, plan, hasMatchingTag: Boolean(existingTag) };
};
