import { stopProcess } from './stop-process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { invokeCommand } from './commands';
import type { SmokeContext } from '../types';

const readRecords = async (logs: string) => {
    const files = await readdir(logs).catch(() => [] as string[]);

    return (
        await Promise.all(
            files.filter((file) => file.endsWith('.jsonl')).map((file) => Bun.file(join(logs, file)).text())
        )
    ).join('');
};

export const checkRenderer = async (context: SmokeContext) => {
    const { cwd, env, executable, logs } = context;
    let output = '';

    const child = Bun.spawn([executable], {
        cwd,
        env,
        terminal: {
            cols: 100,
            rows: 30,
            data: (_terminal, bytes) => {
                output = (output + new TextDecoder().decode(bytes)).slice(-100000);
            },
        },
    });

    const waitFor = async (ready: () => boolean, phase: string) => {
        const deadline = Date.now() + 15000;
        while (!ready()) {
            if (child.exitCode !== null)
                throw new Error(`Packaged app exited with code ${child.exitCode} while waiting for ${phase}.`);
            if (Date.now() > deadline) throw new Error(`Timed out waiting for packaged app ${phase}.`);
            await Bun.sleep(50);
        }
    };

    try {
        // app.started precedes React mounting. Send input only after each destination renders.
        await waitFor(() => output.includes('POND / Connections'), 'connection screen');
        child.terminal!.write('\x1bOQ');
        await waitFor(() => output.includes('POND / Database workspace'), 'mock workspace');
        child.terminal!.write('q');

        await waitFor(() => child.exitCode !== null, 'normal quit');
        if (child.exitCode !== 0) throw new Error(`Packaged app did not exit cleanly (code ${child.exitCode}).`);

        const log = await readRecords(logs);

        if (!log.includes('app.stopped') || /app.fatal|ui.failed|shutdown.failed/.test(log))
            throw new Error('Unexpected lifecycle failure.');
        if (!output.includes('\x1b[?1049l')) throw new Error('Terminal was not restored.');
        if (!invokeCommand(context, 'logs').includes('app.started')) throw new Error('Log reader failed.');
    } finally {
        try {
            await stopProcess(child);
        } finally {
            child.terminal?.close();
        }
    }
};
