import { expect, test } from 'bun:test';
import { stopProcess } from '../../smoke/stop-process';

test.skipIf(process.platform === 'win32')(
    'forces termination when a real child ignores SIGTERM',
    async () => {
        const child = Bun.spawn(
            [
                process.execPath,
                '-e',
                'process.on("SIGTERM", () => {}); console.log("ready"); setInterval(() => {}, 1000);',
            ],
            { stdout: 'pipe', stderr: 'pipe' }
        );
        try {
            const reader = child.stdout.getReader();
            const { value } = await reader.read();
            reader.releaseLock();
            expect(new TextDecoder().decode(value)).toContain('ready');

            await stopProcess(child, 50);
            expect(child.signalCode).toBe('SIGKILL');
        } finally {
            // Ensure even a failing assertion cannot leave the fixture process behind.
            child.kill('SIGKILL');
            await child.exited;
        }
    },
    5000
);
