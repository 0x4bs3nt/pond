import { act } from 'react';
import { expect, test } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import type { DatabaseResult, DatabaseTable, TableSchema } from '../../../domain/database';
import type { DatabaseSession } from '../../../ports/database';
import { DatabaseExplorer } from '../DatabaseExplorer';

const tables: DatabaseTable[] = ['first', 'second'].map((name) => ({
    id: name,
    name,
    namespace: ['public'],
    kind: 'table',
}));
const schema = (table: DatabaseTable): TableSchema => ({
    table,
    primaryKey: [],
    columns: [
        {
            id: '1',
            name: `${table.name}_column`,
            nativeType: 'numeric(24,6)',
            category: 'decimal',
            nullable: true,
            defaultExpression: null,
            generated: null,
            identity: null,
        },
    ],
});
const session = (describe: DatabaseSession['schema']['describeTable']): DatabaseSession => ({
    capabilities: { namespaces: true, primaryKeys: true, maxPageSize: 0 },
    schema: {
        listNamespaces: async () => ({ ok: true, value: [['public']] }),
        listTables: async () => ({ ok: true, value: tables }),
        describeTable: describe,
    },
    browsing: { readPage: async () => ({ ok: false, error: { code: 'unsupported-operation' } }) },
    close: async () => {},
    subscribeClose: () => () => {},
});

test('late column results cannot overwrite a newer selection or a refreshed catalog', async () => {
    const pending: ReturnType<typeof Promise.withResolvers<DatabaseResult<TableSchema>>>[] = [];
    const database = session(() => {
        const request = Promise.withResolvers<DatabaseResult<TableSchema>>();
        pending.push(request);
        return request.promise;
    });
    const errors: unknown[] = [];
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <DatabaseExplorer
                session={database}
                databaseName="catalog"
                onDisconnect={() => {}}
                onError={(error) => errors.push(error)}
            />,
            { width: 110, height: 25 }
        );
    });
    try {
        await act(async () => view.mockInput.pressEnter());
        await act(async () => {
            view.mockInput.pressArrow('down');
            view.mockInput.pressEnter();
        });
        expect(pending).toHaveLength(2);
        await act(async () => pending[1]!.resolve({ ok: true, value: schema(tables[1]!) }));
        await act(async () => pending[0]!.resolve({ ok: true, value: schema(tables[0]!) }));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('second_column');
        expect(view.captureCharFrame()).not.toContain('first_column');
        await act(async () => view.mockInput.pressEnter());
        await act(async () => view.mockInput.pressKey('F5'));
        await act(async () => pending[2]!.resolve({ ok: true, value: schema(tables[1]!) }));
        await view.renderOnce();
        expect(view.captureCharFrame()).not.toContain('second_column');
        expect(errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
    }
});

test('catalog failures offer a retry and an empty result stays distinct from loading or failure', async () => {
    const database = session(async () => ({ ok: true, value: schema(tables[0]!) }));
    let attempt = 0;
    database.schema.listNamespaces = async () =>
        ++attempt === 1 ? { ok: false, error: { code: 'permission-denied' } } : { ok: true, value: [] };
    const errors: unknown[] = [];
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <DatabaseExplorer
                session={database}
                databaseName="catalog"
                onDisconnect={() => {}}
                onError={(error) => errors.push(error)}
            />,
            { width: 100, height: 25 }
        );
    });
    try {
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Permission denied.');
        await act(async () => view.mockInput.pressKey('F5'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('No accessible schemas.');
        expect(view.captureCharFrame()).not.toContain('Permission denied.');
        expect(errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
    }
});

test('F5 followed by Enter in one input batch cannot reopen an old table during refresh', async () => {
    let descriptions = 0;
    const database = session(async () => {
        descriptions++;
        return { ok: true, value: schema(tables[0]!) };
    });
    const refresh = Promise.withResolvers<Awaited<ReturnType<DatabaseSession['schema']['listNamespaces']>>>();
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <DatabaseExplorer
                session={database}
                databaseName="catalog"
                onDisconnect={() => {}}
                onError={(error) => {
                    throw error;
                }}
            />,
            { width: 110, height: 25 }
        );
    });
    try {
        database.schema.listNamespaces = () => refresh.promise;
        await act(async () => {
            view.mockInput.pressKey('F5');
            view.mockInput.pressEnter();
        });
        await act(async () => refresh.resolve({ ok: true, value: [] }));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('No accessible schemas.');
        expect(view.captureCharFrame()).not.toContain('first_column');
        expect(descriptions).toBe(0);
    } finally {
        await act(async () => view.dispose());
    }
});

test('unexpected stale description and catalog failures still reach lifecycle handling', async () => {
    const pending: ReturnType<typeof Promise.withResolvers<DatabaseResult<TableSchema>>>[] = [];
    const database = session(() => {
        const request = Promise.withResolvers<DatabaseResult<TableSchema>>();
        pending.push(request);
        return request.promise;
    });
    const refresh = Promise.withResolvers<Awaited<ReturnType<DatabaseSession['schema']['listNamespaces']>>>();
    const errors: unknown[] = [];
    const descriptionError = new TypeError('Unexpected description failure');
    const catalogError = new TypeError('Unexpected catalog failure');
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <DatabaseExplorer
                session={database}
                databaseName="catalog"
                onDisconnect={() => {}}
                onError={(error) => errors.push(error)}
            />,
            { width: 110, height: 25 }
        );
    });
    try {
        await act(async () => view.mockInput.pressEnter());
        await act(async () => {
            view.mockInput.pressArrow('down');
            view.mockInput.pressEnter();
        });
        await act(async () => pending[0]!.reject(descriptionError));
        expect(errors).toEqual([descriptionError]);

        database.schema.listNamespaces = () => refresh.promise;
        await act(async () => view.mockInput.pressKey('F5'));
        await act(async () => pending[1]!.resolve({ ok: false, error: { code: 'permission-denied' } }));
        expect(errors).toEqual([descriptionError]);
    } finally {
        await act(async () => view.dispose());
    }
    await act(async () => refresh.reject(catalogError));
    expect(errors).toEqual([descriptionError, catalogError]);
});
