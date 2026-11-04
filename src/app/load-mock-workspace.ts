import { createDatabaseRegistry } from '../adapters/databases';
import { mockDatabaseAdapter } from '../adapters/databases/mock';
import type { DatabaseResult } from '../domain/database';
import { presentTable, type TableView } from '../features/table-browser';
import { connectDatabase, readTable } from '../services/database';

// Presentation choices stay outside the adapter and database contracts.
const columnWidths = {
    id: 11,
    name: 22,
    email: 32,
    role: 16,
    active: 12,
    balance: 24,
    notes: 48,
    settings: 48,
    event: 24,
    created: 28,
    metadata: 60,
};

const requireMockResult = <T extends unknown>(result: DatabaseResult<T>): T => {
    if (!result.ok) throw new Error('Could not load the mock workspace.');

    return result.value;
};

export const loadMockWorkspace = async (): Promise<readonly TableView[]> => {
    const registry = createDatabaseRegistry([mockDatabaseAdapter]);
    const session = requireMockResult(await connectDatabase(registry, { engineId: 'mock', database: 'demo' }));

    try {
        const tables: TableView[] = [];
        for (const namespace of requireMockResult(await session.schema.listNamespaces())) {
            for (const table of requireMockResult(await session.schema.listTables(namespace))) {
                const data = requireMockResult(
                    await readTable(session, {
                        table,
                        offset: 0,
                        limit: session.capabilities.maxPageSize,
                    })
                );
                tables.push(presentTable(data, columnWidths));
            }
        }
        return tables;
    } finally {
        await session.close();
    }
};
