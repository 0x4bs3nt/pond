import { useKeyboard } from '@opentui/react';
import type { ProfileKeyboardOptions } from './types';

export const useProfileFormKeyboard = (options: ProfileKeyboardOptions) => {
    useKeyboard((key) => {
        if (!options.isActive() || key.defaultPrevented) return;
        if (key.name === 'tab') {
            key.preventDefault();
            options.setField((field) => (field + (key.shift ? 5 : 1)) % 6);
        } else if (key.name === 'escape') {
            key.preventDefault();
            options.onCancel();
        } else if (key.ctrl && key.name === 's') {
            key.preventDefault();
            options.onSave();
        } else if (options.field === 5 && ['space', 'left', 'right', 'return'].includes(key.name)) {
            key.preventDefault();
            options.onTLS(key.name === 'left');
        }
    });
};
