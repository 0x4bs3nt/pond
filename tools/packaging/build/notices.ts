import { cp, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const copyNotices = async (stage: string) => {
    await cp('LICENSE', join(stage, 'LICENSE'));
    await cp('tools/packaging/BUN-LICENSE.md', join(stage, 'BUN-LICENSE.md'));

    const notices = join(stage, 'licenses');
    await mkdir(notices);
    await cp('tools/packaging/licenses', join(notices, 'bun-runtime'), { recursive: true });

    const visitPackage = async (directory: string, name: string) => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (entry.isFile() && /^(LICENSE|LICENCE|COPYING|NOTICE|AUTHORS|PATENTS)/i.test(entry.name)) {
                await cp(join(directory, entry.name), join(notices, `${name.replaceAll('/', '__')}--${entry.name}`));
            }
        }
    };

    for (const entry of await readdir('node_modules', { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;

        if (entry.name.startsWith('@')) {
            for (const child of await readdir(join('node_modules', entry.name))) {
                await visitPackage(join('node_modules', entry.name, child), `${entry.name}/${child}`);
            }
        } else if (entry.isDirectory() || entry.isSymbolicLink()) {
            await visitPackage(join('node_modules', entry.name), entry.name);
        }
    }
};
