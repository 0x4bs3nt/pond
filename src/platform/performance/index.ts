import { performance, PerformanceObserver } from 'node:perf_hooks';

export { diagnosticsRendererOptions } from './diagnostics-options';
export { startDiagnostics } from './collector';
export { createDiagnosticsSession } from './session';
export { writeDiagnosticsReport } from './report';
export type { DiagnosticsSession, DiagnosticsReport, InteractionCategory, ProfileRegion } from './types';

export const discardDeliveredMeasures = () => {
    const observer = new PerformanceObserver(() => performance.clearMeasures());
    observer.observe({ entryTypes: ['measure'] });

    return () => {
        observer.disconnect();
        performance.clearMeasures();
    };
};
