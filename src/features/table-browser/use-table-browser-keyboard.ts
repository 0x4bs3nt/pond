import { useKeyboard } from '@opentui/react';
import type { TableBrowserKeyboardOptions } from './types';

export const useTableBrowserKeyboard = ({ focused, isEditing, onDiscard }: TableBrowserKeyboardOptions) => {
    useKeyboard((key) => {
        if (!focused || isEditing() || key.defaultPrevented) return;
        if (key.ctrl && key.name === 'd') {
            key.preventDefault();
            onDiscard();
        }
    });
};
