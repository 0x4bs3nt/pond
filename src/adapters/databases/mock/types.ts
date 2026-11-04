import type { DatabaseRow, TableSchema } from '../../../domain/database';

export type MockTable = { schema: TableSchema; rows: readonly DatabaseRow[] };
