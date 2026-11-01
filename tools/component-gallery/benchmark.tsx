import { act, useState } from 'react';

import { testRender } from '@opentui/react/test-utils';
import type { BaseRenderable } from '@opentui/core';
import { Command, InvalidArgumentError, Option } from 'commander';

import { discardDeliveredMeasures } from '../../src/platform/performance';
import { DataGrid, type CellPosition } from '../../src/components/data-grid';
import { createStressData } from './stress-data';
import type { BenchmarkOptions } from './types';

const positive = (value: string) => {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) throw new InvalidArgumentError('Expected a positive integer.');

    return number;
};

const program = new Command()
    .name('gallery:bench')
    .description('Headless grid input-to-render measurements; no terminal I/O.')
    .addOption(new Option('--rows <n>').argParser(positive).default(100_000))
    .addOption(new Option('--columns <n>').argParser(positive).default(256))
    .addOption(new Option('--steps <n>').argParser(positive).default(300))
    .addOption(new Option('--rounds <n>').argParser(positive).default(3))
    .addOption(new Option('--value-length <n>').argParser(positive).default(32));
program.parse();

const options = program.opts<BenchmarkOptions>();
const data = createStressData(options.rows, options.columns, options.valueLength);

const countNodes = (node: BaseRenderable): number =>
    1 + node.getChildren().reduce((sum, child) => sum + countNodes(child), 0);

const memory = () => {
    Bun.gc(true);
    const m = process.memoryUsage();
    return { heapMiB: +(m.heapUsed / 2 ** 20).toFixed(2), rssMiB: +(m.rss / 2 ** 20).toFixed(2) };
};

const size = { width: 120, height: 36 };
let observedColumn = 0;
const Harness = () => {
    const [selection, onSelect] = useState<CellPosition>({ row: 0, column: 0 });
    return (
        <DataGrid
            {...data}
            {...size}
            selection={selection}
            onSelect={(position) => {
                observedColumn = position.column;
                onSelect(position);
            }}
            getInteraction={() => 'focused'}
            onFocus={() => {}}
        />
    );
};

const stopTimingCleanup = discardDeliveredMeasures();
const start = performance.now();
const view = await testRender(<Harness />, size);
const samples = [];

try {
    await view.renderOnce();
    const initialMs = performance.now() - start;
    const baselineNodes = countNodes(view.renderer.root);

    // Warm the renderer before recording memory and steady-state timings.
    for (let i = 0; i < 30; i++) {
        await act(async () => view.mockInput.pressArrow('down'));
        await view.renderOnce();
    }

    const baselineMemory = memory();
    for (let round = 0; round < options.rounds; round++) {
        const times: number[] = [];
        let peakNodes = 0;
        let minColumn = options.columns - 1;
        let maxColumn = 0;
        for (let step = 0; step < options.steps; step++) {
            const begin = performance.now();
            await act(async () => {
                const phase = step % 100;
                if (phase === 0) view.mockInput.pressKey('END', { ctrl: true });
                else if (phase === 1) view.mockInput.pressKey('HOME', { ctrl: true });
                else if (phase === 2 || phase === 52) view.mockInput.pressKey('HOME');
                else if (phase < 27) view.mockInput.pressArrow('right');
                else if (phase === 27) view.mockInput.pressKey('END');
                else if (phase < 52) view.mockInput.pressArrow('left');
                else view.mockInput.pressArrow(phase % 4 === 0 ? 'up' : 'down');
            });
            await view.renderOnce();
            times.push(performance.now() - begin);

            // Permit native renderable destruction and finalizers between input events.
            await Bun.sleep(1);
            minColumn = Math.min(minColumn, observedColumn);
            maxColumn = Math.max(maxColumn, observedColumn);
            peakNodes = Math.max(peakNodes, countNodes(view.renderer.root));
        }
        times.sort((a, b) => a - b);
        samples.push({
            round: round + 1,
            p50Ms: +times[Math.floor(times.length * 0.5)]!.toFixed(3),
            p95Ms: +times[Math.floor(times.length * 0.95)]!.toFixed(3),
            maxMs: +times.at(-1)!.toFixed(3),
            peakNodes,
            minColumn,
            maxColumn,
            retainedMeasures: performance.getEntriesByType('measure').length,
            ...memory(),
        });
    }
    process.stdout.write(
        JSON.stringify(
            {
                workload: 'mixed-axis-v2',
                runtime: Bun.version,
                platform: process.platform,
                arch: process.arch,
                options,
                terminal: size,
                initialMs: +initialMs.toFixed(3),
                baselineNodes,
                baselineMemory,
                samples,
            },
            null,
            2
        ) + '\n'
    );
} finally {
    await act(async () => view.dispose());
    stopTimingCleanup();
}
