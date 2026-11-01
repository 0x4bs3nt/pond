import { useKeyboard } from '@opentui/react';
import type { ExplorerKeyboardOptions } from './types';

export const useExplorerKeyboard = ({ focused, moveCursor, openSelected }: ExplorerKeyboardOptions) => {
    useKeyboard((key) => {
        if (!focused || key.defaultPrevented) return;

        switch (key.name) {
            case 'up':
                key.preventDefault();
                moveCursor(-1);
                break;
            case 'down':
                key.preventDefault();
                moveCursor(1);
                break;
            case 'return':
                key.preventDefault();
                openSelected();
                break;
        }
    });
};
