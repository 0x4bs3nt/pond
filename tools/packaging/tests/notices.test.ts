import { expect, test } from 'bun:test';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyRuntimeNotices } from '../verify-notices';

test('rejects incomplete or altered notices in an extracted package', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-notices-'));
    try {
        await cp(join(import.meta.dir, '../licenses'), directory, { recursive: true });
        await verifyRuntimeNotices(directory);

        await Bun.write(join(directory, 'THIRD-PARTY-NOTICES.txt'), 'Incomplete notices');
        await expect(verifyRuntimeNotices(directory)).rejects.toThrow('reviewed collection');

        await cp(
            join(import.meta.dir, '../licenses/THIRD-PARTY-NOTICES.txt'),
            join(directory, 'THIRD-PARTY-NOTICES.txt')
        );
        await rm(join(directory, 'WEBKIT-COPYING.LIB'));
        await expect(verifyRuntimeNotices(directory)).rejects.toThrow();
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
