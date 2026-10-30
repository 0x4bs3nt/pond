import { clamp } from '../layout';
import type { CellPosition } from '../types';

export const moveSelection = (
    selection: CellPosition,
    key: string,
    ctrl: boolean,
    rowCount: number,
    columnCount: number,
    pageSize: number
): CellPosition | undefined => {
    let { row, column } = selection;

    switch (key) {
        case 'up':
            row--;
            break;
        case 'down':
            row++;
            break;
        case 'left':
            column--;
            break;
        case 'right':
            column++;
            break;
        case 'pageup':
            row -= pageSize;
            break;
        case 'pagedown':
            row += pageSize;
            break;
        case 'home':
            if (ctrl) row = 0;
            else column = 0;
            break;
        case 'end':
            if (ctrl) row = rowCount - 1;
            else column = columnCount - 1;
            break;
        default:
            return undefined;
    }

    return { row: clamp(row, rowCount - 1), column: clamp(column, columnCount - 1) };
};
