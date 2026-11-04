import { expect, test } from 'bun:test';
import { createResourceSampler } from '../resource-sampler';
import type { ResourceReading } from '../types';

test('resource trends use elapsed time and cumulative CPU deltas with bounded retention', () => {
    let now = 0;
    let cpuUserUs = 0;
    const sampler = createResourceSampler({
        now: () => now,
        readResources: () => ({ cpuUserUs, cpuSystemUs: 0, rssBytes: 1000 + now, heapUsedBytes: 500 }),
        everySecond: () => {
            throw new Error('Sampler must not create its own timer.');
        },
    });
    const scheduler = { isRunning: false, isRendering: false, hasScheduledRender: false };
    for (let index = 1; index <= 605; index++) {
        now += 2000; // A delayed timer still computes CPU against the actual elapsed interval.
        cpuUserUs += 3000000;
        sampler.sample(index * 2, scheduler);
    }
    const result = sampler.snapshot();
    expect(result.entries).toHaveLength(600);
    expect(result.evicted).toBe(5);
    expect(result.entries[0]?.elapsedMs).toBe(12000);
    expect(result.entries.at(-1)?.completedFrames).toBe(2);
    expect(result.cpuPercent.mean).toBe(150);
    expect(result.cpuPercent.count).toBe(605);
    expect(result.rssBytes.max).toBe(1211000);
    expect(result.heapUsedBytes.mean).toBe(500);
    result.entries[0]!.scheduler.isRunning = true;
    expect(sampler.snapshot().entries[0]?.scheduler.isRunning).toBe(false);
});

test('invalid resource intervals are excluded and readings never persist arbitrary fields', () => {
    let now = 0;
    const reading: ResourceReading & { sql: string } = {
        cpuUserUs: 100,
        cpuSystemUs: 100,
        rssBytes: 1024,
        heapUsedBytes: 512,
        sql: 'secret query',
    };
    const sampler = createResourceSampler({
        now: () => now,
        readResources: () => ({ ...reading }),
        everySecond: () => () => {},
    });
    const scheduler = { isRunning: false, isRendering: false, hasScheduledRender: false };
    sampler.sample(0, scheduler); // Zero elapsed time.
    now = 1000;
    reading.cpuUserUs = 0; // Counter reset cannot be hidden by growth of the other counter.
    reading.cpuSystemUs = 1000;
    sampler.sample(0, scheduler);
    now = 2000;
    sampler.sample(0, scheduler);
    const result = sampler.snapshot();
    expect(result.rejectedIntervals).toBe(2);
    expect(result.cpuPercent.count).toBe(1);
    expect(result.cpuPercent.mean).toBe(0);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('sql');
});
