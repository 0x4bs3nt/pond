import { expect, test } from 'bun:test';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { discardDeliveredMeasures } from '../index';

test('releases timing history while preserving live observers and stopping cleanly', async () => {
    const name = 'pond-timing-retention-test';
    const received: number[] = [];
    const observer = new PerformanceObserver((list) => received.push(list.getEntriesByName(name).length));
    observer.observe({ entryTypes: ['measure'] });
    const stop = discardDeliveredMeasures();
    try {
        performance.mark(name);
        for (let index = 0; index < 100; index++) performance.measure(name, { start: 0, end: 1, detail: { index } });
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(received.reduce((sum, value) => sum + value, 0)).toBe(100);
        expect(performance.getEntriesByName(name, 'measure')).toHaveLength(0);
        expect(performance.getEntriesByName(name, 'mark')).toHaveLength(1);
        stop();
        performance.measure(name, { start: 0, end: 1 });
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(performance.getEntriesByName(name, 'measure')).toHaveLength(1);
    } finally {
        stop();
        observer.disconnect();
        performance.clearMarks(name);
        performance.clearMeasures(name);
    }
});
