import type { Client } from 'pg';
import type { DatabaseColumn, DatabaseResult, DatabaseTable } from '../../../domain/database';
import type { SchemaInspection } from '../../../ports/database';
import { namespacesSql, tablesSql, describeSql } from './catalog-sql';
import { queryError } from './errors';
import type { CatalogColumn, CatalogTable } from './types';

const table = (row: CatalogTable): DatabaseTable => ({
    id: row.id,
    name: row.name,
    namespace: [row.namespace],
    kind:
        row.kind === 'v'
            ? 'view'
            : row.kind === 'm'
              ? 'materialized-view'
              : row.kind === 'f'
                ? 'foreign-table'
                : 'table',
});

const category = (row: CatalogColumn): DatabaseColumn['category'] => {
    if (row.type_namespace !== 'pg_catalog') return 'other';
    if (['int2', 'int4', 'int8', 'oid'].includes(row.base_name)) return 'integer';
    if (['numeric', 'float4', 'float8', 'money'].includes(row.base_name)) return 'decimal';
    if (['text', 'varchar', 'bpchar', 'name', 'char'].includes(row.base_name)) return 'text';
    if (row.base_name === 'bool') return 'boolean';
    if (['json', 'jsonb'].includes(row.base_name)) return 'json';
    if (['date', 'time', 'timetz', 'timestamp', 'timestamptz', 'interval'].includes(row.base_name)) return 'temporal';
    if (row.base_name === 'bytea') return 'binary';

    return 'other';
};

export const createSchemaInspection = (client: Client, isClosed: () => boolean): SchemaInspection => {
    const read = async <T>(operation: () => Promise<DatabaseResult<T>>): Promise<DatabaseResult<T>> => {
        if (isClosed()) return { ok: false, error: { code: 'closed' } };

        try {
            const result = await operation();

            return isClosed() ? { ok: false, error: { code: 'closed' } } : result;
        } catch (error) {
            return { ok: false, error: isClosed() ? { code: 'closed' } : queryError(error) };
        }
    };

    return {
        listNamespaces: () =>
            read(async () => {
                const result = await client.query<{ name: string }>(namespacesSql);

                return { ok: true, value: result.rows.map((row) => [row.name]) };
            }),
        listTables: (namespace) =>
            read(async () => {
                if (namespace.length !== 1) return { ok: false, error: { code: 'invalid-request' } };
                const result = await client.query<CatalogTable>(tablesSql, [namespace[0]]);

                return { ok: true, value: result.rows.map(table) };
            }),
        describeTable: (reference) =>
            read(async () => {
                if (reference.namespace.length !== 1) return { ok: false, error: { code: 'invalid-request' } };

                const result = await client.query<CatalogColumn>(describeSql, [reference.namespace[0], reference.name]);
                const first = result.rows[0];

                if (!first) return { ok: false, error: { code: 'not-found' } };
                if (!first.accessible) return { ok: false, error: { code: 'permission-denied' } };

                return {
                    ok: true,
                    value: {
                        table: table(first),
                        primaryKey: first.primary_key,
                        columns: result.rows
                            .filter((row) => row.column_id !== null)
                            .map((row) => ({
                                id: row.column_id!,
                                name: row.column_name,
                                nativeType: row.native_type,
                                nullable: row.nullable,
                                category: category(row),
                                defaultExpression: row.default_expression,
                                identity: row.identity === 'a' ? 'always' : row.identity === 'd' ? 'by-default' : null,
                                generated: row.generated
                                    ? {
                                          kind: row.generated === 's' ? 'stored' : 'virtual',
                                          expression: row.generation_expression!,
                                      }
                                    : null,
                            })),
                    },
                };
            }),
    };
};
