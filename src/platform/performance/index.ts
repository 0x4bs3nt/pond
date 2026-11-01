import { performance, PerformanceObserver } from 'node:perf_hooks';

export const discardDeliveredMeasures = () => {
    const observer = new PerformanceObserver(() => performance.clearMeasures());
    observer.observe({ entryTypes: ['measure'] });

    return () => {
        observer.disconnect();
        performance.clearMeasures();
    };
};
