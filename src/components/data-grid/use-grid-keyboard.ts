import { useKeyboard } from '@opentui/react';

import { moveSelection } from './navigation/move-selection';
import type { CellPosition, GridInteraction } from './types';

type GridKeyboardOptions = {
    getInteraction: () => GridInteraction;
    getSelection: () => CellPosition;
    rowCount: number;
    columnCount: number;
    pageSize: number;
    onSelect: (position: CellPosition) => void;
    onEdit?: (position: CellPosition) => void;
};

export const useGridKeyboard = ({
    getInteraction,
    getSelection,
    rowCount,
    columnCount,
    pageSize,
    onSelect,
    onEdit,
}: GridKeyboardOptions) => {
    useKeyboard((key) => {
        if (getInteraction() !== 'focused' || rowCount === 0 || key.meta || key.defaultPrevented) return;

        if (key.name === 'return' && !key.ctrl && onEdit) {
            key.preventDefault();
            onEdit(getSelection());

            return;
        }

        const next = moveSelection(getSelection(), key.name, key.ctrl, rowCount, columnCount, pageSize);

        if (next) {
            key.preventDefault();
            onSelect(next);
        }
    });
};
