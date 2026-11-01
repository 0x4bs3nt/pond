import { useKeyboard, useRenderer } from '@opentui/react';

import { useWorkspace } from './WorkspaceProvider';

export const useWorkspaceKeyboard = () => {
    const renderer = useRenderer();
    const toggleFocus = useWorkspace((state) => state.toggleFocus);
    const isEditing = useWorkspace((state) => state.isEditing);

    useKeyboard((key) => {
        if (isEditing()) return;
        if (key.name === 'q' && !key.ctrl && !key.meta) {
            renderer.destroy();

            return;
        }
        if (key.name === 'tab') {
            key.preventDefault();
            toggleFocus();
        }
    });
};
