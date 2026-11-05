import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSmokeContext } from '../../smoke/commands';
import { checkRenderer } from '../../smoke/renderer';

// A real PTY child rejects premature input. These delays exceed the old fixed sleeps.
for (const [phase, startDelay, demoDelay] of [
    ['startup', 600, 0],
    ['demo', 0, 600],
] as const) {
    test.skipIf(process.platform === 'win32')(
        `renderer smoke waits for delayed ${phase} before sending keys`,
        async () => {
            const directory = await mkdtemp(join(tmpdir(), 'pond-renderer-test-'));
            try {
                const context = createSmokeContext(directory);
                const fixture = await Bun.file(join(import.meta.dir, 'fixtures/delayed-renderer.ts')).text();
                await writeFile(context.executable, `#!${process.execPath}\n${fixture}`, { mode: 0o700 });
                context.env.POND_TEST_START_DELAY = String(startDelay);
                context.env.POND_TEST_DEMO_DELAY = String(demoDelay);
                await checkRenderer(context);
                expect(JSON.parse(await readFile(join(context.logs, 'actions.json'), 'utf8'))).toEqual([
                    'demo',
                    'quit',
                ]);
            } finally {
                await rm(directory, { recursive: true, force: true });
            }
        },
        10000
    );
}
