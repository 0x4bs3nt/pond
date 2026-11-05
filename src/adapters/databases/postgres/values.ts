import { types, type Client } from 'pg';
import type { DatabaseValue } from '../../../domain/database';

// Only these scalar types have a supported exact-text representation. Everything else
// retains PostgreSQL's text output for inspection, without implying edit support.
const supportedTypes = new Set<number>([
    types.builtins.BOOL,
    types.builtins.CHAR,
    19, // name
    types.builtins.TEXT,
    types.builtins.BPCHAR,
    types.builtins.VARCHAR,
    types.builtins.INT2,
    types.builtins.INT4,
    types.builtins.INT8,
    types.builtins.OID,
    types.builtins.NUMERIC,
    types.builtins.FLOAT4,
    types.builtins.FLOAT8,
    types.builtins.JSON,
    types.builtins.JSONB,
    types.builtins.DATE,
    types.builtins.TIME,
    types.builtins.TIMETZ,
    types.builtins.TIMESTAMP,
    types.builtins.TIMESTAMPTZ,
    types.builtins.INTERVAL,
    types.builtins.UUID,
]);

export const decodePostgresValue = (value: unknown, typeId: number): DatabaseValue => {
    if (value === null) return supportedTypes.has(typeId) ? { kind: 'null' } : { kind: 'null', readOnly: true };
    if (typeof value !== 'string') throw new TypeError('Expected a PostgreSQL text-format value.');

    return { kind: supportedTypes.has(typeId) ? 'value' : 'unsupported', text: value };
};

// Query-local parsers leave catalog queries and other clients alone. Array rows preserve
// column order and duplicate names; no Number, Date, JSON or array parsing happens first.
export const queryValues = async (client: Client, text: string, parameters: readonly unknown[] = []) => {
    const result = await client.query<(string | null)[]>({
        text,
        values: [...parameters],
        rowMode: 'array',
        types: { getTypeParser: () => (value: string) => value },
    });

    return {
        fields: result.fields,
        rows: result.rows.map((row) =>
            row.map((value, index) => decodePostgresValue(value, result.fields[index]!.dataTypeID))
        ),
    };
};
