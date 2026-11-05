import { useKeyboard } from '@opentui/react';
import type { ConnectionKeyboardOptions } from './types';

export const useConnectionKeyboard = (options: ConnectionKeyboardOptions) => {
    useKeyboard((key) => {
        if (key.defaultPrevented) return;
        const mode = options.getMode();
        if (mode === 'delete') {
            if (key.name === 'escape') {
                key.preventDefault();
                options.onCancel();
            } else if (key.ctrl && key.name === 'y') {
                key.preventDefault();
                options.onConfirmDelete();
            }
            return;
        }
        if (mode !== 'list') return;
        const action =
            key.name === 'up'
                ? () => options.onMove(-1)
                : key.name === 'down'
                  ? () => options.onMove(1)
                  : key.name === 'return' || (key.ctrl && key.name === 'r')
                    ? options.onConnect
                    : key.ctrl && key.name === 'n'
                      ? options.onNew
                      : key.ctrl && key.name === 'e'
                        ? options.onEdit
                        : key.name === 'delete'
                          ? options.onDelete
                          : key.ctrl && key.name === 'd'
                            ? options.onDisconnect
                            : key.name === 'escape'
                              ? options.onCancel
                              : key.name === 'f5'
                                ? options.onReload
                                : key.name === 'f3'
                                  ? options.onWorkspace
                                  : key.name === 'f2'
                                    ? options.onDemo
                                    : null;
        if (action) {
            key.preventDefault();
            action();
        }
    });
};
