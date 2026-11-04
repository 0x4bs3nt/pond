import type { CliRenderer, CliRendererFrameEvent } from '@opentui/core';
import { version as reactVersion } from 'react';
import { startDiagnostics } from './collector';
import { createDistribution } from './distribution';
import { createInteractionTracker } from './interactions';
import type { DiagnosticsSessionOptions, InteractionCategory, ProfileRegion } from './types';

// Bun embeds the literal package metadata import; OpenTUI does not export its JSON types.
const opentuiVersion: string = require('@opentui/core/package.json').version;

export const createDiagnosticsSession = (renderer: CliRenderer, options: DiagnosticsSessionOptions) => {
    const collector = startDiagnostics(renderer, '1')!;
    const interactions = createInteractionTracker(
        () => performance.now(),
        () => renderer.frameId
    );

    const profiles = Object.fromEntries(
        (['workspace', 'table-browser', 'explorer', 'tabs', 'gallery'] as const).map((id) => [
            id,
            {
                actualMs: createDistribution(),
                baseMs: createDistribution(),
            },
        ])
    ) as Record<
        ProfileRegion,
        { actualMs: ReturnType<typeof createDistribution>; baseMs: ReturnType<typeof createDistribution> }
    >;

    let inputAt: number | undefined;
    let dispatch = 0;
    let inputEvents = 0;
    let quietFrames = 0;
    let lastActivityAt = performance.now();
    let readyAfterFrame: number | undefined;
    let startupMs: number | null = null;
    let readyCommits = 0;
    let profileCallbacks = 0;
    let stoppedAt: number | undefined;
    let dimensions = { columns: renderer.terminalWidth, rows: renderer.terminalHeight };

    const onInput = () => {
        inputEvents++;
        lastActivityAt = inputAt = performance.now();

        const current = ++dispatch;
        queueMicrotask(() => {
            if (current === dispatch) inputAt = undefined;
        });
    };

    const onResize = () => {
        lastActivityAt = performance.now();
        dimensions = { columns: renderer.terminalWidth, rows: renderer.terminalHeight };
    };

    const onFrame = ({ frameId }: CliRendererFrameEvent) => {
        if (stoppedAt !== undefined) return;
        if (readyAfterFrame !== undefined && startupMs === null && frameId > readyAfterFrame) {
            startupMs = performance.now() - options.startedAtMs;
        }

        interactions.frame(frameId);
        if (performance.now() - lastActivityAt >= 2000) quietFrames++;
    };

    const expiryTimer = setInterval(interactions.expire, 1000);
    expiryTimer.unref();

    const stop = () => {
        if (stoppedAt !== undefined) return;

        stoppedAt = performance.now();
        clearInterval(expiryTimer);
        renderer.keyInput.off('keypress', onInput);
        renderer.off('resize', onResize);
        renderer.off('frame', onFrame);
        renderer.off('destroy', stop);
        interactions.stop();
        collector.stop();
    };

    renderer.keyInput.prependListener('keypress', onInput);
    renderer.on('resize', onResize);
    renderer.on('frame', onFrame);
    renderer.on('destroy', stop);

    return {
        stop,
        ready: (usable: boolean) => {
            if (stoppedAt !== undefined || startupMs !== null) return;
            readyCommits++;
            readyAfterFrame = usable ? renderer.frameId : undefined;
        },
        begin: (category: InteractionCategory) => {
            if (stoppedAt !== undefined) return undefined;
            lastActivityAt = performance.now();
            return interactions.begin(category, inputAt);
        },
        acknowledge: (id: number) => {
            if (stoppedAt === undefined) interactions.acknowledge(id);
        },
        abandon: interactions.abandon,
        nativeEdit: () => {
            if (stoppedAt !== undefined) return;
            lastActivityAt = performance.now();
            interactions.acknowledge(interactions.begin('editing', inputAt));
        },
        profile: (id: ProfileRegion, actualMs: number, baseMs: number) => {
            if (stoppedAt !== undefined) return;
            profileCallbacks++;
            profiles[id].actualMs.add(actualMs);
            profiles[id].baseMs.add(baseMs);
        },
        snapshot: () => ({
            schemaVersion: 1,
            metadata: {
                applicationVersion: options.appVersion,
                bunVersion: Bun.version,
                reactVersion,
                opentuiVersion,
                platform: process.platform,
                architecture: process.arch,
                source: options.source,
                nodeEnv:
                    process.env.NODE_ENV === undefined
                        ? 'unset'
                        : ['development', 'production', 'test'].includes(process.env.NODE_ENV)
                          ? process.env.NODE_ENV
                          : 'other',
                terminal: { ...dimensions },
                durationMs: (stoppedAt ?? performance.now()) - options.startedAtMs,
                instrumentation: ['renderer', 'resources', 'correlated-actions', 'react-profiler'],
            },
            startupToUsableFrameMs: startupMs,
            activity: { inputEvents, quietFrames, quietThresholdMs: 2000 },
            interactions: interactions.snapshot(),
            react: {
                availability: profileCallbacks ? 'available' : readyCommits ? 'unavailable' : 'unobserved',
                regions: Object.fromEntries(
                    Object.entries(profiles).map(([id, profile]) => [
                        id,
                        {
                            actualMs: profile.actualMs.snapshot(),
                            baseMs: profile.baseMs.snapshot(),
                        },
                    ])
                ),
            },
            ...collector.snapshot(),
        }),
    };
};
