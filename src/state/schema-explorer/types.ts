import type { CatalogNamespace, DatabaseError, DatabaseTable, TableData, TableSchema } from '../../domain/database';

export type SchemaLoad<T> =
    { status: 'idle' | 'loading' } | { status: 'ready'; value: T } | { status: 'error'; error: DatabaseError };

export type SchemaExplorerState = {
    catalog: SchemaLoad<readonly CatalogNamespace[]>;
    selected: DatabaseTable | null;
    data: SchemaLoad<TableData>;
    description: SchemaLoad<TableSchema>;
};
