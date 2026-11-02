import { resolve } from 'node:path';
import { collectAssets } from './assets';
import { ensureRelease, publishRelease, uploadAndVerifyAssets } from './github-release';
import { validateRelease } from './validate-release';

const context = await validateRelease();
const directory = resolve('dist/release');

const artifacts = await collectAssets(directory, context.plan.version, context.sha);
const release = await ensureRelease(context);
await uploadAndVerifyAssets(release, artifacts, directory);
publishRelease(release);

console.log(`Published and verified ${context.tag} at ${context.sha}.`);
