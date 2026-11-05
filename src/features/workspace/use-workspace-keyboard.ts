import { useKeyboard, useRenderer } from '@opentui/react';

import { useWorkspace } from './WorkspaceProvider';

export const useWorkspaceKeyboard = (onConnections?: () => void) => {
    const renderer = useRenderer();
    const toggleFocus = useWorkspace((state) => state.toggleFocus);
    const isActive = useWorkspace((state) => state.isActive);
    const isEditing = useWorkspace((state) => state.isEditing);

    useKeyboard((key) => {
        if (!isActive() || isEditing() || key.defaultPrevented) return;
        if (key.name === 'f2' && onConnections) {
            key.preventDefault();
            onConnections();
            return;
        }
        if (key.name === 'q' && !key.ctrl && !key.meta) {
            renderer.destroy();

            return;
        }
        if (key.name === 'tab') {
            key.preventDefault();
            toggleFocus(key.shift);
        }
    });
};
