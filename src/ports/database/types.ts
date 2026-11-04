import type {
    DatabaseConnection,
    DatabaseNamespace,
    DatabaseResult,
    DatabaseTable,
    PageRequest,
    RowPage,
    TableReference,
    TableSchema,
} from '../../domain/database';

export type DatabaseCapabilities = {
    readonly namespaces: boolean;
    readonly primaryKeys: boolean;
    readonly maxPageSize: number;
};

export type SchemaInspection = {
    listNamespaces: () => Promise<DatabaseResult<readonly DatabaseNamespace[]>>;
    listTables: (namespace: DatabaseNamespace) => Promise<DatabaseResult<readonly DatabaseTable[]>>;
    describeTable: (table: TableReference) => Promise<DatabaseResult<TableSchema>>;
};

export type TableBrowsing = {
    // Reject invalid ranges or limits above maxPageSize; never fall back to an unbounded read.
    readPage: (request: PageRequest) => Promise<DatabaseResult<RowPage>>;
};

export type DatabaseSession = {
    readonly capabilities: DatabaseCapabilities;
    readonly schema: SchemaInspection;
    readonly browsing: TableBrowsing;
    // Idempotent; release owned resources. Subsequent operations return the closed error.
    close: () => Promise<void>;
};

export type DatabaseAdapter = {
    readonly engineId: string;
    connect: (connection: DatabaseConnection) => Promise<DatabaseResult<DatabaseSession>>;
};

export type DatabaseRegistry = { get: (engineId: string) => DatabaseAdapter | undefined };
