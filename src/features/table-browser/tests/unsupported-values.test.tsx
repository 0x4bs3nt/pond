import { act } from 'react';
import { expect, test } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import type { DatabaseColumn, TableData } from '../../../domain/database';
import { createTableSessionsStore } from '../../../state/table-sessions';
import { createWorkspaceStore } from '../../../state/workspace';
import { WorkspaceProvider } from '../../workspace';
import { presentTable } from '../present-table';
import { TableBrowser } from '../TableBrowser';

const column = (id: string, nativeType: string, category: DatabaseColumn['category']): DatabaseColumn => ({
    id,
    name: id,
    nativeType,
    category,
    nullable: true,
    defaultExpression: null,
    identity: null,
    generated: null,
});

test('presentation keeps exact text and blocks unsupported edits, including NULL in an unfamiliar column', async () => {
    const data: TableData = {
        schema: {
            table: { id: 'values', name: 'values', namespace: ['public'], kind: 'table' },
            columns: [
                column('opaque', 'custom_value', 'text'),
                column('missing', 'custom_value', 'other'),
                column('amount', 'numeric(30,8)', 'decimal'),
                column('empty', 'text', 'text'),
                column('json', 'json', 'json'),
            ],
            primaryKey: [],
        },
        page: {
            hasMore: false,
            rows: [
                {
                    id: '1',
                    identity: null,
                    values: [
                        { kind: 'unsupported', text: '(9007199254740993,"Alice")' },
                        { kind: 'null', readOnly: true },
                        { kind: 'value', text: '9007199254740993.12345678' },
                        { kind: 'value', text: '' },
                        { kind: 'value', text: '{ "id": 9007199254740993, "value": null }' },
                    ],
                },
            ],
        },
    };
    const table = presentTable(data, {});
    expect(table.columns[2]!.type).toBe('numeric(30,8)');
    expect(table.rows[0]!.cells).toEqual([
        '(9007199254740993,"Alice")',
        null,
        '9007199254740993.12345678',
        '',
        '{ "id": 9007199254740993, "value": null }',
    ]);
    const store = createWorkspaceStore(table.id);
    const sessions = createTableSessionsStore();
    let view!: Awaited<ReturnType<typeof testRender>>;
    await act(async () => {
        view = await testRender(
            <WorkspaceProvider store={store}>
                <TableBrowser table={table} sessions={sessions} width={110} height={24} focused onFocus={() => {}} />
            </WorkspaceProvider>,
            { width: 110, height: 24 }
        );
    });
    try {
        for (let index = 0; index < 2; index++) {
            await view.renderOnce();
            expect(view.captureCharFrame()).toContain('Read-only');
            await act(async () => view.mockInput.pressEnter());
            expect(store.getState().editing).toBe(false);
            expect(sessions.getState().changes).toEqual({});
            await act(async () => view.mockInput.pressArrow('right'));
        }
        await view.renderOnce();
        expect(view.captureCharFrame()).toContain('9007199254740993.12345678');
        await act(async () => view.mockInput.pressEnter());
        expect(store.getState().editing).toBe(true);
        await act(async () => view.mockInput.pressKey('\u001b[27u'));
        expect(sessions.getState().changes).toEqual({});
        expect(data.page.rows[0]!.values[0]).toEqual({ kind: 'unsupported', text: '(9007199254740993,"Alice")' });
    } finally {
        await act(async () => view.dispose());
    }
});
