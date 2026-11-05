import { createStressScenario } from './stress-data';
import type { GalleryScenario } from './types';

const columns = [
    { id: 'id', name: 'id', type: 'int8 · PK', width: 10 },
    { id: 'value', name: 'value', type: 'text', width: 38 },
    { id: 'detail', name: 'detail', type: 'text', width: 64 },
];
const values = [
    null,
    '',
    '田中 花子',
    'أحمد علي',
    'Alex 🌱',
    'e\u0301 / é',
    'First line\nSecond line',
    'Long value '.repeat(40),
];

export const scenarios: readonly GalleryScenario[] = [
    {
        id: 'schemas',
        label: 'Schema explorer',
        description: 'Grouped schemas, views, empty schemas, scrolling, mouse selection and focus.',
        columns: [],
        rows: [],
        explorer: {
            groups: [
                { id: 'public', name: '"public"', tables: [{ id: 'view', name: 'Read view', kind: 'view' }] },
                { id: 'empty', name: '"Empty schema"', tables: [] },
                {
                    id: 'odd',
                    name: '"Mixed.Case"',
                    tables: Array.from({ length: 40 }, (_, index) => ({
                        id: `table-${index}`,
                        name: index === 0 ? 'select' : `Table ${index + 1}`,
                        kind: 'table',
                    })),
                },
            ],
        },
    },
    {
        id: 'schemas-empty',
        label: 'Empty explorer',
        description: 'No accessible schemas; navigation and mouse input remain safe.',
        columns: [],
        rows: [],
        explorer: { groups: [], message: 'No accessible schemas.' },
    },
    {
        id: 'wide',
        label: 'Wide table',
        description: '250 rows × 24 columns. Exercise selection, paging, wheel scrolling, and resizing.',
        columns: Array.from({ length: 24 }, (_, index) => ({
            id: `c${index}`,
            name: `column_${index + 1}`,
            type: 'text',
            width: 18 + (index % 3) * 8,
        })),
        rows: Array.from({ length: 250 }, (_, row) => ({
            id: `r${row}`,
            cells: Array.from({ length: 24 }, (_, col) => `Row ${row + 1} / Col ${col + 1}`),
        })),
    },
    {
        id: 'empty',
        label: 'Empty results',
        description: 'Columns with zero rows. Navigation and editing should remain safe.',
        columns,
        rows: [],
    },
    {
        id: 'values',
        label: 'Unusual values',
        description: 'NULL, empty text, Unicode, combining marks, multiline text, and long values.',
        columns,
        rows: values.map((value, index) => ({
            id: `value-${index}`,
            cells: [String(index + 1), value, '9007199254740993.25 — exact text; never converted to a number'],
        })),
    },
    {
        id: 'pending',
        label: 'Pending decorations',
        description: 'Selected and unselected changed cells. Enter stages local edits; Ctrl+D resets.',
        columns,
        rows: [
            {
                id: 'changed',
                cells: ['1', 'Staged text', 'Compare amber decorations with the selection color.'],
                modifiedColumns: ['value'],
            },
            { id: 'null', cells: ['2', null, 'NULL is distinct from empty text.'], modifiedColumns: ['value'] },
            { id: 'unchanged', cells: ['3', 'Original text', 'Unmodified row'] },
        ],
    },
    {
        id: 'single-line',
        label: 'Single-line editor',
        description: 'Enter or click Open editor. Check confirm, cancel, empty text, and Ctrl+N for NULL.',
        columns: [columns[1]!],
        rows: [{ id: 'input', cells: ['Editable text'] }],
        editor: { multiline: false, json: false },
    },
    {
        id: 'multiline',
        label: 'Multiline editor',
        description: 'Enter inserts a newline; Ctrl+S stages. Try mouse selection and terminal resizing.',
        columns: [columns[1]!],
        rows: [{ id: 'input', cells: ['First line\nSecond line\nUnicode: 田中 花子 🌱'] }],
        editor: { multiline: true, json: false },
    },
    {
        id: 'json',
        label: 'JSON editor',
        description: 'Try invalid JSON, then correct it. Whitespace and exact numeric text must survive staging.',
        columns: [{ ...columns[1]!, type: 'jsonb' }],
        rows: [{ id: 'input', cells: ['{\n  "large": 9007199254740993,\n  "enabled": true\n}'] }],
        editor: { multiline: true, json: true },
    },
    createStressScenario('stress', 'Large grid', 100_000, 256, 32),
    createStressScenario('long-values', 'Long cell values', 1_000, 32, 65_536),
];
