import type { Client } from 'pg';
import { isValidPageRange, type DatabaseResult, type TableData } from '../../../domain/database';
import type { SchemaInspection, TableBrowsing } from '../../../ports/database';
import { queryValues } from './values';
import { queryError } from './errors';

export const maximumPageSize = 250;
const quoteIdentifier = (name: string) => `"${name.replaceAll('"', '""')}"`;

// The session serializes this transaction with its other reads on the same client.
export const createTableBrowsing = (
    client: Client,
    schema: SchemaInspection,
    isClosed: () => boolean
): TableBrowsing => ({
    readPage: async (request): Promise<DatabaseResult<TableData>> => {
        if (isClosed()) return { ok: false, error: { code: 'closed' } };

        const parts = [...request.table.namespace, request.table.name];
        if (
            !isValidPageRange(request, maximumPageSize) ||
            parts.length !== 2 ||
            parts.some((part) => !part || part.includes('\0'))
        )
            return { ok: false, error: { code: 'invalid-request' } };

        const relation = parts.map(quoteIdentifier).join('.');
        let transaction = false;

        try {
            await client.query('BEGIN READ ONLY');
            transaction = true;

            await client.query(`SELECT * FROM ${relation} LIMIT 0`);

            const description = await schema.describeTable(request.table);
            if (!description.ok) return description;

            const metadata = description.value;
            const keys = metadata.primaryKey.map((id) => metadata.columns.find((column) => column.id === id)!.name);
            const order = keys.length ? ` ORDER BY ${keys.map(quoteIdentifier).join(', ')}` : '';
            const result = await queryValues(client, `SELECT * FROM ${relation}${order} LIMIT $1 OFFSET $2`, [
                request.limit + 1,
                request.offset,
            ]);

            await client.query('COMMIT');
            transaction = false;

            if (isClosed()) return { ok: false, error: { code: 'closed' } };

            return {
                ok: true,
                value: {
                    schema: metadata,
                    page: {
                        hasMore: result.rows.length > request.limit,
                        rows: result.rows.slice(0, request.limit).map((values, index) => ({
                            id: `${request.offset}:${index}`,
                            identity: null,
                            values,
                        })),
                    },
                },
            };
        } catch (error) {
            return { ok: false, error: isClosed() ? { code: 'closed' } : queryError(error) };
        } finally {
            if (transaction && !isClosed()) {
                try {
                    await client.query('ROLLBACK');
                } catch (error) {
                    if (!isClosed()) throw error;
                }
            }
        }
    },
});
