import { rm } from 'node:fs/promises';

export const removeSmokeDirectory = async (
    directory: string,
    remove = rm,
    wait: (milliseconds: number) => Promise<void> = Bun.sleep
) => {
    for (let attempt = 0; ; attempt++) {
        try {
            await remove(directory, { recursive: true, force: true });
            return;
        } catch (error) {
            const code = error instanceof Error && 'code' in error ? error.code : undefined;
            if (attempt === 5 || !['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(String(code))) throw error;

            // Windows can briefly retain handles after the executable and ConPTY have closed.
            await wait(200 * (attempt + 1));
        }
    }
};
