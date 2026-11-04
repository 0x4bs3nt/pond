import { useKeyboard } from '@opentui/react';
import type { ConnectionKeyboardOptions } from './types';

export const useConnectionKeyboard = (options: ConnectionKeyboardOptions) => {
    useKeyboard((key) => {
        if (options.prompting || key.defaultPrevented) return;
        if (key.name === 'tab') {
            key.preventDefault();
            options.setField((field) => (field + (key.shift ? 5 : 1)) % 6);
        } else if (key.name === 'escape' || (key.ctrl && key.name === 'd')) {
            key.preventDefault();
            options.onDisconnect();
        } else if (key.ctrl && key.name === 's') {
            key.preventDefault();
            options.onSave();
        } else if (key.ctrl && key.name === 'r') {
            key.preventDefault();
            options.onConnect();
        } else if (key.ctrl && key.name === 'n') {
            key.preventDefault();
            options.onNew();
        } else if (key.name === 'f3') {
            key.preventDefault();
            options.onNext(key.shift);
        } else if (key.name === 'f2') {
            key.preventDefault();
            options.onDemo();
        } else if (options.field === 5 && ['space', 'left', 'right', 'return'].includes(key.name)) {
            key.preventDefault();
            options.onTLS(key.name === 'left');
        }
    });
};
