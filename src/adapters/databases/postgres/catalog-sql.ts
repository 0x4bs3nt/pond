export const namespacesSql = `
    SELECT n.nspname AS name
    FROM pg_catalog.pg_namespace n
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
      AND pg_catalog.has_schema_privilege(n.oid, 'USAGE')
    ORDER BY n.nspname COLLATE "C"
`;

export const tablesSql = `
    SELECT c.oid::text AS id, c.relname AS name, n.nspname AS namespace, c.relkind AS kind
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND pg_catalog.has_schema_privilege(n.oid, 'USAGE')
      AND pg_catalog.has_any_column_privilege(c.oid, 'SELECT')
    ORDER BY c.relname COLLATE "C"
`;

// One statement gives relation, columns and keys a consistent catalog snapshot, including zero-column tables.
// Follow domains for NOT NULL and base types. Defaults belong to the declared type, including a cleared default.
export const describeSql = `
    WITH RECURSIVE relation AS (
        SELECT c.oid, c.relname, c.relkind, n.nspname,
               pg_catalog.has_schema_privilege(n.oid, 'USAGE')
               AND pg_catalog.has_any_column_privilege(c.oid, 'SELECT') AS accessible
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    ), attributes AS (
        SELECT a.* FROM pg_catalog.pg_attribute a
        JOIN relation r ON a.attrelid = r.oid
        WHERE a.attnum > 0 AND NOT a.attisdropped
    ), type_chain AS (
        SELECT a.attnum, t.oid, t.typbasetype, t.typnotnull, t.typdefault,
               t.typname, t.typnamespace, 0 AS depth
        FROM attributes a JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
        UNION ALL
        SELECT c.attnum, t.oid, t.typbasetype, t.typnotnull, t.typdefault,
               t.typname, t.typnamespace, c.depth + 1
        FROM type_chain c JOIN pg_catalog.pg_type t ON t.oid = c.typbasetype
    ), types AS (
        SELECT attnum, bool_or(typnotnull) AS not_null,
               (array_agg(typdefault ORDER BY depth))[1] AS domain_default,
               (array_agg(typname ORDER BY depth DESC))[1] AS base_name,
               (array_agg(typnamespace ORDER BY depth DESC))[1] AS base_namespace
        FROM type_chain GROUP BY attnum
    )
    SELECT r.oid::text AS id, r.relname AS name, r.nspname AS namespace, r.relkind AS kind, r.accessible,
           a.attnum::text AS column_id, a.attname AS column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS native_type,
           NOT (a.attnotnull OR t.not_null) AS nullable,
           t.base_name, tn.nspname AS type_namespace,
           CASE WHEN a.attgenerated = '' THEN
               COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), t.domain_default)
           END AS default_expression,
           a.attidentity AS identity, a.attgenerated AS generated,
           CASE WHEN a.attgenerated <> '' THEN pg_catalog.pg_get_expr(d.adbin, d.adrelid) END AS generation_expression,
           COALESCE((SELECT conkey::text[] FROM pg_catalog.pg_constraint
                     WHERE conrelid = r.oid AND contype = 'p'), '{}'::text[]) AS primary_key
    FROM relation r
    LEFT JOIN attributes a ON a.attrelid = r.oid
    LEFT JOIN types t ON t.attnum = a.attnum
    LEFT JOIN pg_catalog.pg_namespace tn ON tn.oid = t.base_namespace
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    ORDER BY a.attnum
`;
