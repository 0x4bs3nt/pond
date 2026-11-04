import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SmokeContext } from '../types';

export const createSmokeContext = (cwd: string): SmokeContext => {
    const executable = join(cwd, process.platform === 'win32' ? 'pond.exe' : 'pond');
    const logs = join(cwd, 'logs');
    const env = {
        ...process.env,
        PATH: '',
        POND_LOG_DIR: logs,
        POND_CONFIG_DIR: join(cwd, 'config'),
        TERM: 'xterm-256color',
        BUN_OPTIONS: '',
        NODE_OPTIONS: '',
    };

    return { cwd, executable, logs, env };
};

export const invokeCommand = ({ cwd, env, executable }: SmokeContext, ...args: string[]) => {
    const result = Bun.spawnSync([executable, ...args], { cwd, env, stdout: 'pipe', stderr: 'pipe', timeout: 10000 });
    if (result.exitCode !== 0) throw new Error(result.stderr.toString());

    return result.stdout.toString();
};

export const checkCommands = async (context: SmokeContext, version: string) => {
    if (invokeCommand(context, '--version').trim() !== version) throw new Error('Wrong executable version.');
    if (!invokeCommand(context, '--help').includes('pond')) throw new Error('Missing command help.');

    invokeCommand(context, 'logs', '--help');
    if ((await readdir(context.cwd)).includes('logs')) throw new Error('Help/version must not create logs.');
};
