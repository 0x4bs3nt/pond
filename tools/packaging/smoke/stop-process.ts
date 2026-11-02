import type { SmokeProcess } from '../types';

const waitForExit = async (child: SmokeProcess, timeoutMs: number) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            child.exited.then(() => true),

            new Promise<boolean>((resolve) => {
                timer = setTimeout(() => resolve(false), timeoutMs);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
};

export const stopProcess = async (child: SmokeProcess, graceMs = 1000) => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');

    if (await waitForExit(child, graceMs)) return;

    child.kill('SIGKILL');
    if (!(await waitForExit(child, 1000))) throw new Error('Packaged process did not exit after forced termination.');
};
