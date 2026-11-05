import { useKeyboard } from '@opentui/react';
import type { TableBrowserKeyboardOptions } from './types';

export const useTableBrowserKeyboard = ({ focused, isActive, isEditing, onDiscard }: TableBrowserKeyboardOptions) => {
    useKeyboard((key) => {
        if (!isActive() || !focused || isEditing() || key.defaultPrevented) return;
        if (key.ctrl && key.name === 'd') {
            key.preventDefault();
            onDiscard();
        }
    });
};
