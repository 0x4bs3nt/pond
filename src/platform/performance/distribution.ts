import { createBoundedHistory } from './bounded-history';
import type { DistributionSummary } from './types';

export const createDistribution = (capacity = 512) => {
    const history = createBoundedHistory<number>(capacity);

    let count = 0;
    let rejected = 0;
    let min = Infinity;
    let max = -Infinity;
    let mean = 0;

    return {
        add: (value: number) => {
            if (!Number.isFinite(value) || value < 0) {
                rejected++;
                return;
            }
            count++;
            min = Math.min(min, value);
            max = Math.max(max, value);
            mean += (value - mean) / count;
            history.add(value);
        },
        snapshot: (): DistributionSummary => {
            const { entries, evicted } = history.snapshot();
            entries.sort((a, b) => a - b);

            const percentile = (fraction: number) => entries[Math.ceil(entries.length * fraction) - 1] ?? null;

            return {
                count,
                rejected,
                retained: entries.length,
                evicted,
                min: count ? min : null,
                max: count ? max : null,
                mean: count ? mean : null,
                p50: percentile(0.5),
                p95: percentile(0.95),
                percentileScope: 'recent-window',
            };
        },
    };
};
