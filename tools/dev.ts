import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const watchers: ReturnType<typeof watch>[] = [];

let child: ReturnType<typeof Bun.spawn> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

let restarting = false;
let restartRequested = false;
let stopping = false;

const closeWatchers = () => {
    clearTimeout(timer);

    for (const watcher of watchers) watcher.close();
};

const stopChild = async () => {
    if (!child) return;
    child.kill('SIGTERM');

    // OpenTUI restores terminal modes asynchronously. Let it finish before starting another renderer.
    await child.exited;
    child = undefined;
};

const shutdown = async () => {
    stopping = true;

    closeWatchers();
    await stopChild();
};

const startChild = () => {
    child = Bun.spawn([process.execPath, 'run', 'src/app/bootstrap.tsx'], {
        cwd,
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
    });

    const running = child;
    void running.exited.then((code) => {
        if (stopping || restarting || child !== running) return;
        if (code === 0) {
            stopping = true;
            closeWatchers();
        } else {
            console.error('Pond stopped. Waiting for a source change to restart.');
        }
    });
};

const restart = async () => {
    restartRequested = true;
    if (restarting || stopping) return;

    restarting = true;
    try {
        while (restartRequested && !stopping) {
            restartRequested = false;
            await stopChild();
            if (!stopping) startChild();
        }
    } finally {
        restarting = false;
    }
};

const scheduleRestart = () => {
    if (stopping) return;
    clearTimeout(timer);
    // Editors may replace a file through rename/delete/create events during a single save.
    timer = setTimeout(() => {
        void restart();
    }, 200);
};

watchers.push(watch(new URL('../src', import.meta.url), { recursive: true }, scheduleRestart));
watchers.push(
    watch(cwd, (_, filename) => {
        if (filename === 'package.json' || filename === 'tsconfig.json') scheduleRestart();
    })
);

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
startChild();
