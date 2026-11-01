import { useKeyboard } from '@opentui/react';
import type { GridKeyboardOptions } from './types';

import { moveSelection } from './navigation/move-selection';

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
