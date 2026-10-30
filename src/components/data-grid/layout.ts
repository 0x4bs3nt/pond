import type { CellPosition, GridColumn, GridViewport } from './types';

export const clamp = (value: number, max: number) => Math.max(0, Math.min(value, Math.max(0, max)));

export const layoutColumns = (columns: readonly GridColumn[]) => {
    let left = 0;

    return columns.map((column, index) => {
        const positioned = { ...column, index, left };
        left += column.width;

        return positioned;
    });
};

export const revealCell = (
    viewport: GridViewport,
    selection: CellPosition,
    columns: ReturnType<typeof layoutColumns>,
    rowCount: number,
    width: number,
    height: number
): GridViewport => {
    const column = columns[selection.column];
    let { top, left } = viewport;

    if (selection.row < top) top = selection.row;
    if (selection.row >= top + height) top = selection.row - height + 1;
    if (column) {
        if (column.left < left || column.width > width) left = column.left;
        else if (column.left + column.width > left + width) left = column.left + column.width - width;
    }

    const last = columns.at(-1);
    return {
        top: clamp(top, rowCount - height),
        left: clamp(left, (last ? last.left + last.width : 0) - width),
    };
};

export type PositionedColumn = ReturnType<typeof layoutColumns>[number];

export const visibleColumns = (columns: readonly PositionedColumn[], left: number, width: number) =>
    columns.filter((column) => column.left + column.width > left && column.left < left + width);
