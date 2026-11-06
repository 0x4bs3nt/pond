import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { DatabaseResult } from '../../../../domain/database';
import type { DatabaseSession } from '../../../../ports/database';
import { postgresDatabaseAdapter } from '../adapter';
import { postgresAvailable, startPostgres } from './fixture';

const value = <T extends unknown>(result: DatabaseResult<T>): T => {
    if (!result.ok) throw new Error(result.error.code);
    return result.value;
};

describe.skipIf(!postgresAvailable)('PostgreSQL bounded browsing', () => {
    let fixture: Awaited<ReturnType<typeof startPostgres>>;
    let session: DatabaseSession;
    const table = { namespace: ['Odd.Schema'], name: 'Order.Items' };
    const connect = async (user = 'pond') =>
        value(
            await postgresDatabaseAdapter.connect({
                engineId: 'postgres',
                database: 'postgres',
                network: { host: '127.0.0.1', port: fixture.port, user, tls: 'disable' },
            })
        );
    beforeAll(async () => {
        fixture = await startPostgres();
        await fixture.client.query(`
            CREATE SCHEMA "Odd.Schema";
            CREATE TABLE "Odd.Schema"."Order.Items" (
                "Group" integer, "Key" bigint, amount numeric(40,8), document json, missing text,
                PRIMARY KEY ("Group", "Key")
            );
            INSERT INTO "Odd.Schema"."Order.Items"
                SELECT n % 2, n, 9007199254740993.12345678, '{ "id": 9007199254740993 }', NULL FROM generate_series(300, 1, -1) n;
            CREATE VIEW "Odd.Schema"."Read view" AS SELECT * FROM "Odd.Schema"."Order.Items";
            CREATE MATERIALIZED VIEW "Odd.Schema".summary AS SELECT 1::bigint AS total;
            CREATE TABLE "Odd.Schema".empty (id integer);
            CREATE TABLE "Odd.Schema".zero_columns ();
            INSERT INTO "Odd.Schema".zero_columns DEFAULT VALUES;
            CREATE TABLE "Odd.Schema"."x""; DROP TABLE sentinel; --" ("a.b" text);
            INSERT INTO "Odd.Schema"."x""; DROP TABLE sentinel; --" VALUES ('safe');
            CREATE TABLE sentinel (id integer);
            CREATE ROLE page_reader LOGIN;
            GRANT USAGE ON SCHEMA "Odd.Schema" TO page_reader;
            GRANT SELECT ("Key") ON "Odd.Schema"."Order.Items" TO page_reader;
            GRANT SELECT ON "Odd.Schema".empty TO page_reader;
            CREATE SEQUENCE read_side_effect;
            CREATE VIEW "Odd.Schema".side_effect AS SELECT nextval('read_side_effect') AS id;
        `);
        session = await connect();
    }, 20000);
    afterAll(async () => {
        await session?.close();
        await fixture?.stop();
    });

    test('bounds pages, preserves exact values and metadata, and quotes identifiers independently', async () => {
        const first = value(await session.browsing.readPage({ table, offset: 0, limit: 1 }));
        expect(first.schema.columns.map((column) => column.name)).toEqual([
            'Group',
            'Key',
            'amount',
            'document',
            'missing',
        ]);
        expect(first.schema.columns[2]!.nativeType).toBe('numeric(40,8)');
        expect(first.schema.primaryKey).toEqual(['1', '2']);
        expect(first.page.rows).toHaveLength(1);
        expect(first.page.hasMore).toBe(true);
        expect(first.page.rows[0]!.values).toEqual([
            { kind: 'value', text: '0' },
            { kind: 'value', text: '2' },
            { kind: 'value', text: '9007199254740993.12345678' },
            { kind: 'value', text: '{ "id": 9007199254740993 }' },
            { kind: 'null' },
        ]);
        expect(first.page.rows[0]!.identity).toBeNull();
        const full = value(await session.browsing.readPage({ table, offset: 0, limit: 250 }));
        expect(full.page.rows).toHaveLength(250);
        expect(full.page.hasMore).toBe(true);
        const last = value(await session.browsing.readPage({ table, offset: 250, limit: 50 }));
        expect(last.page.rows).toHaveLength(50);
        expect(last.page.hasMore).toBe(false);
        const quoted = value(
            await session.browsing.readPage({
                table: { namespace: ['Odd.Schema'], name: 'x"; DROP TABLE sentinel; --' },
                offset: 0,
                limit: 1,
            })
        );
        expect(quoted.schema.columns[0]!.name).toBe('a.b');
        expect(quoted.page.rows[0]!.values).toEqual([{ kind: 'value', text: 'safe' }]);
        expect((await fixture.client.query("SELECT to_regclass('sentinel') AS name")).rows[0].name).toBe('sentinel');
    });

    test('handles empty and zero-column relations, views and materialized views', async () => {
        for (const [name, expected] of [
            ['empty', 0],
            ['zero_columns', 1],
            ['Read view', 2],
            ['summary', 1],
        ] as const) {
            const result = value(
                await session.browsing.readPage({ table: { namespace: ['Odd.Schema'], name }, offset: 0, limit: 2 })
            );
            expect(result.page.rows).toHaveLength(expected);
            if (name === 'zero_columns') expect(result.page.rows[0]!.values).toEqual([]);
            if (name === 'empty') expect(result.schema.columns[0]!.name).toBe('id');
        }
        expect(value(await session.browsing.readPage({ table, offset: 300, limit: 1 })).page).toEqual({
            rows: [],
            hasMore: false,
        });
    });

    test('keeps a page and its column names together while a concurrent DDL change waits', async () => {
        await fixture.client.query('CREATE VIEW "Odd.Schema".delayed AS SELECT 1 AS original FROM pg_sleep(0.3)');
        const reference = { namespace: ['Odd.Schema'], name: 'delayed' };
        const reading = session.browsing.readPage({ table: reference, offset: 0, limit: 1 });
        const deadline = Date.now() + 3000;
        let active = false;
        while (!active && Date.now() < deadline) {
            const result = await fixture.client.query(`SELECT EXISTS (
                SELECT 1 FROM pg_stat_activity WHERE application_name = 'pond' AND state = 'active'
                AND query LIKE 'SELECT * FROM "Odd.Schema"."delayed"%LIMIT $1%'
            ) AS active`);
            active = result.rows[0].active;
            if (!active) await Bun.sleep(10);
        }
        expect(active).toBe(true);
        let renamed = false;
        const rename = fixture.client
            .query('ALTER VIEW "Odd.Schema".delayed RENAME COLUMN original TO renamed')
            .then(() => {
                renamed = true;
            });
        await Bun.sleep(30);
        expect(renamed).toBe(false);
        const before = value(await reading);
        await rename;
        expect(before.schema.columns[0]!.name).toBe('original');
        expect(before.page.rows[0]!.values[0]).toEqual({ kind: 'value', text: '1' });
        const after = value(await session.browsing.readPage({ table: reference, offset: 0, limit: 1 }));
        expect(after.schema.columns[0]!.name).toBe('renamed');
    });

    test('rejects invalid requests and recovers after permission, missing-relation and read-only failures', async () => {
        for (const range of [
            { offset: -1, limit: 1 },
            { offset: 0.5, limit: 1 },
            { offset: 0, limit: 0 },
            { offset: 0, limit: 251 },
            { offset: 0, limit: Infinity },
        ])
            expect(await session.browsing.readPage({ table, ...range })).toEqual({
                ok: false,
                error: { code: 'invalid-request' },
            });
        expect(
            await session.browsing.readPage({ table: { namespace: ['a', 'b'], name: 'c' }, offset: 0, limit: 1 })
        ).toEqual({ ok: false, error: { code: 'invalid-request' } });
        expect(
            await session.browsing.readPage({
                table: { namespace: ['Odd.Schema'], name: 'missing' },
                offset: 0,
                limit: 1,
            })
        ).toEqual({ ok: false, error: { code: 'not-found' } });
        expect(
            await session.browsing.readPage({
                table: { namespace: ['Odd.Schema'], name: 'side_effect' },
                offset: 0,
                limit: 1,
            })
        ).toEqual({ ok: false, error: { code: 'query-failed' } });
        expect((await fixture.client.query('SELECT is_called FROM read_side_effect')).rows[0].is_called).toBe(false);
        const reader = await connect('page_reader');
        try {
            expect(await reader.browsing.readPage({ table, offset: 0, limit: 1 })).toEqual({
                ok: false,
                error: { code: 'permission-denied' },
            });
            expect(
                value(
                    await reader.browsing.readPage({
                        table: { namespace: ['Odd.Schema'], name: 'empty' },
                        offset: 0,
                        limit: 1,
                    })
                ).page.rows
            ).toEqual([]);
        } finally {
            await reader.close();
        }
        // A failed transaction must not poison later catalog/page operations on the client.
        const results = await Promise.all([
            session.browsing.readPage({ table, offset: 0, limit: 1 }),
            session.schema.describeTable(table),
            session.browsing.readPage({ table, offset: 1, limit: 1 }),
        ]);
        expect(results.every((result) => result.ok)).toBe(true);
        expect(
            (
                await fixture.client.query(
                    "SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name = 'pond' AND state LIKE 'idle in transaction%' "
                )
            ).rows[0].count
        ).toBe(0);
        const closed = await connect();
        await closed.close();
        expect(await closed.browsing.readPage({ table, offset: 0, limit: 1 })).toEqual({
            ok: false,
            error: { code: 'closed' },
        });
    });
});
