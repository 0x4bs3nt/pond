import { expect, test } from 'bun:test';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyRuntimeNotices } from '../verify-notices';
import { copyNotices } from '../build/notices';

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

test('bundled PostgreSQL dependencies retain MIT notices distributed only in readmes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pond-package-notices-'));
    try {
        await copyNotices(directory);
        for (const name of ['pg-types', 'pgpass']) {
            const notice = await Bun.file(join(directory, 'licenses', `${name}--README.md`)).text();
            expect(notice).toContain('Copyright (c)');
            expect(notice).toContain('Permission is hereby granted, free of charge');
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
