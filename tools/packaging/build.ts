import { join } from 'node:path';
import { archiveName } from './index';
import { createArchive } from './archive';
import { prepareBuild, compileExecutable, writeBuildMetadata, writeManifest } from './build/package';
import { downloadRuntime } from './build/runtime';
import { copyNotices } from './build/notices';

const context = await prepareBuild();
const runtime = await downloadRuntime(context);

compileExecutable(context, runtime);

await copyNotices(context.stage);
await writeBuildMetadata(context);

const archive = join(context.out, archiveName(context.version, context.target));

createArchive(context.stage, archive);
await writeManifest(context);

console.log(`Built ${archive}. Run bun run package:check before distributing.`);
