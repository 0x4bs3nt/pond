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
    const schema = await session.schema.describeTable(request.table);
    if (!schema.ok) return schema;

    const page = await session.browsing.readPage(request);
    if (!page.ok) return page;

    return { ok: true, value: { schema: schema.value, page: page.value } };
};
