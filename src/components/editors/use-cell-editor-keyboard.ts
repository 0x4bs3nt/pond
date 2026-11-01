import { useKeyboard } from '@opentui/react';
import type { CellEditorKeyboardOptions } from './types';

export const useCellEditorKeyboard = ({
    multiline,
    onCancel,
    onConfirm,
    onSetNull,
    onEdit,
}: CellEditorKeyboardOptions) => {
    useKeyboard((key) => {
        if (key.name === 'escape') {
            key.preventDefault();
            onCancel();
        } else if (key.ctrl && key.name === 's') {
            key.preventDefault();
            onConfirm();
        } else if (key.ctrl && key.name === 'n') {
            key.preventDefault();
            onSetNull();
        } else if (key.name === 'tab') {
            key.preventDefault();
        } else if (
            !key.ctrl &&
            !key.meta &&
            (key.name.length === 1 ||
                ['backspace', 'delete'].includes(key.name) ||
                (multiline && key.name === 'return'))
        ) {
            // Content notifications may be coalesced when typing and deleting in one batch.
            onEdit();
        }
    });
};
