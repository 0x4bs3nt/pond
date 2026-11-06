import { isValidPageRange } from '../../domain/database';
import type { DatabaseConnection, DatabaseResult, PageRequest, TableData } from '../../domain/database';
import type { DatabaseRegistry, DatabaseSession } from '../../ports/database';

export const connectDatabase = async (
    registry: DatabaseRegistry,
    connection: DatabaseConnection
): Promise<DatabaseResult<DatabaseSession>> => {
    const adapter = registry.get(connection.engineId);

    if (!adapter) return { ok: false, error: { code: 'unsupported-engine' } };

    return adapter.connect(connection);
};

export const readTable = async (session: DatabaseSession, request: PageRequest): Promise<DatabaseResult<TableData>> => {
    if (!isValidPageRange(request, session.capabilities.maxPageSize))
        return { ok: false, error: { code: 'invalid-request' } };

    return session.browsing.readPage(request);
};
