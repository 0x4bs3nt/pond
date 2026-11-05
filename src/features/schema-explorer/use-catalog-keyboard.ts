import { useKeyboard } from '@opentui/react';
import type { CatalogKeyboardOptions } from './types';

export const useCatalogKeyboard = ({ onRefresh, onDisconnect, onToggleFocus }: CatalogKeyboardOptions) => {
    useKeyboard((key) => {
        if (key.defaultPrevented) return;
        if (key.name === 'f5') {
            key.preventDefault();
            onRefresh();
        } else if (key.name === 'escape' || (key.ctrl && key.name === 'd')) {
            key.preventDefault();
            onDisconnect();
        } else if (key.name === 'tab') {
            key.preventDefault();
            onToggleFocus();
        }
    });
};
