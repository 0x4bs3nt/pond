import { api, assertPromotion, git, latestTag, repository, run } from './io';
import type { PullRequest } from './io';
import { createPlan } from './policy';
import type { ReleasePlan } from './policy';

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
const releases = api('releases?per_page=100') as { tag_name: string; draft: boolean; prerelease: boolean }[];
const existing = releases.find((release) => release.tag_name === tag);
if (existing) {
    if (!existingTag || existing.draft || existing.prerelease)
        throw new Error('Existing release is not a stable release.');
    console.log(`${tag} is already published at ${sha}.`);
} else {
    const notes = `${process.env.RUNNER_TEMP ?? '/tmp'}/pond-release-notes.md`;
    await Bun.write(notes, plan.notes);
    run(
        'gh',
        'release',
        'create',
        tag,
        '--repo',
        repository(),
        '--target',
        sha,
        '--title',
        tag,
        '--notes-file',
        notes,
        '--latest'
    );
    console.log(`Published ${tag} at ${sha}.`);
}
