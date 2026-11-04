import type { CliRendererFrameEvent } from '@opentui/core';
import { createDistribution } from './distribution';
import { createResourceSampler, diagnosticsRuntime } from './resource-sampler';
import type { DiagnosticsRenderer, DiagnosticsRuntime } from './types';

export const startDiagnostics = (
    renderer: DiagnosticsRenderer,
    optIn: string | undefined,
    runtime: DiagnosticsRuntime = diagnosticsRuntime
) => {
    if (optIn !== '1' || renderer.isDestroyed) return undefined;

    const jsPassMs = createDistribution();
    const frameCallbackMs = createDistribution();
    const nativeIntervalMs = createDistribution();
    const nativeRenderMs = createDistribution();
    const nativeOutputMs = createDistribution();
    const cellsUpdated = createDistribution();

    const resources = createResourceSampler(runtime);

    let completedFrames = 0;
    let lastFrameId = renderer.frameId;
    let lastNativeCount = renderer.getNativeStats().nativeFrameCount;
    let missingNativeRender = 0;
    let missingNativeOutput = 0;
    let missingJsPass = 0;
    let ignoredFrameEvents = 0;
    let stopped = false;

    const onFrame = ({ frameId }: CliRendererFrameEvent) => {
        if (stopped) return;

        if (frameId <= lastFrameId) {
            ignoredFrameEvents++;

            return;
        }

        lastFrameId = frameId;
        completedFrames++;

        const native = renderer.getNativeStats();
        if (native.nativeFrameCount > lastNativeCount) {
            // The first native interval has no prior completed frame to compare with.
            if (native.nativeFrameCount > 1) nativeIntervalMs.add(native.nativeLastFrameTime / 1000);
            if (native.nativeRenderTime === undefined) missingNativeRender++;
            else nativeRenderMs.add(native.nativeRenderTime / 1000);
            if (native.nativeStdoutWriteTime === undefined) missingNativeOutput++;
            else nativeOutputMs.add(native.nativeStdoutWriteTime / 1000);

            cellsUpdated.add(native.cellsUpdated);
        }

        lastNativeCount = native.nativeFrameCount;

        // OpenTUI appends this pass duration after emitting frame. Never replay its rolling history.
        queueMicrotask(() => {
            if (stopped || renderer.isDestroyed) return;
            if (renderer.frameId !== frameId) {
                missingJsPass++;

                return;
            }

            const stats = renderer.getStats();
            const pass = stats.frameTimes.at(-1);

            if (pass === undefined) missingJsPass++;
            else jsPassMs.add(pass);

            frameCallbackMs.add(stats.frameCallbackTime);
        });
    };

    const stopSampling = runtime.everySecond(() => {
        if (!stopped && !renderer.isDestroyed) resources.sample(completedFrames, renderer.getSchedulerState());
    });

    const stop = () => {
        if (stopped) return;

        stopped = true;
        stopSampling();

        renderer.off('frame', onFrame);
        renderer.off('destroy', stop);
    };

    renderer.on('frame', onFrame);
    renderer.on('destroy', stop);

    return {
        stop,
        snapshot: () => ({
            stopped,
            completedFrames,
            ignoredFrameEvents,
            missingJsPass,
            missingNativeRender,
            missingNativeOutput,
            renderer: {
                jsPassMs: jsPassMs.snapshot(),
                frameCallbackMs: frameCallbackMs.snapshot(),
                nativeIntervalMs: nativeIntervalMs.snapshot(),
                nativeRenderMs: nativeRenderMs.snapshot(),
                nativeOutputMs: nativeOutputMs.snapshot(),
                cellsUpdated: cellsUpdated.snapshot(),
            },
            resources: resources.snapshot(),
        }),
    };
};
