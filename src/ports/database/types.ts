import type {
    DatabaseConnection,
    DatabaseNamespace,
    DatabaseResult,
    DatabaseTable,
    PageRequest,
    TableData,
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
    // Return metadata and rows from the same read operation.
    // Reject invalid ranges or limits above maxPageSize; never fall back to an unbounded read.
    readPage: (request: PageRequest) => Promise<DatabaseResult<TableData>>;
};

export type DatabaseSession = {
    readonly capabilities: DatabaseCapabilities;
    readonly schema: SchemaInspection;
    readonly browsing: TableBrowsing;
    // Idempotent; release owned resources. Subsequent operations return the closed error.
    close: () => Promise<void>;
    subscribeClose: (listener: () => void) => () => void;
};

export type ConnectOptions = { readonly password?: string; readonly signal?: AbortSignal };

export type DatabaseAdapter = {
    readonly engineId: string;
    connect: (connection: DatabaseConnection, options?: ConnectOptions) => Promise<DatabaseResult<DatabaseSession>>;
};

export type DatabaseRegistry = { get: (engineId: string) => DatabaseAdapter | undefined };
