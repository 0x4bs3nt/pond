import { act, useState } from 'react';
import { expect, test } from 'bun:test';
import { useRenderer } from '@opentui/react';
import { createDiagnosticsSession } from '../../../platform/performance';
import { DiagnosticsProvider } from '../../diagnostics';
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
    capabilities: { namespaces: true, primaryKeys: true, maxPageSize: 250 },
    schema: {
        listNamespaces: async () => ({ ok: true, value: [['public']] }),
        listTables: async () => ({ ok: true, value: tables }),
        describeTable: describe,
    },
    browsing: {
        readPage: async (request) => {
            const result = await describe(request.table);
            return result.ok
                ? { ok: true, value: { schema: result.value, page: { rows: [], hasMore: false } } }
                : result;
        },
    },
    close: async () => {},
    subscribeClose: () => () => {},
});

test('table reads deduplicate and coalesce selections, and refresh or unmount drops pending work', async () => {
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
        await act(async () => {
            for (let index = 0; index < 10; index++) view.mockInput.pressEnter();
            view.mockInput.pressArrow('up');
            view.mockInput.pressEnter();
            view.mockInput.pressArrow('down');
            view.mockInput.pressEnter();
        });
        expect(pending).toHaveLength(1);
        await act(async () => pending[0]!.resolve({ ok: true, value: schema(tables[0]!) }));
        expect(pending).toHaveLength(2);
        await view.renderOnce();
        expect(view.captureCharFrame()).not.toContain('first_column');
        await act(async () => pending[1]!.resolve({ ok: true, value: schema(tables[1]!) }));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('second_column');
        expect(view.captureCharFrame()).not.toContain('first_column');
        await act(async () => view.mockInput.pressEnter());
        await act(async () => {
            view.mockInput.pressArrow('up');
            view.mockInput.pressEnter();
            view.mockInput.pressKey('F5');
        });
        await act(async () => pending[2]!.resolve({ ok: true, value: schema(tables[1]!) }));
        await view.renderOnce();
        expect(view.captureCharFrame()).not.toContain('second_column');
        expect(pending).toHaveLength(3);
        await act(async () => {
            view.mockInput.pressEnter();
            view.mockInput.pressArrow('down');
            view.mockInput.pressEnter();
        });
        expect(pending).toHaveLength(4);
        expect(errors).toEqual([]);
    } finally {
        await act(async () => view.dispose());
    }
    await act(async () => pending[3]!.resolve({ ok: true, value: schema(tables[0]!) }));
    expect(pending).toHaveLength(4);
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
        expect(pending).toHaveLength(1); // Fatal errors must not start queued reads.
        expect(errors).toEqual([descriptionError]);
    } finally {
        await act(async () => view.dispose());
    }
    await act(async () => refresh.reject(catalogError));
    expect(errors).toEqual([descriptionError, catalogError]);
});

test('real browsing stays responsive, read-only and recoverable across loading, failure and empty results', async () => {
    const metadata = schema(tables[0]!);
    const database = session(async () => ({ ok: true, value: metadata }));
    const pending = Promise.withResolvers<Awaited<ReturnType<DatabaseSession['browsing']['readPage']>>>();
    const requests: Parameters<DatabaseSession['browsing']['readPage']>[0][] = [];
    database.browsing.readPage = (request) => {
        requests.push(request);
        return pending.promise;
    };
    let disconnected = false;
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <DatabaseExplorer
                session={database}
                databaseName="catalog"
                onDisconnect={() => {
                    disconnected = true;
                }}
                onError={(error) => {
                    throw error;
                }}
            />,
            { width: 110, height: 25 }
        );
    });
    try {
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Loading rows');
        expect(requests[0]).toEqual({ table: tables[0]!, offset: 0, limit: 100 });
        await act(async () => view.mockInput.pressTab());
        await act(async () =>
            pending.resolve({
                ok: true,
                value: {
                    schema: metadata,
                    page: {
                        rows: [
                            { id: '1', identity: null, values: [{ kind: 'value', text: '9007199254740993.123456' }] },
                        ],
                        hasMore: true,
                    },
                },
            })
        );
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('9007199254740993.123456');
        expect(view.captureCharFrame()).toContain('Read-only');
        expect(view.captureCharFrame()).toContain('More rows available');
        await act(async () => {
            view.mockInput.pressEnter();
            view.mockInput.typeText('changed');
            view.mockInput.pressKey('s', { ctrl: true });
        });
        await view.renderOnce();
        expect(view.captureCharFrame()).not.toContain('changed');
        expect(requests).toHaveLength(1);
        await act(async () => view.mockInput.pressKey('F4'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Structure only');
        expect(view.captureCharFrame()).toContain('numeric(24,6)');
        await act(async () => view.mockInput.pressKey('F4'));
        database.browsing.readPage = async () => ({ ok: false, error: { code: 'permission-denied' } });
        await act(async () => view.mockInput.pressTab());
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Permission denied');
        expect(view.captureCharFrame()).not.toContain('9007199254740993.123456');
        await act(async () => view.mockInput.pressKey('F4'));
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Structure only');
        await act(async () => view.mockInput.pressKey('F4'));
        database.browsing.readPage = async () => ({
            ok: true,
            value: { schema: metadata, page: { rows: [], hasMore: false } },
        });
        await act(async () => view.mockInput.pressEnter());
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('No rows');
        expect(view.captureCharFrame()).toContain('first_column');
        await act(async () => view.mockInput.pressKey('d', { ctrl: true }));
        expect(disconnected).toBe(true);
    } finally {
        await act(async () => view.dispose());
    }
});

test('PostgreSQL grid diagnostics correlate changed selections and ignore no-op or hidden input', async () => {
    const database = session(async () => ({ ok: true, value: schema(tables[0]!) }));
    database.browsing.readPage = async () => ({
        ok: true,
        value: {
            schema: schema(tables[0]!),
            page: {
                hasMore: false,
                rows: ['1', '2', '3'].map((text) => ({
                    id: text,
                    identity: null,
                    values: [{ kind: 'value', text }],
                })),
            },
        },
    });
    let diagnostics!: ReturnType<typeof createDiagnosticsSession>;
    const Harness = () => {
        const renderer = useRenderer();
        const [session] = useState(() =>
            createDiagnosticsSession(renderer, {
                appVersion: 'test',
                source: 'app',
                startedAtMs: performance.now(),
            })
        );
        diagnostics = session;
        return (
            <DiagnosticsProvider session={session}>
                <DatabaseExplorer
                    session={database}
                    databaseName="catalog"
                    onDisconnect={() => {}}
                    onError={(error) => {
                        throw error;
                    }}
                />
            </DiagnosticsProvider>
        );
    };
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(<Harness />, { width: 110, height: 25, gatherStats: true });
    });
    try {
        await act(async () => view.mockInput.pressEnter());
        await act(async () => view.mockInput.pressTab());
        await view.renderOnce();
        const commits = diagnostics.snapshot().react.regions['table-browser']!.actualMs.count;
        expect(commits).toBeGreaterThan(0);
        await act(async () => {
            view.mockInput.pressArrow('down');
            view.mockInput.pressArrow('down');
        });
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('Value: 3');
        const report = diagnostics.snapshot();
        expect(report.interactions.correlated).toBe(2);
        expect(report.interactions.coalesced).toBe(1);
        expect(report.interactions.navigation.inputToFrameMs.count).toBe(1);
        expect(report.react.regions['table-browser']!.actualMs.count).toBeGreaterThan(commits);
        await act(async () => view.mockInput.pressArrow('down')); // Already at the last row.
        await act(async () => view.mockInput.pressKey('F4'));
        await act(async () => view.mockInput.pressArrow('up')); // Rows are hidden.
        await view.renderOnce();
        expect(diagnostics.snapshot().interactions.correlated).toBe(2);
        expect(diagnostics.snapshot().interactions.pending).toBe(0);
    } finally {
        diagnostics.stop();
        await act(async () => view.dispose());
    }
});
