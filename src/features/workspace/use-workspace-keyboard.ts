import { useKeyboard, useRenderer } from '@opentui/react';

import { useWorkspace } from './WorkspaceProvider';

export const useWorkspaceKeyboard = () => {
    const renderer = useRenderer();
    const toggleFocus = useWorkspace((state) => state.toggleFocus);

    useKeyboard((key) => {
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
