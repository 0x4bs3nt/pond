export type DatabaseNetwork = {
    readonly host: string;
    readonly port: number;
    readonly user: string;
    readonly tls: 'disable' | 'require' | 'verify-full';
};

// Credentials travel separately and never belong in a saved target.
export type DatabaseConnection = {
    readonly engineId: string;
    readonly database: string;
    readonly network?: DatabaseNetwork;
};

// Identifier parts are kept separate, never parsed from a dotted or SQL-quoted string.
// An empty path represents an engine without namespaces.
export type DatabaseNamespace = readonly string[];
export type TableReference = { readonly namespace: DatabaseNamespace; readonly name: string };
export type DatabaseTable = TableReference & { readonly id: string; readonly kind: 'table' | 'view' };

export type DatabaseColumn = {
    readonly id: string;
    readonly name: string;
    // Adapter-provided type name, including modifiers. Never use this display text to generate SQL.
    readonly nativeType: string;
    readonly category: 'text' | 'integer' | 'decimal' | 'boolean' | 'json' | 'temporal' | 'binary' | 'other';
    readonly nullable: boolean;
};

export type TableSchema = {
    readonly table: DatabaseTable;
    readonly columns: readonly DatabaseColumn[];
    // Column IDs in key order, not display names. Empty for keyless relations.
    readonly primaryKey: readonly string[];
};

// Exact adapter text avoids Number/Date/JSON coercion. Native meaning comes from the column.
// Unsupported values are inspectable representations, not values safe to send back to a database.
export type DatabaseValue =
    | { readonly kind: 'null' }
    | { readonly kind: 'value'; readonly text: string }
    | { readonly kind: 'unsupported'; readonly text: string };

export type RowIdentity = readonly { readonly columnId: string; readonly value: string }[];
export type DatabaseRow = {
    // Presentation identity within this result; never an implicit UPDATE/DELETE target.
    readonly id: string;
    readonly identity: RowIdentity | null;
    readonly values: readonly DatabaseValue[];
};

export type PageRequest = { readonly table: TableReference; readonly offset: number; readonly limit: number };
export type RowPage = { readonly rows: readonly DatabaseRow[]; readonly hasMore: boolean };
export type TableData = { readonly schema: TableSchema; readonly page: RowPage };

// Expected failures cross the port as application-owned codes, never raw driver errors/messages.
// Unexpected failures reject and are handled by the application lifecycle.
export type DatabaseError = {
    readonly code:
        | 'unsupported-engine'
        | 'unsupported-operation'
        | 'invalid-request'
        | 'not-found'
        | 'closed'
        | 'authentication'
        | 'unreachable'
        | 'tls'
        | 'connection-failed'
        | 'cancelled';
};
export type DatabaseResult<T> =
    { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DatabaseError };
