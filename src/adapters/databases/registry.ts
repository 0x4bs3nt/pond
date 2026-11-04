import type { DatabaseAdapter, DatabaseRegistry } from '../../ports/database';

export const createDatabaseRegistry = (adapters: readonly DatabaseAdapter[]): DatabaseRegistry => {
    const byEngine = new Map<string, DatabaseAdapter>();

    for (const adapter of adapters) {
        if (!adapter.engineId || byEngine.has(adapter.engineId))
            throw new Error('Database adapters must have unique, nonempty engine IDs.');

        byEngine.set(adapter.engineId, adapter);
    }

    return { get: (engineId) => byEngine.get(engineId) };
};
