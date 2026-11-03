import { Profiler, useLayoutEffect, useState } from 'react';
import { createRoot, useKeyboard } from '@opentui/react';
import { createTestRenderer } from '@opentui/core/testing';
import { discardDeliveredMeasures } from '../../src/platform/performance';
import type { ProbeCommit, ProbeFrame } from './types';

const frames: ProbeFrame[] = [];
const commits: ProbeCommit[] = [];

let revision = -1;
let inputCount = 0;

const Fixture = () => {
    const [value, setValue] = useState(0);

    useKeyboard((key) => {
        if (key.name === 'down') setValue((previous) => previous + 1);
    });

    useLayoutEffect(() => {
        revision = value;
    }, [value]);

    return <text>{`revision:${value}`}</text>;
};

const stopTimingCleanup = discardDeliveredMeasures();

const waitForRevision = async (expected: number) => {
    const deadline = performance.now() + 2000;
    while (revision !== expected) {
        if (performance.now() >= deadline) throw new Error('React probe did not commit the expected revision.');

        await Bun.sleep(1);
    }
};

const view = await createTestRenderer({ width: 40, height: 8, gatherStats: true, maxStatSamples: 32 });
const root = createRoot(view.renderer);
const onInput = () => {
    inputCount++;
};

view.renderer.keyInput.prependListener('keypress', onInput);
view.renderer.on('frame', ({ frameId }: { frameId: number }) => {
    const frame: ProbeFrame = {
        frameId,
        revision,
        samplesDuringEvent: view.renderer.getStats().frameTimes.length,
    };
    frames.push(frame);

    queueMicrotask(() => {
        if (!view.renderer.isDestroyed) frame.samplesAfterEvent = view.renderer.getStats().frameTimes.length;
    });
});

try {
    root.render(
        <Profiler
            id="probe"
            onRender={(_id, phase, actualDuration, baseDuration) => {
                commits.push({ phase, actualDurationMs: actualDuration, baseDurationMs: baseDuration });
            }}
        >
            <Fixture />
        </Profiler>
    );
    await waitForRevision(0);
    await view.waitForFrame((frame) => frame.includes('revision:0'));
    await view.flush();

    const initial = { frames: frames.length, commits: commits.length };
    for (let index = 0; index < 3; index++) view.mockInput.pressArrow('down');

    await waitForRevision(3);
    await view.waitForFrame((frame) => frame.includes('revision:3'));
    await view.flush();
    const batch = {
        inputs: inputCount,
        frames: frames.length - initial.frames,
        commits: commits.length - initial.commits,
    };

    const beforeNoop = { frames: frames.length, commits: commits.length };
    view.mockInput.pressArrow('up'); // No state change in this fixture.
    await view.flush();
    const noop = {
        inputs: inputCount - batch.inputs,
        frames: frames.length - beforeNoop.frames,
        commits: commits.length - beforeNoop.commits,
    };

    const beforeUnrelated = frames.length;
    view.renderer.requestRender();

    await view.flush();

    const unrelated = { frames: frames.length - beforeUnrelated, revision };
    const stats = view.renderer.getStats();
    const report = {
        runtime: Bun.version,
        reactMode: process.env.NODE_ENV ?? 'development',
        platform: process.platform,
        arch: process.arch,
        profiler: commits.length ? 'available' : 'unavailable',
        initial,
        batch,
        noop,
        unrelated,
        commits,
        frames,
        schedulerAfterFlush: view.renderer.getSchedulerState(),
        stats,
    };

    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
    view.renderer.keyInput.removeListener('keypress', onInput);
    root.unmount();

    await view.dispose();
    stopTimingCleanup();
}
