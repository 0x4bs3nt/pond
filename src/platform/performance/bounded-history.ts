export const createBoundedHistory = <T extends unknown>(capacity: number) => {
    if (!Number.isSafeInteger(capacity) || capacity < 1)
        throw new Error('History capacity must be a positive integer.');

    const entries: T[] = [];
    let next = 0;
    let evicted = 0;

    return {
        add: (entry: T) => {
            if (entries.length === capacity) evicted++;
            entries[next] = entry;
            next = (next + 1) % capacity;
        },
        snapshot: () => ({
            entries: entries.length === capacity ? [...entries.slice(next), ...entries.slice(0, next)] : [...entries],
            evicted,
        }),
    };
};
