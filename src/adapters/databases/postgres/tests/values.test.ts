import { describe, expect, test } from 'bun:test';
import { types } from 'pg';
import { decodePostgresValue, queryValues } from '../values';
import { createSchemaInspection } from '../schema';
import { postgresAvailable, startPostgres } from './fixture';

test('decoding rejects already-coerced values rather than pretending they are exact', () => {
    for (const value of [9007199254740992, 1.25, true, new Date(), { amount: 9007199254740992 }, ['text'], undefined])
        expect(() => decodePostgresValue(value, types.builtins.TEXT)).toThrow(
            'Expected a PostgreSQL text-format value.'
        );
    expect(decodePostgresValue('9007199254740993', types.builtins.INT8)).toEqual({
        kind: 'value',
        text: '9007199254740993',
    });
    expect(decodePostgresValue('opaque representation', 999999)).toEqual({
        kind: 'unsupported',
        text: 'opaque representation',
    });
});

describe.skipIf(!postgresAvailable)('PostgreSQL exact values', () => {
    test('preserves scalar precision, JSON tokens, NULL, Unicode and native metadata at the driver boundary', async () => {
        const fixture = await startPostgres();
        try {
            await fixture.client.query(`
                CREATE DOMAIN exact_amount AS numeric(50,18);
                CREATE TABLE exact_values (
                    large bigint, amount numeric(50,18), label text, empty_text text, missing text,
                    document json, binary_document jsonb, json_null json, json_string json,
                    moment timestamp(6), zoned timestamptz(6), day date, flag boolean, domain_amount exact_amount
                );
                SET TIME ZONE 'UTC';
                SET DateStyle TO 'ISO, YMD';
            `);
            const large = '9223372036854775807';
            const amount = '123456789012345678901234567890.123456789012345678';
            const unicode = 'Alice · London · 東京 · 🌱 · e\u0301\n\tend';
            const document = '{ "id": 9007199254740993, "amount": 0.12345678901234567890, "id": 9007199254740995 }';
            await fixture.client.query(
                `INSERT INTO exact_values VALUES (
                $1, $2, $3, '', NULL, $4::json, $4::json::jsonb, 'null', '"null"',
                '2026-11-05 12:34:56.123456', '2026-11-05 12:34:56.123456+02', 'infinity', false, $2::numeric
            )`,
                [large, amount, unicode, document]
            );
            const result = await queryValues(fixture.client, 'SELECT * FROM exact_values');
            expect(result.rows[0]).toEqual([
                { kind: 'value', text: large },
                { kind: 'value', text: amount },
                { kind: 'value', text: unicode },
                { kind: 'value', text: '' },
                { kind: 'null' },
                { kind: 'value', text: document },
                { kind: 'value', text: '{"id": 9007199254740995, "amount": 0.12345678901234567890}' },
                { kind: 'value', text: 'null' },
                { kind: 'value', text: '"null"' },
                { kind: 'value', text: '2026-11-05 12:34:56.123456' },
                { kind: 'value', text: '2026-11-05 10:34:56.123456+00' },
                { kind: 'value', text: 'infinity' },
                { kind: 'value', text: 'f' },
                { kind: 'value', text: amount },
            ]);
            expect(result.fields.every((field) => field.format === 'text')).toBe(true);
            expect(result.fields[0]!.dataTypeID).toBe(types.builtins.INT8);
            expect(result.fields[1]!.dataTypeID).toBe(types.builtins.NUMERIC);
            const schema = await createSchemaInspection(fixture.client, () => false).describeTable({
                namespace: ['public'],
                name: 'exact_values',
            });
            if (!schema.ok) throw new Error(schema.error.code);
            expect(schema.value.columns[1]!.nativeType).toBe('numeric(50,18)');
            expect(schema.value.columns[13]!.nativeType).toBe('exact_amount');

            const special = await queryValues(
                fixture.client,
                `SELECT $1::int8 AS same, 'NaN'::numeric AS same,
                'Infinity'::float8, '-Infinity'::numeric, 1.2345678901234567::float8`,
                ['-9223372036854775808']
            );
            expect(special.rows[0]).toEqual(
                ['-9223372036854775808', 'NaN', 'Infinity', '-Infinity', '1.2345678901234567'].map((text) => ({
                    kind: 'value',
                    text,
                }))
            );
            expect(special.fields.slice(0, 2).map((field) => field.name)).toEqual(['same', 'same']);
            // Value queries must not alter the catalog/client defaults or global pg parsers.
            expect(
                (await fixture.client.query(`SELECT true AS flag, 42 AS number, '{"ok":true}'::json AS document`))
                    .rows[0]
            ).toEqual({ flag: true, number: 42, document: { ok: true } });
        } finally {
            await fixture.stop();
        }
    }, 20000);

    test('unfamiliar, composite, array and binary values retain their server representation as unsupported', async () => {
        const fixture = await startPostgres();
        try {
            await fixture.client.query(
                `CREATE TYPE workflow_state AS ENUM ('ready'); CREATE TYPE pair AS (id bigint, label text);`
            );
            const result = await queryValues(
                fixture.client,
                `SELECT 'ready'::workflow_state,
                ROW(9007199254740993::bigint, 'a,b')::pair,
                '[0:2]={9007199254740993,NULL,-9223372036854775808}'::bigint[],
                decode('00ff5c', 'hex'), '[1,10)'::int8range, NULL::workflow_state, NULL::money`
            );
            expect(result.rows[0]).toEqual([
                { kind: 'unsupported', text: 'ready' },
                { kind: 'unsupported', text: '(9007199254740993,"a,b")' },
                { kind: 'unsupported', text: '[0:2]={9007199254740993,NULL,-9223372036854775808}' },
                { kind: 'unsupported', text: '\\x00ff5c' },
                { kind: 'unsupported', text: '[1,10)' },
                { kind: 'null', readOnly: true },
                { kind: 'null', readOnly: true },
            ]);
        } finally {
            await fixture.stop();
        }
    }, 20000);
});
