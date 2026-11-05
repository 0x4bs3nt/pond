import type { TableData } from '../../domain/database';
import type { TableView } from './types';

export const presentTable = (data: TableData, widths: Readonly<Record<string, number>>): TableView => ({
    id: data.schema.table.id,
    name: data.schema.table.name,
    namespace: data.schema.table.namespace.join(' / '),
    columns: data.schema.columns.map((column) => ({
        id: column.id,
        name: column.name,
        type: column.nativeType + (data.schema.primaryKey.includes(column.id) ? ' · PK' : ''),
        width: widths[column.id] ?? 24,
    })),
    rows: data.page.rows.map((row) => ({
        id: row.id,
        cells: row.values.map((value) => (value.kind === 'null' ? null : value.text)),
        readOnlyColumns: data.schema.columns
            .filter((_, index) => {
                const value = row.values[index];
                return value?.kind === 'unsupported' || (value?.kind === 'null' && value.readOnly);
            })
            .map((column) => column.id),
    })),
});
