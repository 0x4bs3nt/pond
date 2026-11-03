import type { CliRendererConfig } from '@opentui/core';

export type DiagnosticsRendererOptions = Pick<
    CliRendererConfig,
    'gatherStats' | 'maxStatSamples' | 'memorySnapshotInterval'
>;
