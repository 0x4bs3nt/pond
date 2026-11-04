import type { CliRenderer, CliRendererConfig, RendererSchedulerState } from '@opentui/core';

export type DiagnosticsRendererOptions = Pick<
    CliRendererConfig,
    'gatherStats' | 'maxStatSamples' | 'memorySnapshotInterval'
>;

export type InteractionCategory = 'navigation' | 'editing';
export type ProfileRegion = 'workspace' | 'table-browser' | 'explorer' | 'tabs' | 'gallery';
export type PendingInteraction = {
    category: InteractionCategory;
    startedAt: number;
    frameAfter?: number;
    origin: 'input' | 'action';
};
export type DiagnosticsSessionOptions = {
    startedAtMs: number;
    appVersion: string;
    source: 'app' | 'gallery';
};
export type DiagnosticsSession = ReturnType<typeof import('./session').createDiagnosticsSession>;
export type DiagnosticsReport = ReturnType<DiagnosticsSession['snapshot']>;

export type DistributionSummary = {
    count: number;
    rejected: number;
    retained: number;
    evicted: number;
    min: number | null;
    max: number | null;
    mean: number | null;
    p50: number | null;
    p95: number | null;
    percentileScope: 'recent-window';
};

export type ResourceReading = {
    cpuUserUs: number;
    cpuSystemUs: number;
    rssBytes: number;
    heapUsedBytes: number;
};

export type DiagnosticsRuntime = {
    now: () => number;
    readResources: () => ResourceReading;
    everySecond: (callback: () => void) => () => void;
};

export type ResourceSample = {
    elapsedMs: number;
    intervalMs: number;
    cpuPercent: number;
    rssBytes: number;
    heapUsedBytes: number;
    completedFrames: number;
    scheduler: RendererSchedulerState;
};

export type DiagnosticsRenderer = Pick<
    CliRenderer,
    'on' | 'off' | 'isDestroyed' | 'frameId' | 'getNativeStats' | 'getStats' | 'getSchedulerState'
>;
