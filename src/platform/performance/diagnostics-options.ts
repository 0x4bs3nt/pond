import type { DiagnosticsRendererOptions } from './types';

// Keep native snapshots off: the diagnostics collector will own resource sampling.
export const diagnosticsRendererOptions = (optIn: string | undefined): DiagnosticsRendererOptions => ({
    gatherStats: optIn === '1',
    maxStatSamples: 300,
    memorySnapshotInterval: 0,
});
