import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiagnosticsReport } from './types';

export const renderDiagnosticsSummary = (report: DiagnosticsReport) => {
    const metric = (name: string, value: { count: number; mean: number | null; p95: number | null }) =>
        `${name}: count=${value.count}, mean=${value.mean?.toFixed(3) ?? 'unavailable'}, recent p95=${value.p95?.toFixed(3) ?? 'unavailable'}`;

    return [
        `Pond diagnostics — ${report.metadata.source}`,
        `Pond ${report.metadata.applicationVersion}; Bun ${report.metadata.bunVersion}; React ${report.metadata.reactVersion}; OpenTUI ${report.metadata.opentuiVersion}`,
        `${report.metadata.platform}/${report.metadata.architecture}; NODE_ENV=${report.metadata.nodeEnv}; ${report.metadata.terminal.columns}x${report.metadata.terminal.rows}`,
        `Enabled instrumentation: ${report.metadata.instrumentation.join(', ')}`,
        `Duration: ${report.metadata.durationMs.toFixed(1)} ms`,
        `Startup to usable frame: ${report.startupToUsableFrameMs?.toFixed(3) ?? 'unavailable'} ms`,
        `React Profiler: ${report.react.availability}`,
        ...Object.entries(report.react.regions).flatMap(([id, region]) => [
            `React ${id}: observed commits=${region.actualMs.count}`,
            metric('  Actual render (ms)', region.actualMs),
            metric('  Base render estimate (ms)', region.baseMs),
        ]),
        metric('JS pass (ms)', report.renderer.jsPassMs),
        metric('Native render (ms)', report.renderer.nativeRenderMs),
        metric('Native output (ms)', report.renderer.nativeOutputMs),
        metric('Native interval, including idle (ms)', report.renderer.nativeIntervalMs),
        metric('Navigation input to frame (ms)', report.interactions.navigation.inputToFrameMs),
        metric('Editing input to frame (ms)', report.interactions.editing.inputToFrameMs),
        metric('CPU (% of one core)', report.resources.cpuPercent),
        metric('RSS (bytes)', report.resources.rssBytes),
        metric('JS heap (bytes)', report.resources.heapUsedBytes),
        `Correlated actions: ${report.interactions.correlated}; coalesced: ${report.interactions.coalesced}; expired: ${report.interactions.expired}; abandoned: ${report.interactions.abandoned}; dropped: ${report.interactions.dropped}`,
        `Frames after 2s without observed activity: ${report.activity.quietFrames} (not necessarily unexpected)`,
        `Retained resource samples: ${report.resources.entries.length}; evicted: ${report.resources.evicted}`,
        'Percentiles describe recent retained samples, not the full session. Nested React region durations overlap.',
        'Frame completion is a responsiveness proxy, not terminal display time. Sampling/profiling adds overhead.',
        'Startup excludes runtime work before the bootstrap marker. See the JSON for availability and sample counters.',
        '',
    ].join('\n');
};

export const writeDiagnosticsReport = async (
    report: DiagnosticsReport,
    signal: AbortSignal,
    directory = join(process.cwd(), '.profiles')
) => {
    signal.throwIfAborted();
    await mkdir(directory, { recursive: true, mode: 0o700 });

    const name = `pond-${Date.now()}-${crypto.randomUUID()}`;
    const json = join(directory, `${name}.json`);
    const summary = join(directory, `${name}.txt`);
    const temporaryJson = `${json}.tmp`;
    const temporarySummary = `${summary}.tmp`;

    try {
        await writeFile(temporaryJson, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: 'wx', signal });
        await writeFile(temporarySummary, renderDiagnosticsSummary(report), { mode: 0o600, flag: 'wx', signal });

        signal.throwIfAborted();
        await rename(temporaryJson, json);

        signal.throwIfAborted();
        await rename(temporarySummary, summary);
    } catch (error) {
        await Promise.allSettled(
            [temporaryJson, temporarySummary, json, summary].map((file) => rm(file, { force: true }))
        );

        throw error;
    }
};
