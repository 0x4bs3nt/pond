import { expect, test } from 'bun:test';
import { createDistribution } from '../distribution';

test('long sessions retain bounded recent percentiles and exact lifetime aggregates', () => {
    const distribution = createDistribution(4);
    expect(distribution.snapshot().p95).toBeNull();
    for (let value = 0; value < 10000; value++) distribution.add(value);
    for (const value of [NaN, Infinity, -1]) distribution.add(value);
    expect(distribution.snapshot()).toEqual({
        count: 10000,
        rejected: 3,
        retained: 4,
        evicted: 9996,
        min: 0,
        max: 9999,
        mean: 4999.5,
        p50: 9997,
        p95: 9999,
        percentileScope: 'recent-window',
    });
    // Reading/sorting a snapshot cannot disturb the chronological eviction order.
    distribution.add(0);
    expect(distribution.snapshot().p50).toBe(9997);
    expect(distribution.snapshot().evicted).toBe(9997);
});
