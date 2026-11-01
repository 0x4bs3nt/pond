import type { GalleryScenario } from './types';
import type { GridColumn, GridRow } from '../../src/components/data-grid';

export const createStressData = (rowCount = 100_000, columnCount = 256, valueLength = 32) => {
    const columns: GridColumn[] = Array.from({ length: columnCount }, (_, index) => ({
        id: `c${index}`,
        name: `column_${index + 1}`,
        type: 'text',
        width: 24,
    }));

    const longValue = '田中 🌱 e\u0301\tlong value\n'.repeat(Math.ceil(valueLength / 20)).slice(0, valueLength);
    const patterns = Array.from({ length: 32 }, (_, pattern) =>
        columns.map((_, column) => (column === 0 ? longValue : `Pattern ${pattern + 1} / Column ${column + 1}`))
    );
    const rows: GridRow[] = Array.from({ length: rowCount }, (_, index) => ({
        id: `stress-${index}`,
        cells: patterns[index % patterns.length]!,
    }));

    return { columns, rows };
};

export const createStressScenario = (
    id: string,
    label: string,
    rowCount: number,
    columnCount: number,
    valueLength: number
): GalleryScenario => {
    let data: ReturnType<typeof createStressData> | undefined;
    const load = () => (data ??= createStressData(rowCount, columnCount, valueLength));

    return {
        id,
        label,
        description: `${rowCount.toLocaleString('en-US')} rows × ${columnCount} columns; ${valueLength} UTF-16-unit values. Navigate, resize, and inspect edits.`,
        get columns() {
            return load().columns;
        },
        get rows() {
            return load().rows;
        },
    };
};
