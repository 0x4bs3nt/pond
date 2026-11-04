import { expect, test } from 'bun:test';
import { createTestRenderer } from '@opentui/core/testing';
import { diagnosticsRendererOptions, startDiagnostics } from '../index';
import type { DiagnosticsRuntime } from '../types';

test('collector consumes each completed pass once, normalizes native units, and stops on destruction', async () => {
    const view = await createTestRenderer({ width: 20, height: 5, ...diagnosticsRendererOptions('1') });
    let tick: (() => void) | undefined;
    let now = 0;
    let cancelled = 0;
    const runtime: DiagnosticsRuntime = {
        now: () => now,
        readResources: () => ({ cpuUserUs: now * 100, cpuSystemUs: 0, rssBytes: 1024, heapUsedBytes: 512 }),
        everySecond: (callback) => {
            tick = callback;
            return () => {
                cancelled++;
            };
        },
    };
    const collector = startDiagnostics(view.renderer, '1', runtime)!;
    try {
        let nativeRenderTotalMs = 0;
        let nativeRenderSamples = 0;
        for (let index = 0; index < 4; index++) {
            await view.renderOnce();
            const sample = view.getNativeStats().nativeRenderTime;
            if (sample !== undefined) {
                nativeRenderTotalMs += sample / 1000;
                nativeRenderSamples++;
            }
        }
        await Promise.resolve();
        const native = view.getNativeStats();
        const stats = view.renderer.getStats();
        const snapshot = collector.snapshot();
        expect(snapshot.completedFrames).toBe(4);
        expect(snapshot.renderer.jsPassMs.count).toBe(4);
        expect(snapshot.renderer.jsPassMs.mean).toBeCloseTo(stats.averageFrameTime, 8);
        expect(snapshot.renderer.nativeIntervalMs.count).toBe(3);
        if (native.nativeRenderTime !== undefined) {
            expect(snapshot.renderer.nativeRenderMs.count).toBe(nativeRenderSamples);
            expect(snapshot.renderer.nativeRenderMs.mean).toBeCloseTo(nativeRenderTotalMs / nativeRenderSamples, 8);
        }
        now = 1000;
        tick!();
        const resources = collector.snapshot().resources;
        expect(resources.entries[0]?.cpuPercent).toBe(10);
        expect(resources.entries[0]?.completedFrames).toBe(4);
        // Idle sampling must not request frames or turn on continuous rendering.
        now = 2000;
        tick!();
        expect(collector.snapshot().resources.entries[1]?.completedFrames).toBe(0);
        expect(view.renderer.getSchedulerState().isRunning).toBe(false);
        await view.dispose();
        collector.stop();
        const stopped = collector.snapshot();
        tick!(); // A callback already queued at shutdown is inert.
        await Promise.resolve();
        expect(collector.snapshot()).toEqual(stopped);
        expect(stopped.stopped).toBe(true);
        expect(cancelled).toBe(1);
    } finally {
        collector.stop();
        await view.dispose();
    }
});

test('default runs collect no frame history or resources and attach no diagnostic listeners', async () => {
    const view = await createTestRenderer({ width: 20, height: 5, ...diagnosticsRendererOptions(undefined) });
    const baselineFrames = view.renderer.listenerCount('frame');
    const baselineDestroy = view.renderer.listenerCount('destroy');
    let reads = 0;
    let timers = 0;
    const runtime: DiagnosticsRuntime = {
        now: () => 0,
        readResources: () => {
            reads++;
            return { cpuUserUs: 0, cpuSystemUs: 0, rssBytes: 0, heapUsedBytes: 0 };
        },
        everySecond: () => {
            timers++;
            return () => {};
        },
    };
    try {
        expect(startDiagnostics(view.renderer, undefined, runtime)).toBeUndefined();
        expect(startDiagnostics(view.renderer, 'true', runtime)).toBeUndefined();
        await view.renderOnce();
        expect(view.renderer.getStats().frameTimes).toHaveLength(0);
        expect(reads).toBe(0);
        expect(timers).toBe(0);
        expect(view.renderer.listenerCount('frame')).toBe(baselineFrames);
        expect(view.renderer.listenerCount('destroy')).toBe(baselineDestroy);
    } finally {
        await view.dispose();
    }
});

test('unavailable native durations stay missing and queued frame reads are inert after stop', async () => {
    const view = await createTestRenderer({ width: 20, height: 5, ...diagnosticsRendererOptions('1') });
    const getNativeStats = view.renderer.getNativeStats.bind(view.renderer);
    view.renderer.getNativeStats = () => ({
        ...getNativeStats(),
        nativeRenderTime: undefined,
        nativeStdoutWriteTime: undefined,
    });
    const collector = startDiagnostics(view.renderer, '1')!;
    try {
        await view.renderOnce();
        expect(collector.snapshot().missingNativeRender).toBe(1);
        expect(collector.snapshot().missingNativeOutput).toBe(1);
        expect(collector.snapshot().renderer.nativeRenderMs.mean).toBeNull();
        expect(collector.snapshot().renderer.nativeOutputMs.count).toBe(0);
        view.renderer.once('frame', collector.stop);
        await view.renderOnce();
        expect(collector.snapshot().completedFrames).toBe(2);
        expect(collector.snapshot().renderer.jsPassMs.count).toBe(1);
    } finally {
        collector.stop();
        await view.dispose();
    }
});
