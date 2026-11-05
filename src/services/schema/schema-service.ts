import type { CatalogNamespace, DatabaseResult, TableReference } from '../../domain/database';
import type { DatabaseSession } from '../../ports/database';

export const discoverSchema = async (
    session: DatabaseSession
): Promise<DatabaseResult<readonly CatalogNamespace[]>> => {
    const namespaces = await session.schema.listNamespaces();
    if (!namespaces.ok) return namespaces;

    const catalog: CatalogNamespace[] = [];
    for (const namespace of namespaces.value) {
        const tables = await session.schema.listTables(namespace);
        if (!tables.ok) return tables;

        catalog.push({ namespace, tables: tables.value });
    }

    return { ok: true, value: catalog };
};

export const describeTable = (session: DatabaseSession, table: TableReference) => session.schema.describeTable(table);
