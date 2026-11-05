import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

if (process.argv[2] === 'logs') {
    process.stdout.write('app.started\n');
    process.exit(0);
}

const logs = process.env.POND_LOG_DIR!;
await mkdir(logs, { recursive: true });
const log = join(logs, 'fixture.jsonl');
await appendFile(log, '{"event":"app.started"}\n');

process.stdin.setRawMode(true);
let screen = 'starting';
const actions: string[] = [];
process.stdin.on('data', async (bytes) => {
    const input = bytes.toString();
    if (input === '\x1bOQ' && screen === 'connections') {
        actions.push('demo');
        screen = 'loading-demo';
        setTimeout(() => {
            screen = 'workspace';
            process.stdout.write('POND / Database workspace\n');
        }, Number(process.env.POND_TEST_DEMO_DELAY));
    } else if (input === 'q' && screen === 'workspace') {
        actions.push('quit');
        await writeFile(join(logs, 'actions.json'), JSON.stringify(actions));
        await appendFile(log, '{"event":"app.stopped"}\n');
        process.stdout.write('\x1b[?1049l');
        process.exit(0);
    } else {
        process.exit(2); // Input arrived before the destination was ready.
    }
});
setTimeout(() => {
    screen = 'connections';
    process.stdout.write('POND / Connections\n');
}, Number(process.env.POND_TEST_START_DELAY));
