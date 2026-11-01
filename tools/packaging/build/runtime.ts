import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { run, targets } from '../index';
import type { BuildContext } from '../types';

export const downloadRuntime = async ({ target, runtime }: BuildContext) => {
    const config = targets[target];
    await mkdir(runtime, { recursive: true });

    const response = await fetch(config.url);
    if (!response.ok) throw new Error(`Runtime download failed: ${response.status}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (`sha512-${createHash('sha512').update(bytes).digest('base64')}` !== config.integrity) {
        throw new Error('Bun runtime integrity mismatch.');
    }

    await Bun.write(join(runtime, 'runtime.tgz'), bytes);
    run(['tar', '-xzf', join(runtime, 'runtime.tgz'), '-C', runtime]);

    return join(runtime, 'package/bin', process.platform === 'win32' ? 'bun.exe' : 'bun');
};
