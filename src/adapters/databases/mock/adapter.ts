import type { DatabaseResult, DatabaseNamespace, TableReference } from '../../../domain/database';
import type { DatabaseAdapter } from '../../../ports/database';
import { mockTables } from './tables';

const sameNamespace = (left: DatabaseNamespace, right: DatabaseNamespace) =>
    left.length === right.length && left.every((part, index) => part === right[index]);

const findTable = (reference: TableReference) =>
    mockTables.find(
        ({ schema }) =>
            schema.table.name === reference.name && sameNamespace(schema.table.namespace, reference.namespace)
    );

export const mockDatabaseAdapter: DatabaseAdapter = {
    engineId: 'mock',
    connect: async (connection) => {
        if (connection.engineId !== 'mock') return { ok: false, error: { code: 'unsupported-engine' } };
        if (connection.database !== 'demo') return { ok: false, error: { code: 'not-found' } };

        let closed = false;

        const read = async <T>(operation: () => DatabaseResult<T>): Promise<DatabaseResult<T>> =>
            closed ? { ok: false, error: { code: 'closed' } } : structuredClone(operation());

        return {
            ok: true,
            value: {
                capabilities: { namespaces: true, primaryKeys: true, maxPageSize: 250 },
                schema: {
                    listNamespaces: () => read(() => ({ ok: true, value: [['public']] })),
                    listTables: (namespace) =>
                        read(() =>
                            sameNamespace(namespace, ['public'])
                                ? { ok: true, value: mockTables.map(({ schema }) => schema.table) }
                                : { ok: false, error: { code: 'not-found' } }
                        ),
                    describeTable: (reference) =>
                        read(() => {
                            const table = findTable(reference);
                            return table
                                ? { ok: true, value: table.schema }
                                : { ok: false, error: { code: 'not-found' } };
                        }),
                },
                browsing: {
                    readPage: (request) =>
                        read(() => {
                            if (
                                !Number.isSafeInteger(request.offset) ||
                                request.offset < 0 ||
                                !Number.isSafeInteger(request.limit) ||
                                request.limit < 1 ||
                                request.limit > 250
                            )
                                return { ok: false, error: { code: 'invalid-request' } };

                            const table = findTable(request.table);
                            if (!table) return { ok: false, error: { code: 'not-found' } };

                            return {
                                ok: true,
                                value: {
                                    rows: table.rows.slice(request.offset, request.offset + request.limit),
                                    hasMore: request.offset + request.limit < table.rows.length,
                                },
                            };
                        }),
                },
                close: async () => {
                    closed = true;
                },
            },
        };
    },
};
