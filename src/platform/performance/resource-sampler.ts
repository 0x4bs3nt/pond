import { createBoundedHistory } from './bounded-history';
import { createDistribution } from './distribution';
import type { RendererSchedulerState } from '@opentui/core';
import type { DiagnosticsRuntime, ResourceSample } from './types';

export const diagnosticsRuntime: DiagnosticsRuntime = {
    now: () => performance.now(),
    readResources: () => {
        const cpu = process.cpuUsage();
        const memory = process.memoryUsage();
        return {
            cpuUserUs: cpu.user,
            cpuSystemUs: cpu.system,
            rssBytes: memory.rss,
            heapUsedBytes: memory.heapUsed,
        };
    },
    everySecond: (callback) => {
        const timer = setInterval(callback, 1000);
        timer.unref();
        return () => clearInterval(timer);
    },
};

export const createResourceSampler = (runtime: DiagnosticsRuntime) => {
    const history = createBoundedHistory<ResourceSample>(600);

    const cpuPercent = createDistribution();
    const rssBytes = createDistribution();
    const heapUsedBytes = createDistribution();

    const startedAt = runtime.now();
    let previousAt = startedAt;
    let previous = runtime.readResources();
    let previousFrames = 0;
    let rejectedIntervals = 0;

    return {
        sample: (frames: number, scheduler: RendererSchedulerState) => {
            const now = runtime.now();
            const current = runtime.readResources();
            const intervalMs = now - previousAt;
            const userUs = current.cpuUserUs - previous.cpuUserUs;
            const systemUs = current.cpuSystemUs - previous.cpuSystemUs;
            const cpuUs = userUs + systemUs;
            const completedFrames = frames - previousFrames;

            previousAt = now;
            previous = current;
            previousFrames = frames;

            if (
                !Number.isFinite(intervalMs) ||
                intervalMs <= 0 ||
                !Number.isFinite(cpuUs) ||
                userUs < 0 ||
                systemUs < 0 ||
                !Number.isFinite(current.rssBytes) ||
                current.rssBytes < 0 ||
                !Number.isFinite(current.heapUsedBytes) ||
                current.heapUsedBytes < 0
            ) {
                rejectedIntervals++;

                return;
            }

            // One fully occupied CPU core is 100%; multicore work can exceed it.
            const cpu = cpuUs / (intervalMs * 10);

            cpuPercent.add(cpu);
            rssBytes.add(current.rssBytes);
            heapUsedBytes.add(current.heapUsedBytes);
            history.add({
                elapsedMs: now - startedAt,
                intervalMs,
                cpuPercent: cpu,
                rssBytes: current.rssBytes,
                heapUsedBytes: current.heapUsedBytes,
                completedFrames,
                scheduler: {
                    isRunning: scheduler.isRunning,
                    isRendering: scheduler.isRendering,
                    hasScheduledRender: scheduler.hasScheduledRender,
                },
            });
        },
        snapshot: () => {
            const { entries, evicted } = history.snapshot();

            return {
                entries: entries.map((sample) => ({ ...sample, scheduler: { ...sample.scheduler } })),
                evicted,
                rejectedIntervals,
                cpuPercent: cpuPercent.snapshot(),
                rssBytes: rssBytes.snapshot(),
                heapUsedBytes: heapUsedBytes.snapshot(),
            };
        },
    };
};
