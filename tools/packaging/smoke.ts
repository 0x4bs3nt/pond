import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hostTarget } from './index';
import { extractArchive } from './archive';
import { verifyArchive } from './smoke/package';
import { createSmokeContext, checkCommands } from './smoke/commands';
import { checkRenderer } from './smoke/renderer';
import { verifyRuntimeNotices } from './verify-notices';

const target = hostTarget();
const { archive, version } = await verifyArchive(target);
const directory = await mkdtemp(join(tmpdir(), 'pond-package-'));

try {
    extractArchive(archive, directory);
    await verifyRuntimeNotices(join(directory, 'licenses', 'bun-runtime'));
    const context = createSmokeContext(directory);

    await checkCommands(context, version);
    await checkRenderer(context);

    console.log(
        `Validated ${target}: runtime notices, version, help, renderer, logs, normal quit, terminal restoration (no Bun on PATH).`
    );
} finally {
    await rm(directory, { recursive: true, force: true });
}
