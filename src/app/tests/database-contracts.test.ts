import { expect, test } from 'bun:test';
import { createDatabaseRegistry } from '../../adapters/databases';
import { mockDatabaseAdapter } from '../../adapters/databases/mock';
import { connectDatabase, readTable } from '../../services/database';

const registry = createDatabaseRegistry([mockDatabaseAdapter]);
const members = { namespace: ['public'], name: 'members' };
const connect = async () => {
    const result = await connectDatabase(registry, { engineId: 'mock', database: 'demo' });
    if (!result.ok) throw new Error('Mock connection failed.');
    return result.value;
};

test('unknown or duplicate engines cannot silently select or replace a database adapter', async () => {
    expect(await connectDatabase(registry, { engineId: 'postgres', database: 'demo' })).toEqual({
        ok: false,
        error: { code: 'unsupported-engine' },
    });
    expect(() => createDatabaseRegistry([mockDatabaseAdapter, mockDatabaseAdapter])).toThrow();
    expect(await connectDatabase(registry, { engineId: 'mock', database: 'missing' })).toEqual({
        ok: false,
        error: { code: 'not-found' },
    });
});

test('service reads preserve exact values and identities without exposing shared adapter data', async () => {
    const session = await connect();
    const request = { table: members, offset: 0, limit: 2 };
    try {
        const result = await readTable(session, request);
        if (!result.ok) throw new Error('Mock read failed.');
        const { schema, page } = result.value;
        expect(page.rows).toHaveLength(2);
        expect(page.hasMore).toBe(true);
        expect(schema.columns[5]?.nativeType).toBe('numeric(20,2)');
        expect(page.rows[0]?.values[5]).toEqual({ kind: 'value', text: '9007199254740993.25' });
        expect(page.rows[0]?.values[2]).toEqual({ kind: 'null' });
        expect(page.rows[1]?.values[6]).toEqual({ kind: 'value', text: '' });
        expect(page.rows[0]?.identity).toEqual([{ columnId: 'id', value: '1' }]);
        // Even a consumer bypassing readonly types cannot corrupt later reads or sessions.
        const first = page.rows[0]!.values[5]!;
        if (first.kind !== 'null') Object.assign(first, { text: 'changed' });
        Object.assign(schema.columns[5]!, { nativeType: 'changed' });
        const reread = await readTable(session, request);
        if (!reread.ok) throw new Error('Mock reread failed.');
        expect(reread.value.page.rows[0]?.values[5]).toEqual({ kind: 'value', text: '9007199254740993.25' });
        expect(reread.value.schema.columns[5]?.nativeType).toBe('numeric(20,2)');
        expect(await readTable(session, { ...request, table: { namespace: [], name: 'public.members' } })).toEqual({
            ok: false,
            error: { code: 'not-found' },
        });
    } finally {
        await session.close();
    }
});

test('invalid pages stay bounded and closing a session prevents further reads without closing another', async () => {
    const session = await connect();
    const other = await connect();
    const request = { table: members, offset: 0, limit: 1 };
    try {
        for (const range of [
            { offset: -1, limit: 1 },
            { offset: 0.5, limit: 1 },
            { offset: 0, limit: 0 },
            { offset: 0, limit: Infinity },
            { offset: 0, limit: session.capabilities.maxPageSize + 1 },
        ]) {
            expect(await readTable(session, { ...request, ...range })).toEqual({
                ok: false,
                error: { code: 'invalid-request' },
            });
        }
        const end = await session.browsing.readPage({ ...request, offset: 249, limit: 2 });
        if (!end.ok) throw new Error('Mock page failed.');
        expect(end.value.page.rows.map((row) => row.id)).toEqual(['member-250']);
        expect(end.value.page.hasMore).toBe(false);
        await session.close();
        await session.close();
        expect(await session.schema.listNamespaces()).toEqual({ ok: false, error: { code: 'closed' } });
        expect(await session.browsing.readPage(request)).toEqual({ ok: false, error: { code: 'closed' } });
        expect((await readTable(other, request)).ok).toBe(true);
    } finally {
        await session.close();
        await other.close();
    }
});
