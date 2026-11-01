import { format } from 'prettier';

import { api, assertPromotion, changelogAt, git, latestTag } from './io';
import type { PullRequest } from './io';
import { createPlan, renderChangelog } from './policy';

const mode = process.argv[2];
if (!['prepare', 'check'].includes(mode ?? '')) throw new Error('Expected prepare or check.');
const number = process.env.RELEASE_PR_NUMBER;
if (!number || !/^\d+$/.test(number)) throw new Error('RELEASE_PR_NUMBER is required.');
const pr = api(`pulls/${number}`) as PullRequest;
assertPromotion(pr);
if (pr.state !== 'open') throw new Error('The release PR is no longer open.');
if (git('rev-parse', 'HEAD') !== pr.head.sha)
    throw new Error('PR changed; rerun preparation on the current dev commit.');
if (git('rev-parse', 'origin/main') !== pr.base.sha) throw new Error('Main changed; rerun with an updated checkout.');

const previousTag = latestTag('origin/main');
if (git('ls-tree', '--name-only', 'origin/main', '--', '.release.json')) {
    const previous = JSON.parse(git('show', 'origin/main:.release.json'));
    if (previousTag !== `v${previous.version}` || git('rev-parse', `${previousTag}^{commit}`) !== pr.base.sha) {
        throw new Error(
            'The previous main release has not been tagged yet. Finish that release before preparing another.'
        );
    }
}
const plan = createPlan(previousTag, pr.number, pr.title, pr.body ?? '');
const config = await Bun.file('.prettierrc').json();
const packageJson = await Bun.file('package.json').json();
packageJson.version = plan.version;
const files = {
    'package.json': await format(JSON.stringify(packageJson), { ...config, parser: 'json' }),
    '.release.json': await format(JSON.stringify(plan), { ...config, parser: 'json' }),
    'CHANGELOG.md': await format(renderChangelog(plan, changelogAt('origin/main')), { ...config, parser: 'markdown' }),
};

for (const [path, expected] of Object.entries(files)) {
    if (mode === 'prepare') {
        await Bun.write(path, expected);
    } else if (!(await Bun.file(path).exists()) || (await Bun.file(path).text()) !== expected) {
        throw new Error(`${path} is stale. Wait for Prepare release to update dev, then rerun CI.`);
    }
}
console.log(`${mode === 'prepare' ? 'Prepared' : 'Validated'} v${plan.version} for PR #${pr.number}.`);
