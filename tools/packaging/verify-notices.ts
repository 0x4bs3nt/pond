import { join } from 'node:path';
import { buildBunVersion, digest } from './index';
import provenance from './licenses/provenance.json';

export const verifyRuntimeNotices = async (directory: string) => {
    if (provenance.bun !== buildBunVersion) {
        throw new Error('Review and refresh bundled runtime notices before upgrading Bun.');
    }

    const bundle = await Bun.file(join(directory, 'THIRD-PARTY-NOTICES.txt')).bytes();
    if (digest(bundle) !== provenance.bundleSha256) {
        throw new Error('Bundled runtime notices do not match the reviewed collection.');
    }

    for (const name of ['SOURCES.md', 'WEBKIT-COPYING.LIB', 'TINYCC-COPYING', 'provenance.json']) {
        const expected = await Bun.file(join(import.meta.dir, 'licenses', name)).bytes();
        const actual = await Bun.file(join(directory, name)).bytes();

        if (digest(actual) !== digest(expected)) throw new Error(`Missing or altered runtime notice: ${name}`);
    }
};
