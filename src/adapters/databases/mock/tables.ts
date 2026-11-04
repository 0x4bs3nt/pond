import type { DatabaseColumn, DatabaseRow } from '../../../domain/database';
import type { MockTable } from './types';

const memberColumns: readonly DatabaseColumn[] = [
    { id: 'id', name: 'id', nativeType: 'int8', category: 'integer', nullable: false },
    { id: 'name', name: 'name', nativeType: 'varchar(120)', category: 'text', nullable: false },
    { id: 'email', name: 'email', nativeType: 'text', category: 'text', nullable: true },
    { id: 'role', name: 'role', nativeType: 'varchar(20)', category: 'text', nullable: false },
    { id: 'active', name: 'active', nativeType: 'bool', category: 'boolean', nullable: false },
    { id: 'balance', name: 'balance', nativeType: 'numeric(20,2)', category: 'decimal', nullable: false },
    { id: 'notes', name: 'notes', nativeType: 'text', category: 'text', nullable: false },
    { id: 'settings', name: 'settings', nativeType: 'jsonb', category: 'json', nullable: false },
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

const row = (id: string, cells: readonly (string | null)[]): DatabaseRow => ({
    id,
    identity: cells[0] === null || cells[0] === undefined ? null : [{ columnId: 'id', value: cells[0] }],
    values: cells.map((text) => (text === null ? { kind: 'null' } : { kind: 'value', text })),
});

const members = Array.from({ length: 250 }, (_, index) =>
    row(`member-${index + 1}`, [
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
    ])
);

const eventColumns: readonly DatabaseColumn[] = [
    { id: 'id', name: 'id', nativeType: 'int8', category: 'integer', nullable: false },
    { id: 'event', name: 'event', nativeType: 'text', category: 'text', nullable: false },
    { id: 'created', name: 'created_at', nativeType: 'timestamptz', category: 'temporal', nullable: false },
    { id: 'metadata', name: 'metadata', nativeType: 'jsonb', category: 'json', nullable: false },
];

export const mockTables: readonly MockTable[] = [
    {
        schema: {
            table: { id: 'members', name: 'members', namespace: ['public'], kind: 'table' },
            columns: memberColumns,
            primaryKey: ['id'],
        },
        rows: members,
    },
    {
        schema: {
            table: { id: 'events', name: 'events', namespace: ['public'], kind: 'table' },
            columns: eventColumns,
            primaryKey: ['id'],
        },
        rows: Array.from({ length: 120 }, (_, index) =>
            row(`event-${index + 1}`, [
                String(index + 1),
                index % 2 ? 'member.created' : 'session.started',
                '2026-01-15 09:30:00+00',
                JSON.stringify({ member_id: index + 1, source: 'demo' }),
            ])
        ),
    },
    {
        schema: {
            table: { id: 'audit_log', name: 'audit_log', namespace: ['public'], kind: 'table' },
            columns: eventColumns,
            primaryKey: ['id'],
        },
        rows: [],
    },
];
