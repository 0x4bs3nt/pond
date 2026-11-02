import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hostTarget } from './index';
import { extractArchive } from './archive';
import { verifyArchive } from './smoke/package';
import { createSmokeContext, checkCommands } from './smoke/commands';
import { checkRenderer } from './smoke/renderer';
import { verifyRuntimeNotices } from './verify-notices';
import { removeSmokeDirectory } from './smoke/cleanup';

const target = hostTarget();
const { archive, version } = await verifyArchive(target);
const directory = await mkdtemp(join(tmpdir(), 'pond-package-'));

try {
    extractArchive(archive, directory);
    await verifyRuntimeNotices(join(directory, 'licenses', 'bun-runtime'));
    const context = createSmokeContext(directory);

    await checkCommands(context, version);
    await checkRenderer(context);
} finally {
    await removeSmokeDirectory(directory);
}

console.log(
    `Validated ${target}: runtime notices, version, help, renderer, logs, normal quit, terminal restoration (no Bun on PATH).`
);
