import type { GridColumn, GridRow } from '../../components/data-grid';

import type { TableView } from './types';

const memberColumns: GridColumn[] = [
    { id: 'id', name: 'id', type: 'int8 · PK', width: 11 },
    { id: 'name', name: 'name', type: 'varchar(120)', width: 22 },
    { id: 'email', name: 'email', type: 'text', width: 32 },
    { id: 'role', name: 'role', type: 'varchar(20)', width: 16 },
    { id: 'active', name: 'active', type: 'bool', width: 12 },
    { id: 'balance', name: 'balance', type: 'numeric(20,2)', width: 24 },
    { id: 'notes', name: 'notes', type: 'text', width: 48 },
    { id: 'settings', name: 'settings', type: 'jsonb', width: 48 },
];
const names = [
    'Mara Novak',
    'Renée Martin',
    '田中 花子',
    'Luka Horvat',
    'Zoë Williams',
    'أحمد علي',
    'Alex 🌱',
    'Søren Nielsen',
];

const members: GridRow[] = Array.from({ length: 250 }, (_, index) => ({
    id: `member-${index + 1}`,
    cells: [
        String(index + 1),
        names[index % names.length] ?? '',
        index % 7 === 0 ? null : `member.${index + 1}@example.com`,
        index % 9 === 0 ? 'admin' : 'member',
        index % 5 === 0 ? 'false' : 'true',
        index === 0 ? '9007199254740993.25' : `${index * 13}.50`,
        index % 3 === 0
            ? 'A long note to exercise horizontal scrolling and inspect the selected cell.'
            : index % 3 === 1
              ? ''
              : 'First line\nSecond line',
        JSON.stringify({ theme: index % 2 ? 'dark' : 'light', notifications: true }),
    ],
}));

const eventColumns: GridColumn[] = [
    { id: 'id', name: 'id', type: 'int8 · PK', width: 11 },
    { id: 'event', name: 'event', type: 'text', width: 24 },
    { id: 'created', name: 'created_at', type: 'timestamptz', width: 28 },
    { id: 'metadata', name: 'metadata', type: 'jsonb', width: 60 },
];

export const mockTables: readonly TableView[] = [
    { id: 'members', name: 'members', columns: memberColumns, rows: members },
    {
        id: 'events',
        name: 'events',
        columns: eventColumns,
        rows: Array.from({ length: 120 }, (_, index) => ({
            id: `event-${index + 1}`,
            cells: [
                String(index + 1),
                index % 2 ? 'member.created' : 'session.started',
                '2026-01-15 09:30:00+00',
                JSON.stringify({ member_id: index + 1, source: 'demo' }),
            ],
        })),
    },
    { id: 'audit_log', name: 'audit_log', columns: eventColumns, rows: [] },
];
